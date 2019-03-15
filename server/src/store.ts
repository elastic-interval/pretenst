import { FlashStore } from "flash-store"

import { IslandPattern } from "./island"
import { HexalotID } from "./types"

export interface IKeyValueStore {
    set(key: string, value: any): Promise<void>

    get(key: string): Promise<any | null>

    delete(key: string): Promise<void>
}

export class InvalidHexalotError extends Error {
}

export class InMemoryStore implements IKeyValueStore {
    private db: { [key: string]: any } = {}

    public async get(key: string): Promise<any | null> {
        return this.db[key] || null
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

    public delete(key: string): Promise<void> {
        return this.db.del(key)
    }

    public async get(key: string): Promise<any | null> {
        return await this.db.get(key) || null
    }

    public set(key: string, value: any): Promise<void> {
        return this.db.set(key, value)
    }
}

export class IslandStore {
    constructor(
        readonly db: IKeyValueStore,
        readonly islandName: string,
    ) {
    }

    public async getPattern(): Promise<IslandPattern | null> {
        const pattern = await this.get(`/island/${this.islandName}/pattern`)
        if (!pattern) {
            return null
        }
        return pattern
    }

    public async setPattern(pattern: IslandPattern): Promise<void> {
        return this.set(`/island/${this.islandName}/pattern`, pattern)
    }

    public async getGenome(id: HexalotID): Promise<string | null> {
        return this.get(`/hexalot/${id}/genome`)
    }

    public async setGenome(id: HexalotID, genome: string): Promise<void> {
        return this.set(`/hexalot/${id}/genome`, genome)
    }

    private async set(key: string, value: any): Promise<void> {
        return this.db.set(`/island/${this.islandName}/${key}`, value)
    }

    private async get(key: string): Promise<any | null> {
        return this.db.get(`/island/${this.islandName}/${key}`)
    }
}
