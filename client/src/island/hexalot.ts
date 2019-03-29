/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

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

export async function fetchJourney(hexalot: Hexalot, storage: IStorage, island: Island): Promise<void> {
    hexalot.journey = await hexalot.fetchJourney(storage, island)
    console.log(`Journey for ${hexalot.id}`, hexalot.journey)
}

export class Hexalot implements IHexalot {
    public id: string
    public genome?: Genome
    public journey?: Journey
    public childHexalots: Hexalot[] = []
    public rotation = Math.floor(Math.random() * 6)
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

    public createNativeGotchi(): Gotchi | undefined {
        if (!this.genome) {
            return undefined
        }
        return this.gotchiFactory.createGotchiSeed(this, this.rotation, this.genome)
    }

    public createGotchiWithGenome(genome: Genome, rotation: number): Gotchi | undefined {
        return this.gotchiFactory.createGotchiSeed(this, rotation, genome)
    }

    public rotate(forward: boolean): number {
        let nextRotation = forward ? this.rotation + 1 : this.rotation - 1
        if (nextRotation < 0) {
            nextRotation = 5
        } else if (nextRotation > 5) {
            nextRotation = 0
        }
        this.rotation = nextRotation
        return this.rotation
    }

    get centerSpot(): Spot {
        return this.spots[0]
    }

    get center(): Vector3 {
        return this.centerSpot.center
    }
}
