export interface IKeyValueStore {
    set(key: string, value: object): Promise<void>
    get(key: string): Promise<object>
}

export class HexalotStore {

    constructor(private readonly db: IKeyValueStore) {}

    public async saveGenesisLot(lot: string) {
        const existing = await this.db.get(lot)
        if (existing) {
            throw new Error("some shit")
        }
    }
}
