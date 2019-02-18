export interface IKeyValueStore {
    set(key: string, value: string): Promise<void>

    get(key: string): Promise<string | null>
}

type Hexalot = string
type PubKey = string

export const GENESIS_LOT_KEY = "genesisLot"

export class HexalotStore {
    constructor(private readonly db: IKeyValueStore, readonly prefix: string = "galapagotchi") {
    }

    public async getGenesisLot(): Promise<Hexalot | null> {
        return this.db.get(GENESIS_LOT_KEY)
    }

    public async setLotOwner(lot: Hexalot, owner: PubKey) {
        return this.set(`hexalot:${lot}:owner`, owner)
    }

    public async getLotOwner(lot: Hexalot): Promise<PubKey | null> {
        return this.get(`hexalot:${lot}:owner`)
    }

    private async set(key: string, value: string) {
        return this.db.set(`${this.prefix}:${key}`, value)
    }

    private async get(key: string): Promise<string | null> {
        return this.db.get(`${this.prefix}:${key}`)
    }
}
