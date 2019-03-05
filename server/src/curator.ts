import { NextFunction, Request, Response, Router } from "express"

import { HEXALOT_ALLOWED_RADII, HEXALOT_PURCHASE_PRICE_SATOSHIS } from "./constants"
import { Direction, Hexalot, overlap } from "./hexalot"
import { PaymentHandler } from "./payment"
import { HexalotStore, IKeyValueStore } from "./store"
import { HexalotID } from "./types"

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


        router.post("/buy", authenticateUser, async (req, res) => {
            const {parentID, direction, childID, pubkey} = req.body
            try {
                // await this.checkChildLotValid(parentID, direction, childID)
            } catch (e) {
                return res.status(400).end(`Lot cannot be purchased: ${e}`)
            }
            const {invoice, paid} = await this.payments.generatePayment(childID, HEXALOT_PURCHASE_PRICE_SATOSHIS)
            res
                .status(402) // HTTP 402 Payment Required :)
                .json({invoice})
                .end()

            await paid
            await this.store.spawnLot(parentID, direction, childID)
            await this.store.assignLot(childID, pubkey)
        })

        router.get("/owned/:pubkey", async (req, res) => {
            const {pubkey} = req.params
            const ownedLots = await this.store.getOwnedLots(pubkey)
            res.json({
                ownedLots,
            })
        })

        router.get("/:id", async (req, res) => {
            const {id} = req.params
            const owner = await this.store.getLotOwner(id)
            if (!owner) {
                return res.status(404).end(`Lot ${id} not found`)
            }
            res.json({
                id,
                owner,
            })
        })

        return router
    }

    private async overlapsWithSibling(
        parent: Hexalot,
        child: Hexalot,
        childDirection: Direction,
        clockwise: boolean,
    ): Promise<boolean> {
        const delta = clockwise ? 5 : 1
        const siblingDirection = (childDirection + delta) % 6
        const siblingID = await this.store.getChildLot(parent.id, siblingDirection)
        if (!siblingID) {
            return true
        }
        let comparisonDirection = (childDirection + 2) % 6
        if (clockwise) {
            comparisonDirection = (comparisonDirection + 3) % 6
        }
        const sibling = Hexalot.fromID(siblingID)
        return overlap(child, sibling, comparisonDirection)
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
        if (!overlap(parent, child, direction)) {
            throw new Error("Not a child of parent lot")
        }
        if (!this.overlapsWithSibling(parent, child, direction, true)) {
            throw new Error("Child must overlap with clockwise sibling")
        }
        if (!this.overlapsWithSibling(parent, child, direction, false)) {
            throw new Error("Child must overlap with counter-clockwise sibling")
        }
    }
}
