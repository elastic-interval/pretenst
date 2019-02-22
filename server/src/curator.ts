import { NextFunction, Request, Response, Router } from "express"

import { HEXALOT_ALLOWED_RADII, HEXALOT_PURCHASE_PRICE_SATOSHIS } from "./constants"
import { Hexalot } from "./hexalot"
import { PaymentHandler } from "./payment"
import { HexalotStore, IKeyValueStore } from "./store"
import { HexalotID } from "./types"

type AuthenticatedRequest = Request & {
    user: {
        pubkey: string,
    },
}

function authenticateUser(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
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
        readonly payments: PaymentHandler,
        prefix: string = "galapagotchi",
    ) {
        this.store = new HexalotStore(db, prefix)
    }

    public createExpressRouter(): Router {
        const router = Router()

        router.use(authenticateUser)

        router.post("/buy", async (req, res) => {
            const {user: {pubkey}} = req as AuthenticatedRequest
            const {parentID, direction, newBits: newBitsStr} = req.body
            if (!(direction instanceof Number)) {
                return res.status(400).end("'direction' must be 0-5")
            }
            if (!(newBitsStr instanceof String)) {
                return res.status(400).end("'newBits' must be a string")
            }
            const newBits = (newBitsStr as string)
                .split("")
                .map(c => c === "1")
            let lotID: HexalotID
            try {
                lotID = this.computeChildLotID(parentID, direction as number, newBits)
            } catch (e) {
                return res.status(400).end(`Lot cannot be purchased: ${e}`)
            }
            const invoice = await this.payments.generateInvoice(lotID, HEXALOT_PURCHASE_PRICE_SATOSHIS)
            res
                .status(402) // HTTP 402 Payment Required :)
                .end(invoice)

            this.payments.waitForPayment(invoice)
                .then(() => this.store.assignLot(lotID, pubkey))
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
    private computeChildLotID(
        parentID: string,
        direction: number,
        newBits: boolean[],
    ): HexalotID {
        const parent = new Hexalot(parentID)
        if (!HEXALOT_ALLOWED_RADII[parent.radius]) {
            throw new Error(`Lot radius ${parent.radius} not in allowed radii: ${Object.keys(HEXALOT_ALLOWED_RADII)}`)
        }

        return "FAKE_LOT"
    }
}
