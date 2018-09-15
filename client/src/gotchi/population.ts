import {IFabricExports} from '../body/fabric-exports';
import {Gotchi} from './gotchi';
import {Fabric} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Vector3} from 'three';
import {Physics} from '../body/physics';

const HUNG_ALTITUDE = 7;
const NORMAL_TICKS = 50;
const CATCH_UP_TICKS = 300;
const MAX_POPULATION = 16;

interface IFitness {
    index: number;
    length: number;
}

const midpointToFitness = (midpoint: Vector3, index: number): IFitness => {
    return {index, length: midpoint.length()};
};

export class Population {
    private physicsObject = new Physics();
    private gotchiArray: Gotchi[] = [];
    private maxTravel = 7;
    private toBeBorn = 0;

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
        for (let birth = 0; birth < MAX_POPULATION; birth++) {
            setTimeout(() => this.birthRandom(), 500 + 200 * birth);
        }
    }

    public get physics() {
        return this.physicsObject;
    }

    public applyPhysics() {
        this.gotchiArray.forEach(gotchi => gotchi.fabric.apply(this.physicsObject));
    }

    public get forDisplay(): Gotchi[] {
        return this.gotchiArray;
    }

    public iterate(): number[] {
        const maxAge = Math.max(...this.gotchiArray.map(gotchi => gotchi.age));
        const nursery: Gotchi[] = [];
        let minFrozenAge = maxAge;
        let frozenCount = 0;
        let catchUp = false;
        this.gotchiArray = this.gotchiArray.map(gotchi => {
            if (gotchi.replacementExpected) {
                if (gotchi.replacement) {
                    gotchi.replacementExpected = false;
                    if (gotchi.clone) {
                        return gotchi.replacement;
                    } else {
                        nursery.push(gotchi.replacement);
                        gotchi.replacement = null;
                        return gotchi;
                    }
                } else {
                    return gotchi;
                }
            }
            else if (gotchi.frozen) {
                frozenCount++;
                return gotchi;
            } else {
                if (gotchi.age + CATCH_UP_TICKS < maxAge) {
                    gotchi.iterate(CATCH_UP_TICKS);
                    catchUp = true;
                } else if (gotchi.age + NORMAL_TICKS * 3 < maxAge) {
                    // console.log('triple', index, gotchi.age, maxAge);
                    gotchi.iterate(NORMAL_TICKS);
                    catchUp = true;
                }
                if (gotchi.fabric.midpoint.length() >= this.maxTravel) {
                    gotchi.frozen = true;
                    if (gotchi.age < minFrozenAge) {
                        minFrozenAge = gotchi.age;
                    }
                    console.log(`frozen at age ${gotchi.age}`);
                    this.toBeBorn++;
                }
                return gotchi;
            }
        });
        this.gotchiArray.push(...nursery);
        if (!catchUp && this.toBeBorn > 0) {
            this.toBeBorn--;
            this.birthFromPopulation();
            if (frozenCount > this.gotchiArray.length / 2) {
                this.gotchiArray.forEach(gotchi => this.createReplacement(gotchi, true));
                if (minFrozenAge < 40000) {
                    this.maxTravel *= 1.3;
                    console.log(`maxTravel = ${this.maxTravel}`);
                }
            }
        }
        return this.gotchiArray.map(gotchi => {
            return gotchi.iterate(NORMAL_TICKS);
        });
    }

    // Privates =============================================================

    private createReplacement(gotchi: Gotchi, clone: boolean): void {
        if (gotchi.replacementExpected && !clone) {
            return;
        }
        gotchi.replacementExpected = true;
        gotchi.clone = clone;
        this.createBody().then(fabric => {
            gotchi.replacement = gotchi.withNewBody(fabric);
            if (!clone) {
                gotchi.replacement.mutateBehavior(15);
            }
        });
    }

    private createBody(): Promise<Fabric> {
        return this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, 50);
            const currentPhysics = this.physicsObject.applyToFabric(fabricExports);
            console.log('current physics', currentPhysics);
            fabric.createSeed(5, HUNG_ALTITUDE);
            return fabric;
        });
    }

    private birthRandom() {
        if (this.gotchiArray.length + 1 > MAX_POPULATION) {
            this.death();
        }
        this.createBody().then(fabric => {
            this.gotchiArray.push(new Gotchi(fabric, new Genome()));
        });
    }

    private birthFromPopulation() {
        while (this.gotchiArray.length + 1 > MAX_POPULATION) {
            this.death();
        }
        const fertile = this.gotchiArray.filter(gotchi => !gotchi.replacementExpected);
        if (fertile.length) {
            const luckyOne = fertile[Math.floor(fertile.length * Math.random())];
            this.createReplacement(luckyOne, false);
        }
    }

    private death() {
        if (this.gotchiArray.length === 0) {
            return;
        }
        const midpoints = this.gotchiArray.map(gotchi => gotchi.fabric.midpoint);
        const fitness = midpoints.map(midpointToFitness);
        fitness.sort((a, b) => a.length - b.length);
        const dead = this.gotchiArray[fitness[0].index];
        dead.fabric.dispose();
        // console.log(`fitness ${JSON.stringify(fitness)}`);
        // console.log(`kill ${JSON.stringify(fitness[0])}`);
        this.gotchiArray.splice(fitness[0].index, 1);
    }


}