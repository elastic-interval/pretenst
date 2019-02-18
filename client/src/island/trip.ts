import {Spot} from './spot'

export interface ITravel {
    trip: Trip
    visited: number
    goTo: Spot
}

export class Trip {
    constructor(private tripSpots: Spot[]) {
    }

    public get spots(): Spot[] {
        return this.tripSpots
    }

    public createTravel(visited: number): ITravel {
        return {trip: this, visited, goTo: this.tripSpots[visited + 1]}
    }
}
