import {IFabricExports} from '../body/fabric-exports';
import {Gotchi} from './gotchi';
import {Fabric} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {BufferGeometry, Float32BufferAttribute, Vector3} from 'three';
import {Physics} from '../body/physics';

export const HUNG_ALTITUDE = 7;
const HANG_DELAY = 4000;
const REST_DELAY = 3000;
const WALL_STEP_DEGREES = 3;
const INITIAL_FRONTIER = 8;
const NORMAL_TICKS = 30;
const CATCH_UP_TICKS = 120;
const MAX_POPULATION = 16;
const FRONTIER_EXPANSION = 1.1;
const FRONTIER_ALTITUDE = 0.3;
const INITIAL_JOINT_COUNT = 47;
const INITIAL_MUTATION_COUNT = 20;
const CHANCE_OF_GROWTH = 0.1;

interface IGotchiFitness {
    gotchi: Gotchi;
    index: number;
    distance: number;
}

const evaluateFitness = (gotchi: Gotchi, index: number): IGotchiFitness => {
    return {gotchi, index, distance: gotchi.distance};
};

export class Population {
    public frontierGeometry?: BufferGeometry;
    private physicsObject = new Physics();
    private gotchiArray: Gotchi[] = [];
    private frontier = INITIAL_FRONTIER;
    private toBeBorn = 0;
    private mutationCount = INITIAL_MUTATION_COUNT;

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
        this.createFrontierGeometry();
        for (let birth = 0; birth < MAX_POPULATION; birth++) {
            setTimeout(() => this.birthRandom(), 200 * birth);
        }
    }

    public get midpoint(): Vector3 {
        const gotchis = this.gotchiArray;
        return gotchis
            .map(gotchi => gotchi.fabric.midpoint)
            .reduce((prev, currentValue) => prev.add(currentValue), new Vector3())
            .multiplyScalar(1 / gotchis.length);
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
        let maxFrozenAge = 0;
        let frozenNotExpectingCount = 0;
        const freeze = (gotchi: Gotchi) => {
            gotchi.frozen = true;
            if (!gotchi.expecting) {
                frozenNotExpectingCount++;
            }
            if (minFrozenAge > gotchi.age) {
                minFrozenAge = gotchi.age;
            }
            if (maxFrozenAge < gotchi.age) {
                maxFrozenAge = gotchi.age;
            }
        };
        this.gotchiArray = this.gotchiArray.map((gotchi, index) => {
            if (gotchi.rebornClone) {
                return gotchi.rebornClone;
            }
            else if (gotchi.offspring) {
                nursery.push(gotchi.offspring);
                gotchi.offspring = undefined;
                return gotchi;
            }
            else if (gotchi.frozen) {
                freeze(gotchi);
                return gotchi;
            } else {
                if (gotchi.distance > this.frontier) {
                    freeze(gotchi);
                    console.log(`frozen at age ${gotchi.age} with distance=${gotchi.distance}`);
                    this.toBeBorn++;
                }
                gotchi.catchingUp = false;
                if (gotchi.age + CATCH_UP_TICKS < maxAge) {
                    gotchi.iterate(CATCH_UP_TICKS);
                    gotchi.catchingUp = true;
                } else if (gotchi.age + NORMAL_TICKS * 3 < maxAge) {
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
        } else if (frozenNotExpectingCount > this.gotchiArray.length / 2) {
            this.gotchiArray.forEach(gotchi => this.createReplacement(gotchi, true));
            if (minFrozenAge * 3 > maxFrozenAge * 2) {
                this.frontier *= FRONTIER_EXPANSION;
                this.createFrontierGeometry();
                this.mutationCount--;
                console.log(`fontier = ${this.frontier}, mutations = ${this.mutationCount}`);
            }
        }
        return this.gotchiArray.map(gotchi => {
            return gotchi.iterate(NORMAL_TICKS);
        });
    }

    // Privates =============================================================

    private createReplacement(gotchi: Gotchi, clone: boolean): void {
        gotchi.expecting = true;
        const grow = !clone && gotchi.frozen && Math.random() < CHANCE_OF_GROWTH;
        if (grow) {
            console.log('grow!');
        }
        this.createBody(gotchi.fabric.jointCountMax + (grow ? 2 : 0)).then(fabric => {
            const freshGotchi = gotchi.withNewBody(fabric);
            gotchi.expecting = false;
            if (clone) {
                gotchi.rebornClone = freshGotchi;
            } else {
                freshGotchi.mutateBehavior(this.mutationCount);
                gotchi.offspring = freshGotchi;
            }
        });
    }

    private birthRandom() {
        if (this.gotchiArray.length + 1 > MAX_POPULATION) {
            if (!this.death()) {
                console.log('death failed during birth');
            }
        }
        this.createBody(INITIAL_JOINT_COUNT).then(fabric => {
            this.gotchiArray.push(new Gotchi(fabric, new Genome(), HANG_DELAY, REST_DELAY));
        });
    }

    private birthFromPopulation() {
        while (this.gotchiArray.length + 1 > MAX_POPULATION) {
            if (!this.death()) {
                console.log('death failed');
                break;
            }
        }
        const fertile = this.gotchiArray.filter(gotchi => !gotchi.catchingUp);
        if (fertile.length) {
            const luckyOne = fertile[Math.floor(fertile.length * Math.random())];
            this.createReplacement(luckyOne, false);
        }
    }

    private death(): boolean {
        if (this.gotchiArray.length > 0) {
            const fitness = this.gotchiArray.map(evaluateFitness);
            fitness.sort((a, b) => a.distance - b.distance);
            const mature = fitness.filter(f => !f.gotchi.catchingUp);
            if (mature.length) {
                const deadIndex = mature[0].index;
                const dead = this.gotchiArray[deadIndex];
                dead.fabric.dispose();
                this.gotchiArray.splice(deadIndex, 1);
                return true;
            } else {
                console.log('no mature gotchis to kill!')
            }
        }
        return false;
    }

    private createBody(jointCountMax: number): Promise<Fabric> {
        return this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, jointCountMax);
            this.physicsObject.applyToFabric(fabricExports);
            // console.log('current physics', currentPhysics);
            fabric.createSeed(5, HUNG_ALTITUDE);
            fabric.iterate(1, true);
            return fabric;
        });
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
            positions[slot++] = FRONTIER_ALTITUDE;
            positions[slot++] = this.frontier * Math.cos(r1);
            positions[slot++] = this.frontier * Math.sin(r2);
            positions[slot++] = FRONTIER_ALTITUDE;
            positions[slot++] = this.frontier * Math.cos(r2);
        }
        geometry.addAttribute('position', new Float32BufferAttribute(positions, 3));
        this.frontierGeometry = geometry;
    }
}