import {Gotchi} from './gotchi';
import {Vector3} from 'three';
import {HEXAPOD_RADIUS} from '../island/shapes';

export interface IGotchiFitness {
    gotchi: Gotchi;
    index: number;
    distance: number;
    age: number;
}

export class Fitness {
    constructor(private target: Vector3) {
    }

    public shouldFreeze(gotchi: Gotchi) {
        return gotchi.getDistanceFrom(this.target) < HEXAPOD_RADIUS;
    }

    public rank(gotchis: Gotchi[]): IGotchiFitness[] {
        const evaluated = gotchis.map(this.evaluateFitness);
        evaluated.sort((a: IGotchiFitness, b: IGotchiFitness) => a.distance/a.age - b.distance/a.age);
        return evaluated;
    }

    private evaluateFitness = (gotchi: Gotchi, index: number): IGotchiFitness => {
        return {gotchi, index, distance: gotchi.getDistanceFrom(this.target), age: gotchi.age};
    };
}