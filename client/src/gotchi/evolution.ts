import {Gotchi, IGotchiFactory} from './gotchi';
import {NORMAL_TICKS} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Raycaster, Vector3} from 'three';
import {Physics} from '../body/physics';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Gotch} from '../island/gotch';
import {Direction} from '../body/fabric-exports';

export const INITIAL_JOINT_COUNT = 47;
const CATCH_UP_TICKS = 220;
const MAX_POPULATION = 16;
const INITIAL_MUTATION_COUNT = 20;
const CHANCE_OF_GROWTH = 0.1;

const INITIAL_FRONTIER = 8;
const FRONTIER_EXPANSION = 1.2;

export interface IFrontier {
    radius: number;
    center: Vector3;
}

interface IGotchiFitness {
    gotchi: Gotchi;
    index: number;
    distance: number;
    age: number;
}

const sortFitness = (a: IGotchiFitness, b: IGotchiFitness) => {
    return (b.age === 0 ? b.distance : b.distance / b.age) - (a.age === 0 ? a.distance : a.distance / a.age);
};

export class Evolution {
    public frontier: BehaviorSubject<IFrontier>;
    public visibleGotchis: BehaviorSubject<Gotchi[]> = new BehaviorSubject<Gotchi[]>([]);
    public fittest?: Gotchi;
    private physicsObject = new Physics();
    private toBeBorn = 0;
    private mutationCount = INITIAL_MUTATION_COUNT;
    private center: Vector3;

    constructor(private masterGotch: Gotch, private factory: IGotchiFactory) {
        let mutatingGenome = masterGotch.genome;
        this.center = masterGotch.centerVector;
        this.frontier = new BehaviorSubject<IFrontier>({
            radius: INITIAL_FRONTIER,
            center: this.center
        });
        const promises: Array<Promise<Gotchi>> = [];
        for (let walk = 0; walk < MAX_POPULATION && mutatingGenome; walk++) {
            promises.push(this.factory.createGotchiAt(this.center, INITIAL_JOINT_COUNT, mutatingGenome));
            mutatingGenome = mutatingGenome.withMutatedBehavior(INITIAL_MUTATION_COUNT / 5);
        }
        Promise.all(promises).then(gotchis => {
            gotchis.forEach(gotchi => gotchi.direction = Direction.AHEAD);
            this.visibleGotchis.next(gotchis);
        });
    }

    public get fastest(): IGotchiFitness | undefined {
        const mature = this.gotchis
            .filter(gotchi => !gotchi.catchingUp)
            .map(this.evaluateFitness)
            .sort(sortFitness);
        return mature.length ? mature[mature.length - 1] : undefined;
    }

    public get midpoint(): Vector3 {
        const gotchis = this.gotchis;
        if (gotchis.length === 0) {
            return this.center;
        }
        return gotchis
            .map(gotchi => gotchi.fabric.midpoint)
            .reduce((prev, currentValue) => prev.add(currentValue), new Vector3())
            .multiplyScalar(1 / gotchis.length);
    }

    public get physics() {
        return this.physicsObject;
    }

    public applyPhysics() {
        this.gotchis.forEach(gotchi => gotchi.fabric.apply(this.physicsObject));
    }

