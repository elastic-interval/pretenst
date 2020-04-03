/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Hexalot } from "./hexalot"
import { Island } from "./island"

export class Journey {

    constructor(private hexalots: Hexalot[]) {
        if (hexalots.length === 0) {
            throw new Error("Empty journey")
        }
    }

    public get visits(): Hexalot[] {
        return this.hexalots
    }

    public withTruncatedVisit(hexalot: Hexalot): Journey | undefined {
        const existingIndex = this.hexalots.indexOf(hexalot)
        if (existingIndex < 0) {
            return undefined
        }
        return new Journey(this.hexalots.slice(0, existingIndex + 1))
    }

    public withVisit(hexalot: Hexalot): Journey | undefined {
        return withEndpoint(this.hexalots, hexalot)
    }

    public get firstLeg(): Leg | undefined {
        if (this.hexalots.length < 2) {
            return undefined
        }
        return new Leg(this, 0, this.hexalots[0], this.hexalots[1])
    }

    public get data(): IJourneyData {
        return {
            hexalots: this.hexalots.map(hexalot => hexalot.id),
        }
    }
}

export interface IJourneyData {
    hexalots: string[]
}

export class Leg {
    constructor(public readonly journey: Journey, public visited: number, public comeFrom: Hexalot, public goTo: Hexalot) {
    }

    public getMidpoint(midpoint: Vector3): void {
        midpoint.addVectors(this.comeFrom.center, this.goTo.center).multiplyScalar(0.5)
    }

    public get nextLeg(): Leg | undefined {
        const nextVisit = this.visited + 1
        if (nextVisit === this.journey.visits.length) {
            return undefined
        }
        const comeFrom = this.journey.visits[this.visited]
        const goTo = this.journey.visits[nextVisit]
        return new Leg(this.journey, nextVisit, comeFrom, goTo)
    }
}

export function fromOptionalJourneyData(island: Island, hexalot: Hexalot, journeyData?: IJourneyData): Journey | undefined {
    if (!journeyData) {
        return undefined
    }
    const hexalots: Hexalot[] = []
    journeyData.hexalots.forEach(hexalotId => {
        const foundHexalot = island.findHexalot(hexalotId)
        if (foundHexalot) {
            hexalots.push(foundHexalot)
        }
    })
    if (hexalots.length < 2 || hexalots[0].id !== hexalot.id) {
        return undefined
    }
    return new Journey(hexalots)
}

function withEndpoint(visits: Hexalot[], hexalot: Hexalot): Journey | undefined {
    const endIndex = visits.length - 1
    if (endIndex < 0) {
        return undefined
    }
    const endpoint = visits[endIndex]
    const newEndpoint = endpoint.centerSpot.adjacentHexalots.find(ah => ah.id === hexalot.id)
    if (!newEndpoint) {
        return withEndpoint(visits.slice(0, endIndex), hexalot)
    }
    return new Journey(visits.concat(newEndpoint))
}

