import { PhysicsFeature } from "../body/physics"
import { IGenomeData } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Island, IslandPattern } from "../island/island"
import { Journey } from "../island/journey"

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

    public getIsland(islandName: string): IslandPattern {
        const patternString = this.storage.getItem(islandName)
        return patternString ? JSON.parse(patternString) : {hexalots: "", spots: ""}
    }

    public setIsland(islandName: string, islandPattern: IslandPattern): void {
        this.storage.setItem(islandName, JSON.stringify(islandPattern))
    }

    public getGenomeData(hexalot: Hexalot): IGenomeData | undefined {
        const genomeString = this.storage.getItem(genomeKey(hexalot))
        return genomeString ? JSON.parse(genomeString) : undefined
    }

    public setGenome(hexalot: Hexalot, genomeData: IGenomeData): void {
        this.storage.setItem(genomeKey(hexalot), JSON.stringify(genomeData))
    }

    public saveJourney(hexalot: Hexalot): void {
        const journey = hexalot.journey
        const key = journeyKey(hexalot)
        if (journey) {
            this.storage.setItem(key, journey.serialize())
        } else {
            this.storage.removeItem(key)
        }
    }

    public loadJourney(hexalot: Hexalot, island: Island): Journey | undefined {
        const journeyString = this.storage.getItem(journeyKey(hexalot))
        if (journeyString) {
            const journey = new Journey([hexalot])
            hexalot.journey = journey
            const fingerprints: string[] = JSON.parse(journeyString)
            fingerprints.forEach(fingerprint => {
                const nextHexalot = island.findHexalot(fingerprint)
                if (nextHexalot) {
                    journey.addVisit(nextHexalot)
                }
            })
        } else {
            hexalot.journey = undefined
        }
        return hexalot.journey
    }

    public setRotation(hexalot: Hexalot, rotation: number): void {
        this.storage.setItem(rotationKey(hexalot), `${rotation}`)
    }

    public getRotation(hexalot: Hexalot): number {
        const rotationString = this.storage.getItem(rotationKey(hexalot))
        if (rotationString) {
            return parseInt(rotationString, 10)
        }
        return 0
    }
}
