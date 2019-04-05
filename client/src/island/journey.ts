/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Hexalot } from "./hexalot"
import { Island } from "./island"

export interface IJourneyData {
    hexalots: string[]
}

export class Leg {
    constructor(readonly journey: Journey, public visited: number, public goTo: Hexalot) {
    }

    public get nextLeg(): Leg | undefined {
        const nextHexalot = this.visited + 1
        if (nextHexalot === this.journey.hexalots.length) {
            return undefined
        }
        const goTo = this.journey.hexalots[nextHexalot]
        return new Leg(this.journey, nextHexalot, goTo)
    }
}

export function fromOptionalJourneyData(island: Island, journeyData?: IJourneyData): Journey | undefined {
    const hexalots: Hexalot[] = []
    if (!journeyData) {
        return undefined
    }
    journeyData.hexalots.forEach(hexalotId => {
        const hexalot = island.findHexalot(hexalotId)
        if (hexalot) {
            hexalots.push(hexalot)
        }
    })
    return new Journey(hexalots)
}

export class Journey {
    constructor(readonly hexalots: Hexalot[]) {
    }

    public get visits(): Hexalot[] {
        return this.hexalots
    }

    public truncateVisit(hexalot: Hexalot): boolean {
        const existingIndex = this.hexalots.indexOf(hexalot)
        if (existingIndex < 0) {
            return false
        }
        this.hexalots.splice(existingIndex + 1)
        return true
    }

    public addVisit(hexalot: Hexalot): void {
        if (this.hexalots.length === 0) {
            return
        }
        const endpoint = this.hexalots[this.hexalots.length - 1]
        if (!endpoint) {
            return
        }
        const newEndpoint = endpoint.centerSpot.adjacentHexalots.find(ah => ah.id === hexalot.id)
        if (!newEndpoint) {
            return
        }
        this.hexalots.push(newEndpoint)
    }

    public get firstLeg(): Leg | undefined {
        if (this.visits.length < 2) {
            return undefined
        }
        return new Leg(this, 0, this.hexalots[1])
    }

    public get data(): IJourneyData {
        return {
            hexalots: this.hexalots.map(hexalot => hexalot.id),
        }
    }
}
