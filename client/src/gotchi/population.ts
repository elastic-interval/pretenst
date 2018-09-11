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
const MAX_TRAVEL = 10;

export class Population {
    private gotchiArray: Gotchi[] = [];
    private toBeBorn = 0;

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
    }

    public fill() {
        for (let birth = 0; birth < MAX_POPULATION; birth++) {
            this.birthRandom();
        }
        return this;
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
            gotchi.mutateBehavior(10);
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
        let frozenCount = 0;
        let catchUp = false;
        this.gotchiArray.forEach(gotchi => {
            if (gotchi.frozen) {
                frozenCount++;
            } else {
                if (gotchi.age + CATCH_UP_TICKS < maxAge) {
                    gotchi.iterate(CATCH_UP_TICKS);
                    catchUp = true;
                } else if (gotchi.age + NORMAL_TICKS * 3 < maxAge) {
                    // console.log('triple', index, gotchi.age, maxAge);
                    gotchi.iterate(NORMAL_TICKS);
                    catchUp = true;
                }
                if (gotchi.midpoint.length() >= MAX_TRAVEL) {
                    gotchi.frozen = true;
                    this.toBeBorn++;
                }
            }
        });
        if (!catchUp && this.toBeBorn > 0) {
            this.toBeBorn--;
            this.birthFromPopulation();
        }
        if (frozenCount > this.gotchiArray.length / 2) {
            this.reboot();
        }
        return this.gotchiArray.map(gotchi => {
            return gotchi.iterate(NORMAL_TICKS);
        });
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