import {Vector3} from 'three';

import {Direction} from '../body/fabric-exports';
import {HEXAPOD_RADIUS} from '../island/shapes';
import {ITravel} from '../island/trip';

import {Gotchi} from './gotchi';

export const compareEvolvers = (a: Evolver, b: Evolver) => a.toDestination - b.toDestination;

const MAX_VOTES = 30;

export class Evolver {

    public done = false;
    public toDestination = 0;
    public currentDirection: Direction = Direction.REST;
    private target: Vector3;
    private toTarget = new Vector3();
    private votes: Direction[] = [];

    constructor(
        public id: number,
        public gotchi: Gotchi,
        public travel: ITravel,
    ) {
        this.target = travel.goTo.center;
    }

    public voteDirection(): Direction | undefined {
        const votes = this.votes;
        votes.push(this.directionToTarget);
        if (votes.length > MAX_VOTES) {
            votes.shift();
        }
        const counts = votes.reduce((c: number[], vote) => {
            c[vote]++;
            return c;
        }, [0,0,0,0,0]);
        for (let dir = Direction.FORWARD; dir <= Direction.REVERSE; dir++) {
            if (counts[dir] === MAX_VOTES && this.currentDirection !== dir) {
                this.currentDirection = dir;
                return dir;
            }
        }
        return undefined;
    }

    public calculateFitness(): void {
        this.toDestination = this.gotchi.getDistanceFrom(this.target);
    }

    public get touchedDestination(): boolean {
        return this.gotchi.getDistanceFrom(this.target) < HEXAPOD_RADIUS;
    }

    private get directionToTarget(): Direction {
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

}

