import { NextFunction, Request, Response, Router } from "express"

import { HEXALOT_ALLOWED_RADII, HEXALOT_PURCHASE_PRICE_SATOSHIS } from "./constants"
import { Direction, Hexalot } from "./hexalot"
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
    const authReq = (req as AuthenticatedRequest)
    authReq.user = {...(authReq.user || {}), pubkey}
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
            const {parentID, direction, childID} = req.body
            try {
                this.checkChildLotValid(parentID, direction, childID)
            } catch (e) {
                return res.status(400).end(`Lot cannot be purchased: ${e}`)
            }
            const invoice = await this.payments.generateInvoice(childID, HEXALOT_PURCHASE_PRICE_SATOSHIS)
            res
                .status(402) // HTTP 402 Payment Required :)
                .end(invoice)

            await this.payments.waitForPayment(invoice)
            await this.store.spawnLot(parentID, direction, childID)
            await this.store.assignLot(childID, pubkey)
        })

        router.get("/owned", async (req, res) => {
            const {user: {pubkey}} = req as AuthenticatedRequest
            const ownedLots = await this.store.getOwnedLots(pubkey)
            res.end(JSON.stringify(ownedLots))
        })

        return router
    }

    // @ts-ignore
    private async checkChildLotValid(
        parentID: HexalotID,
        direction: Direction,
        childID: HexalotID,
    ): Promise<void> {
        const parent = Hexalot.fromID(parentID)
        if (!HEXALOT_ALLOWED_RADII[parent.radius]) {
            throw new Error(`Lot radius ${parent.radius} not in allowed radii: ${Object.keys(HEXALOT_ALLOWED_RADII)}`)
        }
        if (await this.store.getChildLot(parentID, direction)) {
            throw new Error("Child lot already exists")
        }
        const child = Hexalot.fromID(childID)
        if (!parent.isChild(child, direction)) {
            throw new Error("Not a child of parent lot")
        }
        // TODO: check whether child intersects correctly with parent's other children
    }
}
