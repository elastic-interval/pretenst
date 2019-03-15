import { LnRpc } from "@radar/lnrpc"
import { NextFunction, Request, Response, Router } from "express"
import { body, param, validationResult } from "express-validator/check"
import HttpStatus from "http-status-codes"

import { ENABLED_ISLANDS } from "./constants"
import { Island } from "./island"
import { IKeyValueStore } from "./store"
import { HexalotID } from "./types"

function validateRequest(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(HttpStatus.BAD_REQUEST)
            .json({errors: errors.array()})
        return
    }
    next()
}

export function createRouter(lnRpc: LnRpc, db: IKeyValueStore): Router {
    const rootRouter = Router()

    const islandRouter = Router()

    rootRouter.use("/:islandName",
        [
            param("islandName").isIn(ENABLED_ISLANDS),
            validateRequest,
        ],
        async (req: Request, res: Response, next: NextFunction) => {
            const {islandName} = req.params
            const island = new Island(db, islandName)
            await island.load()
            res.locals.island = island
            next()
        },
        islandRouter,
    )

    islandRouter.get("/", async (req, res) => {
        const pattern = res.locals.island.pattern
        res.json({
            pattern,
        })
    })

    const hexalotRouter = Router()

    islandRouter.use("/hexalot/:hexalotId",
        [
            param("hexalotId").isHexadecimal().isLength({min: 32, max: 32}),
            validateRequest,
        ],
        (req: Request, res: Response, next: NextFunction) => {
            res.locals.hexalotId = req.params.hexalotId
            next()
        },
        hexalotRouter,
    )

    hexalotRouter.post(
        "/claim",
        [
            body("x").isInt().toInt(),
            body("y").isInt().toInt(),
            body("genome").whitelist("012345"),
            validateRequest,
        ],
        async (req: Request, res: Response) => {
            const {
                x,
                y,
                genome,
            } = req.body
            const lotID: HexalotID = res.locals.hexalotId
            const island: Island = res.locals.island

            // TODO: probably gonna wanna mutex this
            try {
                await island.claimHexalot(
                    {x, y},
                    lotID,
                    genome,
                )
            } catch (err) {
                res.status(400).json({errors: [err.toString()]})
                return
            }
            res.sendStatus(HttpStatus.OK)
        },
    )

    hexalotRouter.get(
        "/",
        async (req: Request, res: Response) => {
            const island: Island = res.locals.island
            const lot = island.findHexalot(req.params.hexalotId)
            if (!lot) {
                res.sendStatus(HttpStatus.NOT_FOUND)
                return
            }
            res.json(lot)
        },
    )

    return rootRouter
}
