import { NextFunction, Request, Response, Router } from "express"

import { HEXALOT_PURCHASE_PRICE_SATS } from "./constants"
import { PaymentHandler } from "./payment"
import { HexalotStore, IKeyValueStore } from "./store"
import { Hexalot } from "./types"

type AuthenticatedRequest = Request & {
    user: {
        pubkey: string,
    },
}

function authenticateUser(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const pubkey = req.header("X-User-Pubkey")
    if (!pubkey) {
        return res.status(400).end("Missing X-User-Pubkey header")
    }
    const signature = req.header("X-User-Signature")
    if (!signature) {
        return res.status(400).end("Missing X-User-Signature header")
    }
    // TODO: check signature against pubkey
    const reqp = (req as AuthenticatedRequest)
    reqp.user = {...(reqp.user || {}), pubkey}
    console.log(`Request from ${pubkey}`)
    next()
}

export class HexalotCurator {
    private store: HexalotStore

    constructor(
        db: IKeyValueStore,
        readonly paymentHandler: PaymentHandler,
        prefix: string = "galapagotchi",
    ) {
        this.store = new HexalotStore(db, prefix)
    }

    public createExpressRouter(): Router {
        const router = Router()

        router.use(authenticateUser)

        router.post("/buy", async (req, res) => {
            const {user: {pubkey}} = req as AuthenticatedRequest
            const {parentLot, direction, newBits: newBitsStr} = req.body
            const newBits = (newBitsStr as string)
                .split("")
                .map(c => c === "1")
            let lot: Hexalot
            try {
                lot = this.computeLot(parentLot, parseInt(direction, 10), newBits)
            } catch (e) {
                return res.status(400).end(`Lot cannot be purchased: ${e}`)
            }
            const invoice = await this.paymentHandler.generateInvoice(lot, HEXALOT_PURCHASE_PRICE_SATS)
            res
                .status(402) // HTTP 402 Payment Required :)
                .end(invoice)

            this.paymentHandler.waitForPayment(invoice)
                .then(() => this.store.assignLot(lot, pubkey))
                .catch(e => console.error(`Error waiting for payment: ${e}`))
        })

        router.get("/owned", async (req, res) => {
            const {user: {pubkey}} = req as AuthenticatedRequest
            const ownedLots = await this.store.getOwnedLots(pubkey)
            res.end(JSON.stringify(ownedLots))
        })

        return router
    }

    // @ts-ignore
    private computeLot(
        parentLot: string,
        direction: number,
        newBits: boolean[],
    ): Hexalot {
        // TODO: check whether child hexalot has been taken
        return "FAKE_LOT"
    }
}
