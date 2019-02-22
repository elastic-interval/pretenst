import { HexalotID, PubKey } from "./types"

export interface IKeyValueStore {
    set(key: string, value: string): Promise<void>

    get(key: string): Promise<string | null>

    delete(key: string): Promise<void>
}

export const GENESIS_LOT_KEY = "genesisLot"

export class InvalidHexalotError extends Error {
}

export class InMemoryStore implements IKeyValueStore {
    private db: { [key: string]: string } = {}

    public async get(key: string): Promise<string | null> {
        return this.db[key] || null
    }

    public async set(key: string, value: string): Promise<void> {
        this.db[key] = value
    }

    public async delete(key: string): Promise<void> {
        delete this.db[key]
    }
}

export class HexalotStore {
    constructor(
        readonly db: IKeyValueStore,
        readonly prefix: string = "galapagotchi",
    ) {
    }

    public async getGenesisLot(): Promise<HexalotID | null> {
        return this.db.get(GENESIS_LOT_KEY)
    }

    public async touchLot(lot: HexalotID): Promise<void> {
        return this.set(`hexalot:${lot}:exists`, "1")
    }

    public async assignLot(lot: HexalotID, owner: PubKey): Promise<void> {
        const ownedLots: HexalotID[] = JSON.parse(await this.get(`user:${owner}:lots`) || "[]")
        ownedLots.push(lot)
        // FIXME: this operation has to be atomic
        await Promise.all([
            this.touchLot(lot),
            this.set(`user:${owner}:lots`, JSON.stringify(ownedLots)),
            this.set(`hexalot:${lot}:owner`, owner),
        ])
    }

    public async getOwnedLots(owner: PubKey): Promise<HexalotID[]> {
        return JSON.parse(await this.get(`user:${owner}:lots`) || "[]")
    }

    public async getLotOwner(lot: HexalotID): Promise<PubKey | null> {
        return this.get(`hexalot:${lot}:owner`)
    }

    public async lotExists(lot: HexalotID): Promise<boolean> {
        return !!(await this.get(`hexalot:${lot}:exists`))
    }

    private async set(key: string, value: string): Promise<void> {
        return this.db.set(`${this.prefix}::${key}`, value)
    }

    private async get(key: string): Promise<string | null> {
        return this.db.get(`${this.prefix}::${key}`)
    }
}
