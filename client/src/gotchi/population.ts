import {Gotchi} from './gotchi';
import {IFabricFactory, NORMAL_TICKS} from '../body/fabric';
import {Genome, IGenomeData} from '../genetics/genome';
import {Raycaster, Vector3} from 'three';
import {Physics} from '../body/physics';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {ICoords} from '../island/spot';

export const INITIAL_JOINT_COUNT = 47;
const CATCH_UP_TICKS = 220;
const MAX_POPULATION = 16;
const INITIAL_MUTATION_COUNT = 20;
const CHANCE_OF_GROWTH = 0.1;

const INITIAL_FRONTIER = 8;
const FRONTIER_EXPANSION = 1.1;

export interface IFrontier {
    radius: number;
}

interface IGotchiFitness {
    gotchi: Gotchi;
    index: number;
    distance: number;
    age: number;
}

const evaluateFitness = (gotchi: Gotchi, index: number): IGotchiFitness => {
    return {gotchi, index, distance: gotchi.distance, age: gotchi.age};
};

const sortFitness = (a: IGotchiFitness, b: IGotchiFitness) => {
    return (a.age === 0 ? a.distance : a.distance / a.age) - (b.age === 0 ? b.distance : b.distance / b.age)
};

const getFittest = (mutated: boolean): Genome | undefined => {
    const fittest = localStorage.getItem('fittest');
    const storedGenome: IGenomeData = fittest ? JSON.parse(fittest) : null;
    return storedGenome ? mutated ? new Genome(storedGenome).withMutatedBehavior(INITIAL_MUTATION_COUNT) : new Genome(storedGenome) : undefined;
};

export const setFittest = (gotchi: Gotchi) => {
    console.log('set fittest');
    localStorage.setItem('fittest', JSON.stringify(gotchi.genomeData));
};

export const clearFittest = () => {
    console.log('clear fittest');
    localStorage.removeItem('fittest');
};

export const BIRTHPLACE: ICoords = {x: 0, y: 0};

export class Population {
    public frontier: BehaviorSubject<IFrontier> = new BehaviorSubject({radius: INITIAL_FRONTIER});
    public fittest?: Gotchi;
    private physicsObject = new Physics();
    private gotchiArray: Gotchi[] = [];
    private toBeBorn = 0;
    private mutationCount = INITIAL_MUTATION_COUNT;

    constructor(master: string, private fabricFactory: IFabricFactory) {
        for (let walk = 0; walk < MAX_POPULATION; walk++) {
            this.birthFromGenome(master, getFittest(walk > 0));
        }
    }

    public get fastest(): IGotchiFitness | undefined {
        const mature = this.gotchiArray
            .filter(gotchi => !gotchi.catchingUp)
            .map(evaluateFitness)
            .sort(sortFitness);
        return mature.length ? mature[mature.length - 1] : undefined;
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
        let catchingUp = false;
        this.gotchiArray = this.gotchiArray.map((gotchi, index, array) => {
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
                if (gotchi.distance > this.frontier.getValue().radius) {
                    if (!array.find(g => g.frozen)) {
                        this.fittest = gotchi;
                        setFittest(gotchi);
                    }
                    freeze(gotchi);
                    this.toBeBorn++;
                }
                gotchi.catchingUp = false;
                if (gotchi.age + CATCH_UP_TICKS < maxAge) {
                    gotchi.iterate(CATCH_UP_TICKS);
                    catchingUp = gotchi.catchingUp = true;
                } else if (gotchi.age + NORMAL_TICKS * 3 < maxAge) {
                    gotchi.iterate(NORMAL_TICKS);
                    catchingUp = gotchi.catchingUp = true;
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
                const expandedRadius = this.frontier.getValue().radius * FRONTIER_EXPANSION;
                this.frontier.next({radius: expandedRadius});
                this.mutationCount--;
                console.log(`fontier = ${expandedRadius}, mutations = ${this.mutationCount}`);
            }
        }
        return this.gotchiArray.map(gotchi => {
            if (gotchi.frozen) {
                return 0;
            }
            return gotchi.iterate(catchingUp ? NORMAL_TICKS / 3 : NORMAL_TICKS);
        });
    }

    public findGotchi(raycaster: Raycaster): Gotchi | undefined {
        return this.gotchiArray
            .filter(gotchi => gotchi.facesMeshNode)
            .find(gotchi => raycaster.intersectObject(gotchi.facesMeshNode).length > 0);
    }

    // Privates =============================================================

    private birthFromGenome(master: string, existingGenome?: Genome) {
        this.fabricFactory.createBodyAt(BIRTHPLACE.x, BIRTHPLACE.y, INITIAL_JOINT_COUNT).then(fabric => {
            const genome = existingGenome ? existingGenome : new Genome({
                master,
                embryoSequence: [],
                behaviorSequence: []
            });
            this.gotchiArray.push(new Gotchi(fabric, genome));
        });
    }

    private createReplacement(gotchi: Gotchi, clone: boolean): void {
        gotchi.expecting = true;
        const grow = !clone && gotchi.frozen && Math.random() < CHANCE_OF_GROWTH;
        if (grow) {
            console.log('grow!');
        }
        this.fabricFactory
            .createBodyAt(BIRTHPLACE.x, BIRTHPLACE.y, gotchi.fabric.jointCountMax + (grow ? 4 : 0))
            .then(fabric => {
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
            fitness.sort(sortFitness);
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
}