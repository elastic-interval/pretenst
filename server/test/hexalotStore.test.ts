import "mocha"

import { HexalotStore, IKeyValueStore } from "../store"

class InMemoryStore implements IKeyValueStore {
    private db: { [key: string]: object } = {}

    public async get(key: string): Promise<object> {
        return this.db[key]
    }

    public async set(key: string, value: object): Promise<void> {
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

    it("should be able to store a genesis hexalot", async () => {
        await store.saveGenesisLot("asdiuhsauid")
    })
})
