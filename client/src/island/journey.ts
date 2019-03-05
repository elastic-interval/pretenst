import {Hexalot} from "./hexalot"

export interface ITravel {
    journey: Journey
    visited: number
    goTo: Hexalot
}

export class Journey {
    constructor(private hexalots: Hexalot[]) {
    }

    public get visits(): Hexalot[] {
        return this.hexalots
    }

    public addVisit(hexalot: Hexalot): void {
        this.hexalots.push(hexalot)
    }

    public createTravel(visited: number): ITravel {
        return {journey: this, visited, goTo: this.hexalots[visited + 1]}
    }

    public serialize(): string {
        return JSON.stringify(this.hexalots.map(hexalot => hexalot.createFingerprint()))
    }
}
