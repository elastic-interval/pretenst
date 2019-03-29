/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { fromOptionalGenomeData, IGenomeData } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { extractIslandData, IslandData } from "../island/island-logic"
import { IJourneyData } from "../island/journey"

import { IStorage } from "./storage"

function journeyKey(hexalot: Hexalot): string {
    return `${hexalot.id}-journey`
}

function genomeKey(hexalot: Hexalot): string {
    return `${hexalot.id}-genome`
}

export class BrowserStorage implements IStorage {

    constructor(private storage: Storage) {
    }

    public async getIslandData(islandName: string): Promise<IslandData | undefined> {
        const patternString = this.storage.getItem(islandName)
        if (!patternString) {
            return Promise.resolve({name: islandName, hexalots: "", spots: ""} as IslandData)
        }
        return Promise.resolve(JSON.parse(patternString))
    }

    public async getOwnedLots(): Promise<string[] | undefined> {
        return undefined
    }

    public async claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandData | undefined> {
        hexalot.genome = fromOptionalGenomeData(genomeData)
        this.setGenomeData(hexalot, genomeData)
        const islandData = extractIslandData(island)
        this.storage.setItem(islandData.name, JSON.stringify(islandData))
        return Promise.resolve(islandData)
    }

    public async getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined> {
        const genomeString = this.storage.getItem(genomeKey(hexalot))
        return Promise.resolve(genomeString ? JSON.parse(genomeString) : undefined)
    }

    public async setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void> {
        this.storage.setItem(genomeKey(hexalot), JSON.stringify(genomeData))
        return Promise.resolve()
    }

    public async setJourneyData(hexalot: Hexalot, journeyData?: IJourneyData): Promise<void> {
        const key = journeyKey(hexalot)
        if (journeyData) {
            this.storage.setItem(key, JSON.stringify(journeyData))
        } else {
            this.storage.removeItem(key)
        }
        return Promise.resolve()
    }

    public async getJourneyData(hexalot: Hexalot): Promise<IJourneyData | undefined> {
        const journeyString = this.storage.getItem(journeyKey(hexalot))
        if (!journeyString) {
            return Promise.resolve(undefined)
        }
        return Promise.resolve(JSON.parse(journeyString))
    }

    public async getLotOwner(hexalot: Hexalot): Promise<string | undefined> {
        // TODO
        return undefined
    }
}
