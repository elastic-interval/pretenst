import {IFabricExports} from '../body/fabric-exports';
import {Gotchi} from './gotchi';
import {Fabric} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {BufferGeometry, Float32BufferAttribute} from 'three';
import {Physics} from '../body/physics';

const HANG_DELAY = 4000;
const REST_DELAY = 3000;
const HUNG_ALTITUDE = 7;
const WALL_STEP_DEGREES = 3;
const FRONTIER = 9;
const NORMAL_TICKS = 30;
const CATCH_UP_TICKS = 120;
const MAX_POPULATION = 16;
const FRONTIER_EXPANSION = 1.25;
const FRONTIER_EXPANSION_AGE = 40000;
const INITIAL_JOINT_COUNT = 24;
const MUTATION_COUNT = 15;
const CHANCE_OF_GROWTH = 0.2;

interface IGotchiFitness {
    gotchi: Gotchi;
    index: number;
    length: number;
}

const evaluateFitness = (gotchi: Gotchi, index: number): IGotchiFitness => {
    return {gotchi, index, length: gotchi.fabric.midpoint.length()};
};

export class Population {
    public frontierGeometry?: BufferGeometry;
    private physicsObject = new Physics();
    private gotchiArray: Gotchi[] = [];
    private frontier = FRONTIER;
    private toBeBorn = 0;

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
        this.createFrontierGeometry();
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
                if (gotchi.fabric.midpoint.length() >= this.frontier) {
                    gotchi.frozen = true;
                    if (gotchi.age < minFrozenAge) {
                        minFrozenAge = gotchi.age;
                    }
                    console.log(`frozen at age ${gotchi.age}`);
                    this.toBeBorn++;
                }
                gotchi.catchingUp = false;
                if (gotchi.age + CATCH_UP_TICKS < maxAge) {
                    gotchi.iterate(CATCH_UP_TICKS);
                    gotchi.catchingUp = true;
                } else if (gotchi.age + NORMAL_TICKS * 3 < maxAge) {
                    // console.log('triple', index, gotchi.age, maxAge);
                    gotchi.iterate(NORMAL_TICKS);
                    gotchi.catchingUp = true;
                }
                return gotchi;
            }
        });
        this.gotchiArray.push(...nursery);
        if (this.toBeBorn > 0) {
            this.toBeBorn--;
            this.birthFromPopulation();
        } else if (frozenCount > this.gotchiArray.length / 2) {
            this.gotchiArray.forEach(gotchi => this.createReplacement(gotchi, true));
            if (minFrozenAge < FRONTIER_EXPANSION_AGE) {
                this.frontier *= FRONTIER_EXPANSION;
                this.createFrontierGeometry();
                console.log(`maxTravel = ${this.frontier}`);
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
        const grow = gotchi.frozen && Math.random() < CHANCE_OF_GROWTH;
        console.log(`grow=${grow}`);
        this.createBody(gotchi.fabric.jointCountMax + (grow ? 2 : 0)).then(fabric => {
            gotchi.replacement = gotchi.withNewBody(fabric);
            if (!clone) {
                gotchi.replacement.mutateBehavior(MUTATION_COUNT);
            }
        });
    }

    private createBody(jointCountMax: number): Promise<Fabric> {
        return this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, jointCountMax);
            const currentPhysics = this.physicsObject.applyToFabric(fabricExports);
            console.log('current physics', currentPhysics);
            fabric.createSeed(3, HUNG_ALTITUDE);
            return fabric;
        });
    }

    private birthRandom() {
        if (this.gotchiArray.length + 1 > MAX_POPULATION) {
            this.death();
        }
        this.createBody(INITIAL_JOINT_COUNT).then(fabric => {
            this.gotchiArray.push(new Gotchi(fabric, new Genome(), HANG_DELAY, REST_DELAY));
        });
    }

    private birthFromPopulation() {
        while (this.gotchiArray.length + 1 > MAX_POPULATION) {
            if (!this.death()) {
                break;
            }
        }
        const fertile = this.gotchiArray.filter(gotchi => !(gotchi.catchingUp || gotchi.replacementExpected));
        if (fertile.length) {
            const luckyOne = fertile[Math.floor(fertile.length * Math.random())];
            this.createReplacement(luckyOne, false);
        }
    }

    private death(): boolean {
        if (this.gotchiArray.length > 0) {
            const fitness = this.gotchiArray.map(evaluateFitness);
            fitness.sort((a, b) => a.length - b.length);
            const mature = fitness.filter(f => !f.gotchi.catchingUp);
            if (mature.length) {
                const deadIndex = mature[0].index;
                const dead = this.gotchiArray[deadIndex];
                dead.fabric.dispose();
                this.gotchiArray.splice(deadIndex, 1);
                return true;
            }
        }
        return false;
    }

    private createFrontierGeometry(): void {
        if (this.frontierGeometry) {
            const old = this.frontierGeometry;
            this.frontierGeometry = undefined;
            old.dispose();
        }
        const geometry = new BufferGeometry();
        const positions = new Float32Array(360 * 6 / WALL_STEP_DEGREES);
        let slot = 0;
        for (let degrees = 0; degrees < 360; degrees += WALL_STEP_DEGREES) {
            const r1 = Math.PI * 2 * degrees / 360;
            const r2 = Math.PI * 2 * (degrees + WALL_STEP_DEGREES) / 360;
            positions[slot++] = this.frontier * Math.sin(r1);
            positions[slot++] = 0;
            positions[slot++] = this.frontier * Math.cos(r1);
            positions[slot++] = this.frontier * Math.sin(r2);
            positions[slot++] = 0;
            positions[slot++] = this.frontier * Math.cos(r2);
        }
        geometry.addAttribute('position', new Float32BufferAttribute(positions, 3));
        this.frontierGeometry = geometry;
    }
}