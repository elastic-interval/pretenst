import {Hexalot} from "./hexalot"

export class Leg {
    constructor(public journey: Journey, public visited: number, public goTo: Hexalot) {
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

export class Journey {
    constructor(public hexalots: Hexalot[]) {
    }

    public get visits(): Hexalot[] {
        return this.hexalots
    }

    public addVisit(hexalot: Hexalot): void {
        if (this.hexalots.some(h => h.id === hexalot.id)) {
            return
        }
        this.hexalots.push(hexalot)
    }

    public get firstLeg(): Leg | undefined {
        if (this.visits.length < 2) {
            return undefined
        }
        return new Leg(this, 0, this.hexalots[1])
    }

    public serialize(): string {
        return JSON.stringify(this.hexalots.map(hexalot => hexalot.id))
    }
}
