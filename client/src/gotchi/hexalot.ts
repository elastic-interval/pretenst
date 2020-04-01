/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"

import { emptyGenome, fromGenomeData, Genome } from "./genome"
import { CreateGotchi, Gotchi } from "./gotchi"
import { ICoords, IHexalot } from "./island-logic"
import { Journey, Leg } from "./journey"
import { Spot } from "./spot"

export class Hexalot implements IHexalot {
    public id: string
    public journey?: Journey
    public childHexalots: Hexalot[] = []
    public nonce = 0
    public visited = false
    private _genome?: Genome

    constructor(public readonly parentHexalot: Hexalot | undefined,
                public readonly coords: ICoords,
                public readonly spots: Spot[],
                private createGotchi: CreateGotchi) {
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

    public get genome(): Genome {
        if (!this._genome) {
            const item = localStorage.getItem(this.id)
            this._genome = item ? fromGenomeData(JSON.parse(item)) : emptyGenome()
            console.log(`Loading genome from ${this.id}`, this._genome)
        }
        return fromGenomeData(this._genome.genomeData)
    }

    public set genome(genome: Genome) {
        this._genome = genome
        const data = genome.genomeData
        localStorage.setItem(this.id, JSON.stringify(data))
        console.log(`Saving genome to ${this.id}`, data)
    }

    public createNewGotchi(instance: FabricInstance, genome?: Genome): Gotchi | undefined {
        if (!genome) {
            genome = this.genome
        }
        return this.createGotchi(this, instance, genome, this.rotation)
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
        this.journey = random
        const randomFirst = random.firstLeg
        if (!randomFirst) {
            throw new Error("Unable to create first leg")
        }
        return randomFirst
    }

    public createRandomJourney(): Journey {
        return this.journeyOfLength(2)
    }

    public get centerSpot(): Spot {
        return this.spots[0]
    }

    public get center(): Vector3 {
        return this.centerSpot.center
    }

    private journeyOfLength(visitCount: number): Journey {
        const journeyVisits: Hexalot[] = [this]
        while (journeyVisits.length < visitCount + 1) {
            const endPoint = journeyVisits[journeyVisits.length - 1]
            const adjacent = endPoint.centerSpot.adjacentHexalots.filter(adjacentHexalot => journeyVisits.every(visit => visit.id !== adjacentHexalot.id))
            if (adjacent.length === 0) {
                console.error("No adjacent")
            }
            const randomNeighbor = adjacent[Math.floor(Math.random() * adjacent.length)]
            journeyVisits.push(randomNeighbor)
        }
        return new Journey(journeyVisits)
    }
}
