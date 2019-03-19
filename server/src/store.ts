import { FlashStore } from "flash-store"

import { IslandPattern } from "./island"
import { HexalotID } from "./types"

export interface IKeyValueStore {
    set(key: string, value: any): Promise<void>

    get(key: string): Promise<any | undefined>

    delete(key: string): Promise<void>
}

export class InMemoryStore implements IKeyValueStore {
    private db: { [key: string]: any } = {}

    public async get(key: string): Promise<any | undefined> {
        return this.db[key] || undefined
    }

    public async set(key: string, value: any): Promise<void> {
        this.db[key] = value
    }

    public async delete(key: string): Promise<void> {
        delete this.db[key]
    }
}

export class LevelDBFlashStore implements IKeyValueStore {
    private db: FlashStore<string, any>

    constructor(storePath: string) {
        this.db = new FlashStore(storePath)
    }

    public async delete(key: string): Promise<void> {
        return this.db.del(key)
    }

    public async get(key: string): Promise<any | undefined> {
        return await this.db.get(key) || undefined
    }

    public async set(key: string, value: any): Promise<void> {
        return this.db.set(key, value)
    }
}

export class DataStore {
    constructor(
        readonly db: IKeyValueStore,
    ) {
    }

    public async getPattern(islandName: string): Promise<IslandPattern | undefined> {
        return (await this.db.get(`/island/${islandName}/pattern`)) || {
            hexalots: "",
            spots: "",
        }
    }

    public async setPattern(islandName: string, pattern: IslandPattern): Promise<void> {
        return this.db.set(`/island/${islandName}/pattern`, pattern)
    }

    public async getGenome(id: HexalotID): Promise<string | undefined> {
        return this.db.get(`/hexalot/${id}/genomeData`)
    }

    public async setGenome(id: HexalotID, genomeData: string): Promise<void> {
        return this.db.set(`/hexalot/${id}/genomeData`, genomeData)
    }

    public async getRotation(id: HexalotID): Promise<number> {
        let rotation = await this.db.get(`/hexalot/${id}/rotation`)
        if (rotation === undefined) {
            rotation = 0 // TODO: default rotation?
            await this.db.set(`/hexalot/${id}/rotation`, rotation)
        }
        return rotation
    }

    public async setRotation(id: HexalotID, rotation: number): Promise<void> {
        return this.db.set(`/hexalot/${id}/rotation`, rotation)
    }
}
