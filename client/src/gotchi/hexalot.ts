/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Genome } from "./genome"
import { Gotchi, IGotchiFactory } from "./gotchi"
import { ICoords, IHexalot } from "./island-logic"
import { Journey, Leg } from "./journey"
import { Spot } from "./spot"

export class Hexalot implements IHexalot {
    public id: string
    public genome?: Genome
    public journey?: Journey
    public childHexalots: Hexalot[] = []
    public nonce = 0
    public visited = false

    constructor(public readonly parentHexalot: Hexalot | undefined,
                public readonly coords: ICoords,
                public readonly spots: Spot[],
                public readonly gotchiFactory: IGotchiFactory) {
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

    public createNativeGotchi(): Gotchi | undefined {
        if (!this.genome) {
            return undefined
        }
        return this.gotchiFactory.createGotchi(this, this.rotation, this.genome)
    }

    public createGotchiFromGenome(rotation: number, genome: Genome): Gotchi | undefined {
        return this.gotchiFactory.createGotchi(this, rotation, genome)
    }

    public createGotchiFromPrototype(gotchi: Gotchi, rotation: number, genome: Genome) : Gotchi | undefined {
        return this.gotchiFactory.createGotchi(this, rotation, genome)
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
            const landNeighbors = endPoint.centerSpot.adjacentHexalots.filter(adjacentHexalot => journeyVisits.every(visit => visit.id !== adjacentHexalot.id))
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