    public iterate(): number[] {
        const maxAge = Math.max(...this.gotchis.map(gotchi => gotchi.age));
        let minFrozenAge = maxAge;
        let maxFrozenAge = 0;
        let frozenCount = 0;
        const freeze = (gotchi: Gotchi) => {
            gotchi.frozen = true;
            frozenCount++;
            if (minFrozenAge > gotchi.age) {
                minFrozenAge = gotchi.age;
            }
            if (maxFrozenAge < gotchi.age) {
                maxFrozenAge = gotchi.age;
            }
        };
        this.gotchis.forEach((gotchi, indaex, array) => {
            if (gotchi.frozen) {
                freeze(gotchi);
            } else {
                if (gotchi.getDistanceFrom(this.center) > this.frontier.getValue().radius) {
                    if (!array.find(g => g.frozen)) {
                        this.fittest = gotchi; // first frozen
                        const fingerprint = this.masterGotch.createFingerprint();
                        console.log(`Saving the winner ${fingerprint}`);
                        localStorage.setItem(fingerprint, JSON.stringify(this.fittest.genomeData));
                    }
                    freeze(gotchi);
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
            }
        });
        if (this.toBeBorn > 0) {
            if (this.gotchis.length >= MAX_POPULATION) {
                const fitness = this.weakest;
                if (fitness) {
                    this.visibleGotchis.next(this.gotchis.filter((gotchi, index) => index !== fitness.index));
                }
            } else {
                this.toBeBorn--;
                const offspring = this.randomOffspring;
                if (offspring) {
                    offspring.then(gotchi => {
                        this.visibleGotchis.next(this.gotchis.concat([gotchi]));
                    });
                }
            }
        }
        if (frozenCount > this.gotchis.length / 2) {
            if (minFrozenAge * 3 > maxFrozenAge * 2) {
                this.mutationCount--;
                if (this.mutationCount < INITIAL_MUTATION_COUNT / 2) {
                    this.mutationCount = INITIAL_MUTATION_COUNT;
                    this.frontier.next({radius: INITIAL_FRONTIER, center: this.center});
                    console.log(`fontier = ${INITIAL_MUTATION_COUNT}, mutations = ${this.mutationCount}`);
                } else {
                    const expandedRadius = this.frontier.getValue().radius * FRONTIER_EXPANSION;
                    this.frontier.next({radius: expandedRadius, center: this.center});
                    console.log(`fontier = ${expandedRadius}, mutations = ${this.mutationCount}`);
                }
            }
            const promisedOffspring = this.gotchis.map(gotchi => this.createOffspring(gotchi, true));
            this.dispose();
            this.visibleGotchis.next([]);
            Promise.all(promisedOffspring).then(offspring => {
                this.visibleGotchis.next(offspring);
            });
        }
        return this.gotchis.map(gotchi => gotchi.frozen ? 0 : gotchi.iterate(NORMAL_TICKS));
    }

    public findGotchi(raycaster: Raycaster): Gotchi | undefined {
        return this.visibleGotchis.getValue()
            .filter(gotchi => gotchi.facesMeshNode)
            .find(gotchi => raycaster.intersectObject(gotchi.facesMeshNode).length > 0);
    }

    public dispose() {
        // todo: review this
        this.gotchis.forEach(gotchi => gotchi.fabric.dispose());
    }

    // Privates =============================================================

    private createOffspring(parent: Gotchi, clone: boolean): Promise<Gotchi> {
        const grow = !clone && parent.frozen && Math.random() < CHANCE_OF_GROWTH;
        if (grow) {
            console.log('grow!');
        }
        return this.factory
            .createGotchiAt(
                this.masterGotch.centerVector,
                parent.fabric.jointCountMax + (grow ? 4 : 0),
                new Genome(parent.genomeData)
            )
            .then(child => {
                child.direction = Direction.AHEAD;
                return clone ? child : child.withMutatedBehavior(this.mutationCount)
            });
    }

    private get randomOffspring(): Promise<Gotchi> | undefined {
        const fertile = this.gotchis
            .filter(gotchi => !gotchi.catchingUp)
            .concat(this.gotchis.filter(gotchi => gotchi.frozen)); // bonus for the frozen
        if (fertile.length) {
            const luckyOne = fertile[Math.floor(fertile.length * Math.random())];
            return this.createOffspring(luckyOne, false);
        }
        return undefined;
    }

    private get weakest(): IGotchiFitness | undefined {
        const fitness = this.gotchis.map(this.evaluateFitness);
        fitness.sort(sortFitness);
        const mature = fitness.filter(f => !f.gotchi.catchingUp);
        return mature.pop();
    }

    private evaluateFitness = (gotchi: Gotchi, index: number): IGotchiFitness => {
        return {gotchi, index, distance: gotchi.getDistanceFrom(this.center), age: gotchi.age};
    };

    private get gotchis(): Gotchi[] {
        return this.visibleGotchis.getValue();
    }
}