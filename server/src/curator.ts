import { LnRpc } from "@radar/lnrpc"
import { NextFunction, Request, Response, Router } from "express"

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

export class IslandCurator {
    private store: IslandStore
    // @ts-ignore
    private payments: PaymentHandler

    constructor(
        readonly islandName: string,
        db: IKeyValueStore,
        lnRpc: LnRpc,
    ) {
        this.payments = new PaymentHandler(lnRpc, islandName)
        this.store = new IslandStore(db, islandName)
    }

    public createRouter(): Router {
        const router = Router()

        router.get("/pattern", async (req, res) => {
            const pattern = await this.store.getPattern()
            if (!pattern) {
                res.sendStatus(404)
            } else {
                res.json(pattern)
            }
        })

        router.post("/hexalot/:id/buy", authenticateUser, async (req, res) => {
            res.sendStatus(501)
        })

        return router
    }
}
