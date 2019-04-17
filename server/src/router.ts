/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { NextFunction, Request, Response, Router } from "express"
import { body, param, ValidationChain, validationResult } from "express-validator/check"
import HttpStatus from "http-status-codes"
import Passport from "passport"
import { Strategy as TwitterStrategy } from "passport-twitter"
import { getCustomRepository, getManager } from "typeorm"

import { ORIGIN } from "./constants"
import { Coords } from "./models/coords"
import { Island } from "./models/island"
import { Repository } from "./repository"

function validateRequest(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(HttpStatus.BAD_REQUEST)
            .json({errors: errors.array()})
        return
    }
    next()
}

const hexalotIDValidation = (idParam: ValidationChain) =>
    idParam
        .isHexadecimal()
        .isLength({max: 32, min: 32})
        .custom(id => (parseInt(id[id.length - 1], 16) & 0x1) === 0)

export function createRouter(): Router {
    const root = Router()
    const islandRoute = Router()
    const hexalotRoute = Router()
    const consumerKey = process.env.TWITTER_CONSUMER_API_KEY!
    const consumerSecret = process.env.TWITTER_CONSUMER_API_SECRET!
    if (!consumerKey || !consumerSecret) {
        console.error("Missing envvars: TWITTER_CONSUMER_API_KEY or TWITTER_CONSUMER_API_SECRET")
        process.exit(1)
    }
    Passport.use(new TwitterStrategy({
            consumerKey,
            consumerSecret,
            callbackURL: `${ORIGIN}/api/auth/twitter/callback`,
        },
        async (token, tokenSecret, profile, done) => {
            try {
                const user = await repository.findOrCreateUserByTwitterProfile(profile)
                done(undefined, user)
            } catch (err) {
                done(err)
            }
        },
    ))

    const repository = getCustomRepository(Repository)

    async function loadUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!req.cookies) {
            res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)
            return
        }
        const userId = req.cookies.userId
        if (userId === undefined) {
            res.status(HttpStatus.BAD_REQUEST).send("missing userId cookie")
            return
        }
        try {
            res.locals.user = await repository.findUser(userId)
            next()
        } catch (e) {
            res.status(HttpStatus.UNAUTHORIZED).send(e)
        }
    }

    root
        .get("/", (req, res) => {
            res.sendStatus(HttpStatus.OK)
        })
        .get("/islands", async (req, res) => {
            res.json(
                (await repository.getAllIslands())
                    .map(island => island.compressedJSON),
            )
        })
        .get("/auth/twitter", Passport.authenticate("twitter"))
        .get("/auth/twitter/callback", Passport.authenticate("twitter", {
            successRedirect: "/",
            failureRedirect: "/login",
        }))
        .get("/me", loadUser, (req, res) => {
            res.json(res.locals.user)
        })
        .use(
            "/island/:islandName",
            [
                param("islandName").isString(),
                validateRequest,
            ],
            async (req: Request, res: Response, next: NextFunction) => {
                const {islandName} = req.params
                try {
                    res.locals.island = await repository.findIsland(islandName)
                    next()
                } catch (e) {
                    res.sendStatus(HttpStatus.NOT_FOUND)
                }
            },
            islandRoute,
        )
        .use(
            "/hexalot/:hexalotId",
            [
                hexalotIDValidation(param("hexalotId")),
                validateRequest,
            ],
            async (req: Request, res: Response, next: NextFunction) => {
                const {hexalotId} = req.params
                try {
                    res.locals.centerOfHexalot = await repository.findHexalot(hexalotId)
                    next()
                } catch (e) {
                    res.sendStatus(HttpStatus.NOT_FOUND)
                }
            },
            hexalotRoute,
        )

    islandRoute
        .get("/", async (req, res) => {
            const island = res.locals.island
            await repository.recalculateIsland(island)
            res.json(island.compressedJSON)
        })
        .post(
            "/claim-lot",
            [
                hexalotIDValidation(body("id")),
                body("x").isInt().toInt(),
                body("y").isInt().toInt(),
                body("genomeData").isJSON(),
                validateRequest,
            ],
            loadUser,
            async (req: Request, res: Response) => {
                const user = res.locals.user
                const island: Island = res.locals.island
                const {
                    x,
                    y,
                    genomeData,
                    id,
                } = req.body

                if (user.ownedLots.length === 1) {
                    res.status(HttpStatus.FORBIDDEN).end("You have already claimed a lot.")
                    return
                }

                try {
                    const lot = await getManager().transaction(async manager =>
                        manager.getCustomRepository(Repository)
                            .claimHexalot({
                                owner: user,
                                center: new Coords(x, y),
                                id,
                                island,
                                genomeData,
                            }),
                    )
                    console.log("New lot claimed!", JSON.stringify(lot))
                } catch (err) {
                    res.status(HttpStatus.BAD_REQUEST).json({errors: [err.toString()]})
                    return
                }
                res.json(island.compressedJSON)
            },
        )

    hexalotRoute
        .route("/genome-data")
        .get(async (req, res) => {
            res.json(res.locals.centerOfHexalot.genomeData)
        })
        .post(
            [
                body("genomeData").exists(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                const hexalot = res.locals.centerOfHexalot
                const genomeData = req.body.genomeData
                if (!genomeData.genes || !(genomeData.genes instanceof Array)) {
                    res.status(400).send("missing required genes array")
                    return
                }
                hexalot.genomeData = genomeData
                await repository.saveHexalot(hexalot)
                res.sendStatus(HttpStatus.OK)
            },
        )

    hexalotRoute
        .route("/journey")
        .get(async (req, res) => {
            res.json(res.locals.centerOfHexalot.journey)
        })
        .post(
            [
                body("journeyData").exists(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                const hexalot = res.locals.centerOfHexalot
                const journeyData = req.body.journeyData
                if (!journeyData.hexalots) {
                    res.status(HttpStatus.BAD_REQUEST).end("missing required hexalot array field")
                    return
                }
                for (const lotId of journeyData.hexalots) {
                    if (!/[0-9a-fA-F]{32}/.test(lotId)) {
                        res.status(HttpStatus.BAD_REQUEST).end(`invalid hexalot format: ${lotId}`)
                        return
                    }
                }
                hexalot.journey = journeyData
                await repository.saveHexalot(hexalot)
                res.sendStatus(HttpStatus.OK)
            },
        )

    hexalotRoute.get("/owner", async (req, res) => {
        const hexalot = res.locals.centerOfHexalot
        res.json(hexalot.owner)
    })

    return root
}

