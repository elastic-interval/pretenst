import {Gotchi} from './gotchi';
import {Vector3} from 'three';
import {HEXAPOD_RADIUS} from '../island/shapes';
import {ITravel} from '../island/trip';

export const compareEvolvers = (a: Evolver, b: Evolver) => a.toDestination - b.toDestination;

export class Evolver {

    public frozen = false;
    public toDestination = 0;
    private target: Vector3;

    constructor(
        public id: number,
        public gotchi: Gotchi,
        public travel: ITravel,
    ) {
        this.target = travel.goTo.center;
    }

    public calculateFitness(): void {
        this.toDestination = this.gotchi.getDistanceFrom(this.target);
    }

    public get touchedDestination(): boolean {
        return this.gotchi.getDistanceFrom(this.target) < HEXAPOD_RADIUS;
    }
}

