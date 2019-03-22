/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { NextFunction, Request, Response, Router } from "express"
import { body, param, ValidationChain, validationResult } from "express-validator/check"
import HttpStatus from "http-status-codes"

import { Island } from "./island"
import { IslandIcosahedron } from "./island-icosahedron"
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

export function createRouter(db: IKeyValueStore): Router {
    const store = new DataStore(db)

    const root = Router()
    const islandRoute = Router()
    const hexalotRoute = Router()

    root
        .get("/", (req, res) => {
            res.end("OK")
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
                res.locals.island = new Island(store, islandName)
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
            if (!pattern) {
                pattern = {
                    name: "name",
                    hexalots: "",
                    spots: "",
                }
            }
            res.json({
                name: res.locals.island.islandName,
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
            async (req: Request, res: Response) => {
                const {
                    x,
                    y,
                    genomeData,
                    id,
                } = req.body
                const island: Island = res.locals.island
                await island.load()

                // TODO: probably gonna wanna mutex this
                try {
                    await island.claimHexalot(
                        {x, y},
                        id,
                        genomeData,
                    )
                } catch (err) {
                    res.status(HttpStatus.BAD_REQUEST).json({errors: [err.toString()]})
                    return
                }
                res.json(island.data)
            },
        )

    hexalotRoute
        .route("/genome-data")
        .get(async (req, res) => {
            const genomeData = await store.getGenomeData(res.locals.hexalotId)
            if (!genomeData) {
                res.sendStatus(HttpStatus.NOT_FOUND)
                return
            }
            res.json(genomeData)
        })
        .post(
            [
                body("genomeData").isJSON(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                await store.setGenomeData(res.locals.hexalotId, req.body.genomeData)
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
            if (journey === undefined) {
                res.sendStatus(404)
                return
            }
            res.json(journey)
        })
        .post(
            [
                body("journeyData").isJSON(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                await store.setJourney(res.locals.hexalotId, req.body.journey)
                res.sendStatus(HttpStatus.OK)
            },
        )

    return root
}

