/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FlashStore } from "flash-store"

import { IJourneyData } from "./island"
import { IslandData } from "./island-logic"
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

    public async addUser(userId: string): Promise<void> {
        await this.db.set(`/user/${userId}/ownedLots`, [])
    }

    public async addOwnedLot(userId: string, lot: HexalotID): Promise<boolean> {
        // TODO: atomic
        const ownedLots = await this.getOwnedLots(userId)
        if (ownedLots === undefined) {
            return false
        }
        ownedLots.push(lot)
        await this.db.set(`/user/${userId}/ownedLots`, ownedLots)
        await this.db.set(`/hexalot/${lot}/owner`, userId)
        return true
    }

    public async getLotOwner(lot: HexalotID): Promise<string | undefined> {
        return this.db.get(`/hexalot/${lot}/owner`)
    }

    public async getOwnedLots(userId: string): Promise<HexalotID[]> {
        return this.db.get(`/user/${userId}/ownedLots`)
    }

    public async getIslandData(islandName: string): Promise<IslandData | undefined> {
        return this.db.get(`/island/${islandName}/data`)
    }

    public async setIslandData(islandName: string, data: IslandData): Promise<void> {
        await this.db.set(`/island/${islandName}/data`, data)
    }

    public async getGenomeData(id: HexalotID): Promise<string | undefined> {
        return this.db.get(`/hexalot/${id}/genomeData`)
    }

    public async setGenomeData(id: HexalotID, genomeData: string): Promise<void> {
        await this.db.set(`/hexalot/${id}/genomeData`, genomeData)
    }

    public async getRotation(id: HexalotID): Promise<number> {
        let rotation = await this.db.get(`/hexalot/${id}/rotation`)
        if (rotation === undefined) {
            rotation = 0
            await this.db.set(`/hexalot/${id}/rotation`, rotation)
        }
        return rotation
    }

    public async setRotation(id: HexalotID, rotation: number): Promise<void> {
        return this.db.set(`/hexalot/${id}/rotation`, rotation)
    }

    public async getJourney(id: HexalotID): Promise<IJourneyData | undefined> {
        return this.db.get(`/hexalot/${id}/journey`)
    }

    public async setJourney(id: HexalotID, journey: IJourneyData): Promise<void> {
        await this.db.set(`/hexalot/${id}/journey`, journey)
    }
}
