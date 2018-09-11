import {IFabricExports} from '../body/fabric-exports';
import {Gotchi} from './gotchi';
import {Fabric} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Vector3} from 'three';

const HANGER_ALTITUDE = 6;
const NORMAL_TICKS = 60;
const CATCH_UP_TICKS = 600;

interface IFitness {
    index: number;
    length: number;
}

const midpointToFitness = (midpoint: Vector3, index: number): IFitness => {
    return {index, length: midpoint.length()};
};

const MAX_POPULATION = 10;

export class Population {
    private gotchiArray: Gotchi[] = [];

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
    }

    public birthRandom() {
        if (this.gotchiArray.length + 1 > MAX_POPULATION) {
            this.death();
        }
        this.createBody().then(fabric => {
            this.gotchiArray.push(new Gotchi(fabric, new Genome()));
        });
    }

    public birthFromPopulation() {
        if (this.gotchiArray.length + 1 > MAX_POPULATION) {
            this.death();
        }
        const member = Math.floor(this.gotchiArray.length * Math.random());
        this.createBody().then(fabric => {
            const gotchi = this.gotchiArray[member].withNewBody(fabric);
            gotchi.mutateBehavior(20);
            this.gotchiArray.push(gotchi);
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

    public reboot() {
        this.gotchiArray.forEach((gotchi: Gotchi, index: number) => {
            this.createBody().then(fabric => {
                this.gotchiArray[index] = gotchi.withNewBody(fabric);
            });
        });
    }

    public iterate(): number[] {
        const maxAge = Math.max(...this.gotchiArray.map(gotchi => gotchi.age));
        this.gotchiArray.forEach(gotchi => {
            if (gotchi.age + CATCH_UP_TICKS < maxAge) {
                gotchi.iterate(CATCH_UP_TICKS);
            } else if (gotchi.age < NORMAL_TICKS * 2) {
                gotchi.iterate(NORMAL_TICKS);
            }
        });
        return this.gotchiArray.map(gotchi => gotchi.iterate(NORMAL_TICKS));
    }

    public get gotchis(): Gotchi[] {
        return this.gotchiArray;
    }

    private createBody(): Promise<Fabric> {
        return this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, 60);
            fabric.createSeed(5, HANGER_ALTITUDE);
            return fabric;
        });
    }
}