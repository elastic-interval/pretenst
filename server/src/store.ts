import { FlashStore } from "flash-store"

import { IslandPattern } from "./island"
import { HexalotID } from "./types"

export interface IKeyValueStore {
    set(key: string, value: any): Promise<void>

    get(key: string): Promise<any | undefined>

    delete(key: string): Promise<void>
}

export class InvalidHexalotError extends Error {
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

export class IslandStore {
    constructor(
        readonly db: IKeyValueStore,
        readonly islandName: string,
    ) {
    }

    public async getPattern(): Promise<IslandPattern | undefined> {
        const pattern = await this.get(`pattern`)
        if (!pattern) {
            return undefined
        }
        return pattern
    }

    public async setPattern(pattern: IslandPattern): Promise<void> {
        return this.set(`pattern`, pattern)
    }

    public async getGenome(id: HexalotID): Promise<string | undefined> {
        return this.get(`hexalot/${id}/genome`)
    }

    public async setGenome(id: HexalotID, genome: string): Promise<void> {
        return this.set(`hexalot/${id}/genome`, genome)
    }

    private async set(key: string, value: any): Promise<void> {
        return this.db.set(`/island/${this.islandName}/${key}`, value)
    }

    private async get(key: string): Promise<any | undefined> {
        return this.db.get(`/island/${this.islandName}/${key}`)
    }
}
