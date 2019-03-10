import { LnRpc } from "@radar/lnrpc"
import { NextFunction, Request, Response, Router } from "express"

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
        const islandRouter = Router()

        islandRouter.get("/", async (req, res) => {
            const pattern = await this.store.getPattern()
            if (!pattern) {
                res.sendStatus(404)
            } else {
                res.json({
                    pattern,
                })
            }
        })

        const hexalotRouter = Router()

        hexalotRouter.post("/touch", async (req, res) => {
            const island = new Island(this.islandName, this.store)
            await island.loadPatternFromStore()
            const id = req.params.hexalot_id
            const existing = island.findHexalot(id)
            if (existing) {
                res.status(400).json({error: "Lot already exists"})
                return
            }
            // TODO: load center-spot coords (& other data), check that new lot is valid
            // TODO: create hexalot on island
            await island.save()
            res.json(true)
        })

        hexalotRouter.post("/buy", authenticateUser, async (req, res) => {
            res.sendStatus(501)
        })

        hexalotRouter.get("/", async (req, res) => {
            // TODO: return genome, owner, parent, nonce
            res.sendStatus(501)
        })

        // TODO: maybe address hexalot by center-spot coords instead?
        islandRouter.use("/hexalot/:hexalot_id", hexalotRouter)

        return islandRouter
    }
}
