import {Gotchi} from './gotchi';
import {Vector3} from 'three';
import {HEXAPOD_RADIUS} from '../island/shapes';
import {ITravel} from '../island/trip';
import {Direction} from '../body/fabric-exports';

export const compareEvolvers = (a: Evolver, b: Evolver) => a.toDestination - b.toDestination;

export class Evolver {

    public frozen = false;
    public toDestination = 0;
    private target: Vector3;
    private toTarget = new Vector3();

    constructor(
        public id: number,
        public gotchi: Gotchi,
        public travel: ITravel,
    ) {
        this.target = travel.goTo.center;
    }

    public get directionToTarget(): Direction {
        const fabric = this.gotchi.fabric;
        const toTarget = this.toTarget;
        toTarget.subVectors(this.target, fabric.seed).normalize();
        const degreeForward = toTarget.dot(fabric.forward);
        const degreeRight = toTarget.dot(fabric.right);
        if (degreeForward > 0) {
            if (degreeRight > 0) {
                return degreeForward > degreeRight ? Direction.FORWARD : Direction.RIGHT;
            } else {
                return degreeForward > -degreeRight ? Direction.FORWARD : Direction.LEFT;
            }
        } else {
            if (degreeRight > 0) {
                return -degreeForward > degreeRight ? Direction.REVERSE : Direction.RIGHT;
            } else {
                return -degreeForward > -degreeRight ? Direction.REVERSE : Direction.LEFT;
            }
        }
    }

    public calculateFitness(): void {
        this.toDestination = this.gotchi.getDistanceFrom(this.target);
    }

    public get touchedDestination(): boolean {
        return this.gotchi.getDistanceFrom(this.target) < HEXAPOD_RADIUS;
    }
}

