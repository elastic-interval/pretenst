/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { HUNG_ALTITUDE } from "../body/fabric"
import { fromOptionalGenomeData, Genome } from "../genetics/genome"
import { Gotchi, IGotchiFactory } from "../gotchi/gotchi"
import { RemoteStorage } from "../storage/remote-storage"

import { Island } from "./island"
import { ICoords, IHexalot } from "./island-logic"
import { fromOptionalJourneyData, Journey, Leg } from "./journey"
import { Spot } from "./spot"

export async function fetchGenome(hexalot: Hexalot, storage: RemoteStorage): Promise<void> {
    if (hexalot.genome) {
        return
    }
    hexalot.genome = await hexalot.fetchGenome(storage)
    console.log(`Genome for ${hexalot.id}`, hexalot.genome)
}

export async function fetchJourney(hexalot: Hexalot, storage: RemoteStorage, island: Island): Promise<Journey> {
    const journey = await hexalot.fetchJourney(storage, island)
    console.log(`Journey for ${hexalot.id}`, journey)
    if (!journey) {
        return hexalot.createRandomJourney()
    }
    return journey
}

export class Hexalot implements IHexalot {
    public id: string
    public genome?: Genome
    public journey?: Journey
    public childHexalots: Hexalot[] = []
    public nonce = 0
    public visited = false

    constructor(public parentHexalot: Hexalot | undefined,
                public coords: ICoords,
                public spots: Spot[],
                private gotchiFactory: IGotchiFactory) {
        this.spots[0].centerOfHexalot = this
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.spots[neighbor].adjacentHexalots.push(this)
        }
        this.spots.forEach(p => p.memberOfHexalot.push(this))
        if (parentHexalot) {
            parentHexalot.childHexalots.push(this)
            this.nonce = parentHexalot.nonce + 1
        }
    }

    public get rotation(): number {
        if (!this.journey || this.journey.visits.length < 2) {
            return Math.floor(Math.random() * 6)
        }
        const first = this.journey.visits[1]
        return this.centerSpot.adjacentSpots.findIndex(spot => {
            const adjacent = spot.centerOfHexalot
            if (!adjacent) {
                return false
            }
            return adjacent.id === first.id
        })
    }

    public async fetchGenome(storage: RemoteStorage): Promise<Genome | undefined> {
        const genomeData = await storage.getGenomeData(this)
        this.genome = fromOptionalGenomeData(genomeData)
        return this.genome
    }

    public async fetchJourney(storage: RemoteStorage, island: Island): Promise<Journey | undefined> {
        const journeyData = await storage.getJourneyData(this)
        this.journey = fromOptionalJourneyData(island, this, journeyData)
        return this.journey
    }

    public adjustedJourney(hexalot: Hexalot): Journey {
        if (!this.journey) {
            return new Journey([this, hexalot])
        }
        const truncated = this.journey.withTruncatedVisit(hexalot)
        if (truncated) {
            return truncated
        }
        const extended = this.journey.withVisit(hexalot)
        if (extended) {
            return extended
        }
        return this.journey
    }

    public get firstLeg(): Leg {
        if (this.journey) {
            const journeyFirst = this.journey.firstLeg
            if (journeyFirst) {
                return journeyFirst
            }
        }
        const random = this.createRandomJourney()
        const randomFirst = random.firstLeg
        if (!randomFirst) {
            throw new Error("Unable to create first leg")
        }
        return randomFirst
    }

    public createRandomJourney(): Journey {
        return this.journeyOfLength(2)
    }

    public createNativeGotchi(): Gotchi | undefined {
        if (!this.genome) {
            return undefined
        }
        return this.gotchiFactory.createGotchiSeed(this, this.rotation, this.genome)
    }

    public createGotchi(genome: Genome, rotation: number): Gotchi | undefined {
        return this.gotchiFactory.createGotchiSeed(this, rotation, genome)
    }

    get centerSpot(): Spot {
        return this.spots[0]
    }

    get center(): Vector3 {
        return this.centerSpot.center
    }

    get seed(): Vector3 {
        return new Vector3(0, HUNG_ALTITUDE, 0).add(this.center)
    }

    private journeyOfLength(visitCount: number): Journey {
        const journeyVisits: Hexalot[] = [this]
        while (journeyVisits.length < visitCount + 1) {
            const endPoint = journeyVisits[journeyVisits.length - 1]
            const landNeighbors = endPoint.centerSpot.adjacentHexalots.filter(adjacentHexalot => {
                return journeyVisits.every(visit => visit.id !== adjacentHexalot.id)
            })
            if (landNeighbors.length === 0) {
                // todo: find one anyway if there are to few!
                break
            }
            const randomNeighbor = landNeighbors[Math.floor(Math.random() * landNeighbors.length)]
            journeyVisits.push(randomNeighbor)
        }
        return new Journey(journeyVisits)
    }
}
