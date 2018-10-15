import {Gotchi} from './gotchi';
import {Vector3} from 'three';
import {HEXAPOD_RADIUS} from '../island/shapes';

export class Evolver {

    public frozen = false;
    public fitness = 0;

    constructor(
        public id: number,
        public gotchi: Gotchi,
        public origin: Vector3,
        public destination: Vector3,
    ) {
    }

    public calculateFitness(): void {
        const fromOrigin = this.gotchi.getDistanceFrom(this.origin);
        const toDestination = this.gotchi.getDistanceFrom(this.destination);
        const totalDistance = fromOrigin + toDestination;
        this.fitness = 1 - toDestination / totalDistance;
    }

    public get touchedDestination(): boolean {
        return this.gotchi.getDistanceFrom(this.destination) < HEXAPOD_RADIUS;
    }
}

