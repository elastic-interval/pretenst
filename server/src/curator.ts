import { LnRpc } from "@radar/lnrpc"
import { NextFunction, Request, Response, Router } from "express"
import { body, param, validationResult } from "express-validator/check"
import HttpStatus from "http-status-codes"

import { Island } from "./island"
import { PaymentHandler } from "./payment"
import { IKeyValueStore, IslandStore } from "./store"

function authenticateUser(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (!req.body.pubkey) {
        return res.status(400).end("Missing pubkey")
    }
    // Until we implement Hexalot transfers, skip authentication
    // TODO: read & verify signature
    next()
}

function validateRequest(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.sendStatus(HttpStatus.UNPROCESSABLE_ENTITY)
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

        hexalotRouter.post(
            "/:hexalot_id/claim",
            [
                param("hexalot_id").isHexadecimal().isLength({min: 32, max: 32}),
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

                await this.island.loadPatternFromStore()
                this.island.claimHexalot(
                    {x, y},
                    req.params.hexalot_id,
                    genome,
                )
            })

        hexalotRouter.post("/buy", authenticateUser, async (req, res) => {
            res.sendStatus(HttpStatus.NOT_IMPLEMENTED)
        })

        hexalotRouter.get("/", async (req, res) => {
            // TODO: return genome, owner, parent, nonce
            res.sendStatus(HttpStatus.NOT_IMPLEMENTED)
        })

        return islandRouter
    }
}
