import { expect } from "chai"
import "mocha"

import { GENESIS_LOT_KEY, HexalotStore, InMemoryStore } from "../src/store"

describe("Hexalot store", () => {
    let db: InMemoryStore
    let store: HexalotStore
    beforeEach(() => {
        db = new InMemoryStore()
        store = new HexalotStore(db)
    })

    it("can get the genesis hexalot if set", async () => {
        const genesisLot = "TEST_LOT"
        expect(await store.getGenesisLot()).to.equal(null)
        await db.set(GENESIS_LOT_KEY, genesisLot)
        expect(await store.getGenesisLot()).to.equal(genesisLot)
    })

    it("can set and get the owner of a lot", async () => {
        const pubKey = "TEST_KEY"
        const lot = "TEST_LOT"
        expect(await store.getLotOwner(lot)).to.equal(null)
        await store.assignLot(lot, pubKey)
        expect(await store.getLotOwner(lot)).to.equal(pubKey)
    })
})
