/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { NextFunction, Request, Response, Router } from "express"
import { body, param, ValidationChain, validationResult } from "express-validator/check"
import HttpStatus from "http-status-codes"

import { Island } from "./island"
import { IslandIcosahedron } from "./island-icosahedron"
import { extractIslandData } from "./island-logic"
import { DataStore, IKeyValueStore } from "./store"

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


function checkUserIdCookie(store: DataStore): (req: Request, res: Response, next: NextFunction) => void {
    return async (req, res, next) => {
        if (!req.cookies) {
            res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)
            return
        }
        const userId = req.cookies.userId || "NOT_A_USER"
        const ownedLots = await store.getOwnedLots(userId)
        if (ownedLots === undefined) {
            res.status(HttpStatus.UNAUTHORIZED).end("Need an access code. Ask Gerald")
            return
        }
        res.locals.userId = userId
        res.locals.ownedLots = ownedLots
        next()
    }
}

export function createRouter(db: IKeyValueStore): Router {
    const store = new DataStore(db)

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
        .get("/owned-lots", checkUserIdCookie(store), (req, res) => {
            res.json(res.locals.ownedLots)
        })
        .post("/_add-user", async (req, res) => {
            if (req.hostname !== "localhost") {
                res.sendStatus(HttpStatus.NOT_FOUND)
                return
            }
            await store.addUser(req.body.userId)
            res.sendStatus(HttpStatus.OK)
        })
        .use(
            "/island/:islandName",
            [
                param("islandName").isString(),
                validateRequest,
            ],
            async (req: Request, res: Response, next: NextFunction) => {
                const {islandName} = req.params
                if (!IslandIcosahedron[islandName]) {
                    res.status(404).end("Island doesn't exist")
                    return
                }
                res.locals.island = new Island(islandName, store, islandName)
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
                res.locals.hexalotId = hexalotId
                next()
            },
            hexalotRoute,
        )

    islandRoute
        .get("/", async (req, res) => {
            let pattern = await store.getIslandData(res.locals.island.islandName)
            const islandName = res.locals.island.islandName
            if (!pattern) {
                pattern = {
                    name: islandName,
                    hexalots: "",
                    spots: "",
                }
            }
            res.json({
                name: islandName,
                ...pattern,
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
            checkUserIdCookie(store),
            async (req: Request, res: Response) => {
                if (res.locals.ownedLots.length === 1) {
                    res.status(HttpStatus.FORBIDDEN).end("You have already claimed a lot.")
                    return
                }
                const {
                    x,
                    y,
                    genomeData,
                    id,
                } = req.body
                const userId = res.locals.userId
                const island: Island = res.locals.island
                await island.load()

                // TODO: probably gonna wanna mutex this
                try {
                    await island.claimHexalot(userId, {x, y}, id, genomeData)
                } catch (err) {
                    res.status(HttpStatus.BAD_REQUEST).json({errors: [err.toString()]})
                    return
                }
                res.json(extractIslandData(island))
            },
        )

    hexalotRoute
        .route("/genome-data")
        .get(async (req, res) => {
            const genomeData = await store.getGenomeData(res.locals.hexalotId)
            res.json(genomeData)
        })
        .post(
            [
                body("genomeData").exists(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                const genomeData = req.body.genomeData
                if (!genomeData.genes || !(genomeData.genes instanceof Array)) {
                    res.status(400).send("missing required genes array")
                    return
                }
                await store.setGenomeData(res.locals.hexalotId, genomeData)
                res.sendStatus(HttpStatus.OK)
            },
        )

    hexalotRoute
        .route("/rotation")
        .get(async (req, res) => {
            const rotation = await store.getRotation(res.locals.hexalotId)
            res.json(rotation)
        })
        .post(
            [
                body("rotation").isNumeric().toFloat(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                await store.setRotation(res.locals.hexalotId, req.body.rotation)
                res.sendStatus(HttpStatus.OK)
            },
        )

    hexalotRoute
        .route("/journey")
        .get(async (req, res) => {
            const journey = await store.getJourney(res.locals.hexalotId)
            res.json(journey)
        })
        .post(
            [
                body("journeyData").exists(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
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
                await store.setJourney(res.locals.hexalotId, journeyData)
                res.sendStatus(HttpStatus.OK)
            },
        )

    hexalotRoute.get("/owner", async (req, res) => {
        const lotId = res.locals.hexalotId
        const owner = await store.getLotOwner(lotId)
        if (owner === undefined) {
            res.sendStatus(HttpStatus.NOT_FOUND)
            return
        }
        res.json(owner)
    })

    return root
}

