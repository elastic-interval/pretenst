import {PhysicsFeature} from "../body/physics"
import {IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import {Island, IslandPattern} from "../island/island"
import {Journey} from "../island/journey"

function journeyKey(hexalot: Hexalot): string {
    return `${hexalot.id}-journey`
}

function genomeKey(hexalot: Hexalot): string {
    return `${hexalot.id}-genome`
}

function rotationKey(hexalot: Hexalot): string {
    return `${hexalot.id}-rotation`
}

export class LocalStorage {

    constructor(private storage: Storage) {
    }

    public getPhysicsFeature(feature: PhysicsFeature): number {
        const value = this.storage.getItem(feature)
        return value ? parseFloat(value) : 1.0
    }

    public setPhysicsFeature(feature: PhysicsFeature, factor: number): void {
        this.storage.setItem(feature, factor.toFixed(3))
    }

    // TODO: getIslandPattern(islandName: string): Promise<IslandPattern>
    public getIsland(islandName: string): IslandPattern {
        const patternString = this.storage.getItem(islandName)
        return patternString ? JSON.parse(patternString) : {hexalots: "", spots: ""}
    }

    // TODO: claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandPattern | undefined>
    public setIsland(islandName: string, islandPattern: IslandPattern): void {
        this.storage.setItem(islandName, JSON.stringify(islandPattern))
    }

    public async getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined> {
        const genomeString = this.storage.getItem(genomeKey(hexalot))
        return Promise.resolve(genomeString ? JSON.parse(genomeString) : undefined)
    }

    public async setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void> {
        this.storage.setItem(genomeKey(hexalot), JSON.stringify(genomeData))
        return Promise.resolve()
    }

    // TODO: saveJourney(island: Island, hexalot: Hexalot): Promise<void>
    public async saveJourney(hexalot: Hexalot): Promise<void> {
        const journey = hexalot.journey
        const key = journeyKey(hexalot)
        if (journey) {
            this.storage.setItem(key, journey.serialize())
        } else {
            this.storage.removeItem(key)
        }
        return Promise.resolve()
    }

    public async loadJourney(hexalot: Hexalot, island: Island): Promise<Journey | undefined> {
        const journeyString = this.storage.getItem(journeyKey(hexalot))
        if (!journeyString) {
            return Promise.resolve(undefined)
        }
        const journey = new Journey([hexalot])
        const fingerprints: string[] = JSON.parse(journeyString)
        fingerprints.forEach(fingerprint => {
            const nextHexalot = island.findHexalot(fingerprint)
            if (nextHexalot) {
                journey.addVisit(nextHexalot)
            }
        })
        return Promise.resolve(journey)
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
}
