import {Gotchi} from './gotchi';
import {Vector3} from 'three';
import {HEXAPOD_RADIUS} from '../island/shapes';

export const compareEvolvers = (a: Evolver, b: Evolver) => a.toDestination - b.toDestination;

export class Evolver {

    public frozen = false;
    public toDestination = 0;

    constructor(
        public id: number,
        public gotchi: Gotchi,
        public origin: Vector3,
        public destination: Vector3,
    ) {
    }

    public calculateFitness(): void {
        this.toDestination = this.gotchi.getDistanceFrom(this.destination);
    }

    public get touchedDestination(): boolean {
        return this.gotchi.getDistanceFrom(this.destination) < HEXAPOD_RADIUS;
    }
}

