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

const midpointToFitness = (midpoint: Vector3, index: number): IFitness => {
    return {index, length: midpoint.length()};
};

const MAX_POPULATION = 10;

export class Population {
    private gotchiArray: Gotchi[] = [];

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
    }

    public birth(fromMember?: number) {
        if (this.gotchiArray.length + 1 > MAX_POPULATION) {
            this.death();
        }
        this.createBody().then(fabric => {
            if (fromMember === undefined) {
                console.log('Fresh gotchi genes');
                this.gotchiArray.push(new Gotchi(fabric, new Genome()));
            } else {
                console.log(`mutated ${fromMember} of ${this.gotchiArray.length}`);
                const gotchi = this.gotchiArray[fromMember]
                    .withNewFabric(fabric)
                    .mutateBehavior(10);
                this.gotchiArray.push(gotchi);
            }
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
                this.gotchiArray[index] = gotchi.withNewFabric(fabric);
            });
        });
    }

    public iterate(): number[] {
        const ages = this.gotchiArray.map(gotchi => gotchi.age);
        const minAge = Math.min(...ages);
        const maxAge = Math.max(...ages);
        const midAge = (minAge + maxAge) / 2;
        const alive = (minAge === maxAge) ? this.gotchiArray : this.gotchiArray.filter(gotchi => gotchi.age < midAge);
        const ticks = (alive.length === this.gotchiArray.length) ? 60 : 120;
        // todo: this still sucks!
        return alive.map(gotchi => gotchi.iterate(ticks));
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