/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { NextFunction, Request, Response, Router } from "express"
import { body, param, ValidationChain, validationResult } from "express-validator/check"
import HttpStatus from "http-status-codes"

import { IslandIcosahedron } from "./island-icosahedron"
import { Hexalot } from "./models/hexalot"
import { Island } from "./models/island"
import { User } from "./models/user"

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
        const user = await User.findOne(userId, {relations: ["ownedLots"]})
        if (user === undefined) {
            res.sendStatus(HttpStatus.UNAUTHORIZED)
            return
        }
        res.locals.user = user
        next()
    } catch (e) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(e)
    }
}

export function createRouter(): Router {
    const root = Router()
    const islandRoute = Router()
    const hexalotRoute = Router()

    root
        .get("/", (req, res) => {
            res.end("OK")
        })
        .get("/islands", (req, res) => {
            res.json(IslandIcosahedron)
        })
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
                const island = await Island.findOne(islandName, {relations: ["hexalots", "spots"]})
                if (!island) {
                    res.status(404).end("Island doesn't exist")
                    return
                }
                res.locals.island = island
                next()
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
                const hexalot = Hexalot.findOne(hexalotId)
                if (!hexalot) {
                    res.sendStatus(HttpStatus.NOT_FOUND)
                    return
                }
                res.locals.hexalot = hexalot
                next()
            },
            hexalotRoute,
        )

    islandRoute
        .get("/", async (req, res) => {
            const island: Island = res.locals.island
            const data = island.compressedData
            res.json({
                name: island.name,
                ...data,
            })
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
                if (user.ownedLots.length === 1) {
                    res.status(HttpStatus.FORBIDDEN).end("You have already claimed a lot.")
                    return
                }
                const {
                    x,
                    y,
                    genomeData,
                    id,
                } = req.body
                const island: Island = res.locals.island
                await island.reload()

                // TODO: probably gonna wanna mutex this
                try {
                    await island.claimHexalot(user, {x, y}, id, genomeData)
                } catch (err) {
                    res.status(HttpStatus.BAD_REQUEST).json({errors: [err.toString()]})
                    return
                }
                res.json(island.compressedData)
            },
        )

    hexalotRoute
        .route("/genome-data")
        .get(async (req, res) => {
            res.json(res.locals.hexalot.genomeData)
        })
        .post(
            [
                body("genomeData").exists(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                const hexalot = res.locals.hexalot
                const genomeData = req.body.genomeData
                if (!genomeData.genes || !(genomeData.genes instanceof Array)) {
                    res.status(400).send("missing required genes array")
                    return
                }
                hexalot.genomeData = genomeData
                await hexalot.save()
                res.sendStatus(HttpStatus.OK)
            },
        )

    hexalotRoute
        .route("/journey")
        .get(async (req, res) => {
            res.json(res.locals.hexalot.journey)
        })
        .post(
            [
                body("journeyData").exists(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                const hexalot = res.locals.hexalot
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
                await hexalot.save()
                res.sendStatus(HttpStatus.OK)
            },
        )

    hexalotRoute.get("/owner", async (req, res) => {
        const hexalot = res.locals.hexalot
        res.json(hexalot.owner)
    })

    return root
}

