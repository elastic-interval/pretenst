import {IFabricExports} from '../body/fabric-exports';
import {Gotchi} from './gotchi';
import {Fabric} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Vector3} from 'three';

const HANGER_ALTITUDE = 6;

interface IFitness {
    index: number;
    length: number;
}

const midpointToFitness = (midpoint: Vector3, index: number):IFitness => {
    return {index, length: midpoint.length()};
};

export class Population {
    private gotchiArray: Gotchi[] = [];

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
    }

    public birth() {
        this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, 60);
            fabric.createSeed(5, HANGER_ALTITUDE);
            this.gotchiArray.push(new Gotchi(fabric, new Genome()));
        });
    }

    public death() {
        if (this.gotchiArray.length === 0) {
            return;
        }
        const midpoints = this.gotchiArray.map(gotchi => gotchi.midpoint);
        const fitness = midpoints.map(midpointToFitness);
        fitness.sort((a, b) => a.length - b.length);
        const dead = this.gotchiArray[fitness[0].index];
        dead.dispose();
        // console.log(`fitness ${JSON.stringify(fitness)}`);
        // console.log(`kill ${JSON.stringify(fitness[0])}`);
        this.gotchiArray.splice(fitness[0].index, 1);
    }

    public get gotchis(): Gotchi[] {
        return this.gotchiArray;
    }
}