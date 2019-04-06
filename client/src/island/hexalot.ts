/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { HUNG_ALTITUDE } from "../body/fabric"
import { fromOptionalGenomeData, Genome } from "../genetics/genome"
import { Gotchi, IGotchiFactory } from "../gotchi/gotchi"
import { IStorage } from "../storage/storage"

import { Island } from "./island"
import { ICoords, IHexalot } from "./island-logic"
import { fromOptionalJourneyData, Journey } from "./journey"
import { Spot } from "./spot"

export async function fetchGenome(hexalot: Hexalot, storage: IStorage): Promise<void> {
    if (hexalot.genome) {
        return
    }
    hexalot.genome = await hexalot.fetchGenome(storage)
    console.log(`Genome for ${hexalot.id}`, hexalot.genome)
}

export async function fetchJourney(hexalot: Hexalot, storage: IStorage, island: Island): Promise<Journey> {
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
        if (!this.journey || this.journey.hexalots.length < 1) {
            return Math.floor(Math.random() * 6)
        }
        const first = this.journey.hexalots[1]
        return this.centerSpot.adjacentHexalots.findIndex(adjacent => adjacent.id === first.id)
    }

    public async fetchGenome(storage: IStorage): Promise<Genome | undefined> {
        const genomeData = await storage.getGenomeData(this)
        this.genome = fromOptionalGenomeData(genomeData)
        return this.genome
    }

    public async fetchJourney(storage: IStorage, island: Island): Promise<Journey | undefined> {
        const journeyData = await storage.getJourneyData(this)
        this.journey = fromOptionalJourneyData(island, journeyData)
        return this.journey
    }

    public createRandomJourney(): Journey {
        return this.journeyOfLength(4)
    }

    public createNativeGotchi(): Gotchi | undefined {
        if (!this.genome) {
            return undefined
        }
        return this.gotchiFactory.createGotchiSeed(this, this.rotation, this.genome)
    }

    public createGotchiWithGenome(genome: Genome, rotation: number): Gotchi | undefined {
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
                break
            }
            const randomNeighbor = landNeighbors[Math.floor(Math.random() * landNeighbors.length)]
            journeyVisits.push(randomNeighbor)
        }
        return new Journey(journeyVisits)
    }
}
