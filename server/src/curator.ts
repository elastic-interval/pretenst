import { LnRpc } from "@radar/lnrpc"
import { NextFunction, Request, Response, Router } from "express"
import { body, param, validationResult } from "express-validator/check"
import HttpStatus from "http-status-codes"

import { Island } from "./island"
import { PaymentHandler } from "./payment"
import { IKeyValueStore, IslandStore } from "./store"

function validateRequest(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .json({errors: errors.array()})
        return
    }
    next()
}

export class IslandCurator {
    private readonly store: IslandStore
    private readonly island: Island
    // @ts-ignore
    private payments: PaymentHandler

    constructor(
        readonly islandName: string,
        db: IKeyValueStore,
        lnRpc: LnRpc,
    ) {
        this.payments = new PaymentHandler(lnRpc, islandName)
        this.store = new IslandStore(db, islandName)
        this.island = new Island(this.islandName, this.store)
    }

    public createRouter(): Router {
        const islandRouter = Router()

        islandRouter.get("/", async (req, res) => {
            const pattern = await this.store.getPattern()
            if (!pattern) {
                res.sendStatus(HttpStatus.NOT_FOUND)
            } else {
                res.json({
                    pattern,
                })
            }
        })

        const hexalotRouter = Router()

        islandRouter.use("/hexalot", hexalotRouter)

        hexalotRouter.use("/:hexalot_id", [
            param("hexalot_id").isHexadecimal().isLength({min: 32, max: 32}),
            validateRequest,
        ])
        hexalotRouter.post(
            "/:hexalot_id/claim",
            [
                body("x").isInt(),
                body("y").isInt(),
                body("genome").isString(),
                validateRequest,
            ],
            async (req: Request, res: Response) => {
                const {
                    x,
                    y,
                    genome,
                } = req.body
                const lotID = req.params.hexalot_id

                // TODO: probably gonna wanna mutex this
                await this.island.load()
                try {
                    await this.island.claimHexalot(
                        {x, y},
                        lotID,
                        genome,
                    )
                } catch (err) {
                    res.status(400).json({errors: [err]})
                    return
                }
                await this.island.save()
                res.sendStatus(HttpStatus.OK)
            })

        hexalotRouter.get(
            "/:hexalot_id",
            async (req: Request, res: Response) => {
                await this.island.load()
                const lot = this.island.findHexalot(req.params.hexalot_id)
                if (!lot) {
                    res.sendStatus(HttpStatus.NOT_FOUND)
                    return
                }
                res.json(lot)
            })

        return islandRouter
    }
}
