import { expect } from "chai"
import "mocha"

import { GENESIS_LOT_KEY, HexalotStore, IKeyValueStore } from "../src/store"

class InMemoryStore implements IKeyValueStore {
    private db: { [key: string]: string } = {}

    public async get(key: string): Promise<string | null> {
        return this.db[key] || null
    }

    public async set(key: string, value: string): Promise<void> {
        this.db[key] = value
    }
}

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
        await store.setLotOwner(lot, pubKey)
        expect(await store.getLotOwner(lot)).to.equal(pubKey)
    })
})
