import {Gotchi, IGotchiFactory} from './gotchi';
import {NORMAL_TICKS} from '../body/fabric';
import {Genome} from '../genetics/genome';
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
    center: Vector3;
}

interface IGotchiFitness {
    gotchi: Gotchi;
    index: number;
    distance: number;
    age: number;
}

const sortFitness = (a: IGotchiFitness, b: IGotchiFitness) => {
    return (a.age === 0 ? a.distance : a.distance / a.age) - (b.age === 0 ? b.distance : b.distance / b.age)
};

export class Evolution {
    public frontier: BehaviorSubject<IFrontier>;
    public gotchis: BehaviorSubject<Gotchi[]> = new BehaviorSubject<Gotchi[]>([]);
    public fittest?: Gotchi;
    private physicsObject = new Physics();
    private toBeBorn = 0;
    private mutationCount = INITIAL_MUTATION_COUNT;
    private center: Vector3;

    constructor(private coords: ICoords, genome: Genome, private factory: IGotchiFactory) {
        let mutatingGenome = genome;
        this.center = new Vector3(coords.x, 0, coords.y);
        this.frontier = new BehaviorSubject<IFrontier>({
            radius: INITIAL_FRONTIER,
            center: this.center
        });
        for (let walk = 0; walk < MAX_POPULATION; walk++) {
            this.factory.createGotchiAt(coords.x, coords.y, INITIAL_JOINT_COUNT, mutatingGenome).then(gotchi => {
                this.gotchis.next(this.gotchis.getValue().concat(gotchi));
            });
            mutatingGenome = genome.withMutatedBehavior(INITIAL_MUTATION_COUNT);
        }
    }

    public get fastest(): IGotchiFitness | undefined {
        const mature = this.gotchis.getValue()
            .filter(gotchi => !gotchi.catchingUp)
            .map(this.evaluateFitness)
            .sort(sortFitness);
        return mature.length ? mature[mature.length - 1] : undefined;
    }

    public get midpoint(): Vector3 {
        const gotchis = this.gotchis.getValue();
        return gotchis
            .map(gotchi => gotchi.fabric.midpoint)
            .reduce((prev, currentValue) => prev.add(currentValue), new Vector3())
            .multiplyScalar(1 / gotchis.length);
    }

    public get physics() {
        return this.physicsObject;
    }

    public applyPhysics() {
        this.gotchis.getValue().forEach(gotchi => gotchi.fabric.apply(this.physicsObject));
    }

    public iterate(): number[] {
        const maxAge = Math.max(...this.gotchis.getValue().map(gotchi => gotchi.age));
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
        let anyReborn = false;
        const reborn = this.gotchis.getValue().map(gotchi => {
            if (gotchi.rebornClone) {
                anyReborn = true;
                return gotchi.rebornClone;
            }
            return gotchi;
        });
        if (anyReborn) {
            this.gotchis.next(reborn);
        }
        const offspring: Gotchi[] = [];
        this.gotchis.getValue().forEach(gotchi => {
            if (gotchi.offspring) {
                offspring.push(gotchi);
                gotchi.offspring = undefined;
            }
        });
        if (offspring.length > 0) {
            this.gotchis.next(this.gotchis.getValue().concat(offspring));
        }
        let catchingUp = false;
        this.gotchis.getValue().forEach((gotchi, index, array) => {
            if (gotchi.frozen) {
                freeze(gotchi);
            } else {
                if (gotchi.getDistanceFrom(this.center) > this.frontier.getValue().radius) {
                    if (!array.find(g => g.frozen)) {
                        this.fittest = gotchi;
                        // todo: SAVE TO LOCAL STORAGE!
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
            }
        });
        if (this.toBeBorn > 0) {
            this.toBeBorn--;
            this.createRandomReplacement();
        } else if (frozenNotExpectingCount > this.gotchis.getValue().length / 2) {
            this.gotchis.getValue().forEach(gotchi => this.createReplacement(gotchi, true));
            if (minFrozenAge * 3 > maxFrozenAge * 2) {
                const expandedRadius = this.frontier.getValue().radius * FRONTIER_EXPANSION;
                this.frontier.next({
                    radius: expandedRadius,
                    center: this.center
                });
                this.mutationCount--;
                console.log(`fontier = ${expandedRadius}, mutations = ${this.mutationCount}`);
            }
        }
        return this.gotchis.getValue().map(gotchi => {
            if (gotchi.frozen) {
                return 0;
            }
            return gotchi.iterate(catchingUp ? NORMAL_TICKS / 3 : NORMAL_TICKS);
        });
    }

    public findGotchi(raycaster: Raycaster): Gotchi | undefined {
        return this.gotchis.getValue()
            .filter(gotchi => gotchi.facesMeshNode)
            .find(gotchi => raycaster.intersectObject(gotchi.facesMeshNode).length > 0);
    }

    public dispose() {
        const array = this.gotchis.getValue();
        // todo: review this
        array.forEach(gotchi => gotchi.fabric.dispose());
    }

    // Privates =============================================================

    private createReplacement(gotchi: Gotchi, clone: boolean): void {
        gotchi.expecting = true;
        const grow = !clone && gotchi.frozen && Math.random() < CHANCE_OF_GROWTH;
        if (grow) {
            console.log('grow!');
        }
        this.factory
            .createGotchiAt(this.coords.x, this.coords.y, gotchi.fabric.jointCountMax + (grow ? 4 : 0), new Genome(gotchi.genomeData))
            .then(freshGotchi => {
                gotchi.expecting = false;
                if (clone) {
                    gotchi.rebornClone = freshGotchi;
                } else {
                    freshGotchi.mutateBehavior(this.mutationCount);
                    gotchi.offspring = freshGotchi;
                }
            });
    }

    private createRandomReplacement() {
        while (this.gotchis.getValue().length + 1 > MAX_POPULATION) {
            if (!this.death()) {
                console.log('death failed');
                break;
            }
        }
        const fertile = this.gotchis.getValue().filter(gotchi => !gotchi.catchingUp);
        if (fertile.length) {
            const luckyOne = fertile[Math.floor(fertile.length * Math.random())];
            this.createReplacement(luckyOne, false);
        }
    }

    private death(): boolean {
        const gotchis = this.gotchis.getValue();
        if (gotchis.length > 0) {
            const fitness = gotchis.map(this.evaluateFitness);
            fitness.sort(sortFitness);
            const mature = fitness.filter(f => !f.gotchi.catchingUp);
            if (mature.length) {
                const deadIndex = mature[0].index;
                const dead = gotchis[deadIndex];
                dead.fabric.dispose();
                this.gotchis.next(gotchis.filter((gotchi, index) => index !== deadIndex));
                return true;
            } else {
                console.log('no mature gotchis to kill!')
            }
        }
        return false;
    }

    private evaluateFitness = (gotchi: Gotchi, index: number): IGotchiFitness => {
        return {gotchi, index, distance: gotchi.getDistanceFrom(this.center), age: gotchi.age};
    };
}