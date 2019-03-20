import {PhysicsFeature} from "../body/physics"
import {fromGenomeData, IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import {Island, IslandData} from "../island/island"
import {IJourneyData} from "../island/journey"

import {IStorage} from "./storage"

function journeyKey(hexalot: Hexalot): string {
    return `${hexalot.id}-journey`
}

function genomeKey(hexalot: Hexalot): string {
    return `${hexalot.id}-genome`
}

function rotationKey(hexalot: Hexalot): string {
    return `${hexalot.id}-rotation`
}

export class LocalStorage implements IStorage {

    constructor(private storage: Storage) {
    }

    public getPhysicsFeature(feature: PhysicsFeature): number {
        const value = this.storage.getItem(feature)
        return value ? parseFloat(value) : 1.0
    }

    public setPhysicsFeature(feature: PhysicsFeature, factor: number): void {
        this.storage.setItem(feature, factor.toFixed(3))
    }

    public async getIslandData(islandName: string): Promise<IslandData> {
        const patternString = this.storage.getItem(islandName)
        if (!patternString) {
            return Promise.resolve({name: islandName, hexalots: "", spots: ""} as IslandData)
        }
        return Promise.resolve(JSON.parse(patternString))
    }

    public async claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandData | undefined> {
        hexalot.genome = fromGenomeData(genomeData)
        this.setGenomeData(hexalot, genomeData)
        this.setIsland(island.data)
        return Promise.resolve(island.data)
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

    public async setRotation(hexalot: Hexalot, rotation: number): Promise<void> {
        this.storage.setItem(rotationKey(hexalot), `${rotation}`)
        return Promise.resolve()
    }

    public async getRotation(hexalot: Hexalot): Promise<number> {
        const rotationString = this.storage.getItem(rotationKey(hexalot))
        if (rotationString) {
            return Promise.resolve(parseInt(rotationString, 10))
        }
        return Promise.resolve(0)
    }

    // private ====

    private setIsland(islandPattern: IslandData): void {
        this.storage.setItem(islandPattern.name, JSON.stringify(islandPattern))
    }
}
