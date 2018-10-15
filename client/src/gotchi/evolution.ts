import {Gotchi} from './gotchi';
import {NORMAL_TICKS} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Raycaster, Vector3} from 'three';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Gotch} from '../island/gotch';
import {Direction} from '../body/fabric-exports';
import {Fitness, IGotchiFitness} from './fitness';
import {Spot} from '../island/spot';

export const INITIAL_JOINT_COUNT = 47;
const MAX_POPULATION = 24;
const INITIAL_MUTATION_COUNT = 20;
const CHANCE_OF_GROWTH = 0.1;
const MINIMUM_AGE = 15000;
const MAXIMUM_AGE = 40000;
const INCREASE_AGE_LIMIT = 1000;

export class Evolution {
    public visibleGotchis: BehaviorSubject<Gotchi[]> = new BehaviorSubject<Gotchi[]>([]);
    public fittest?: Gotchi;
    private mutationCount = INITIAL_MUTATION_COUNT;
    private fitness: Fitness;
    private birthing = 0;
    private ageLimit = MINIMUM_AGE;

    constructor(private gotch: Gotch, targetSpot: Spot) {
        this.fitness = new Fitness(targetSpot.center);
        let mutatingGenome = gotch.genome;
        const promisedGotchis: Array<Promise<Gotchi>> = [];
        for (let walk = 0; walk < MAX_POPULATION && mutatingGenome; walk++) {
            const promisedGotchi = this.gotch.createGotchi(INITIAL_JOINT_COUNT, mutatingGenome);
            if (promisedGotchi) {
                promisedGotchis.push(promisedGotchi);
            }
            mutatingGenome = mutatingGenome.withMutatedBehavior(INITIAL_MUTATION_COUNT / 5);
        }
        this.birthing = MAX_POPULATION;
        Promise.all(promisedGotchis).then(gotchis => {
            gotchis.forEach(gotchi => gotchi.nextDirection = Direction.AHEAD);
            this.birthing = 0;
            this.visibleGotchis.next(gotchis);
        });
    }

    public get midpoint(): Vector3 {
        const gotchis = this.gotchis;
        if (gotchis.length === 0) {
            return this.gotch.center;
        }
        return gotchis
            .map(gotchi => gotchi.fabric.midpoint)
            .reduce((prev, array) => {
                prev.x += array[0];
                prev.y += array[1];
                prev.z += array[2];
                return prev;
            }, new Vector3())
            .multiplyScalar(1 / gotchis.length);
    }

    public iterate(): void {
        const gotchis = this.gotchis;
        let frozenCount = 0;
        const active = gotchis.filter(gotchi => {
            if (gotchi.frozen || this.fitness.touchedDestination(gotchi)) {
                gotchi.frozen = true;
                frozenCount++;
                return false;
            }
            return gotchi.age < this.ageLimit;
        });
        if (active.length === 0) {
            for (let count = this.ageLimit / MINIMUM_AGE; count > 0; count -= 1) {
                const toDie = this.weakest();
                if (toDie) {
                    this.kill(toDie);
                }
            }
            this.ageLimit += INCREASE_AGE_LIMIT;
        } else if (active.length < gotchis.length) {
            const ticks = NORMAL_TICKS * 10;
            active.forEach(gotchi => {
                const behind = this.ageLimit - gotchi.age;
                gotchi.iterate(behind > ticks ? ticks : behind);
            });
        } else {
            const ticks = NORMAL_TICKS;
            active.forEach(gotchi => {
                const behind = this.ageLimit - gotchi.age;
                gotchi.iterate(behind > ticks ? ticks : behind);
            });
        }
        if (frozenCount > gotchis.length / 2 || this.ageLimit >= MAXIMUM_AGE) {
            console.log(`frozenCount=${frozenCount}`);
            gotchis.forEach(gotchi => gotchi.frozen = true);
            const toSave = this.strongest();
            if (toSave) {
                this.save(toSave.gotchi);
            }
            this.rebootAll();
        }
        if (gotchis.length + this.birthing < MAX_POPULATION) {
            this.birthing++;
            console.log('towards max pop', this.birthing);
            const offspring = this.createRandomOffspring(gotchis.concat(gotchis.filter(g => g.frozen)));
            if (offspring) {
                offspring.then(gotchi => {
                    this.birthing--;
                    console.log('birth', this.birthing, this.gotchis.length + 1);
                    this.visibleGotchis.next(this.gotchis.concat([gotchi]));
                });
            } else {
                console.warn('no offspring');
            }
        }
    }

    public findGotchi(raycaster: Raycaster): Gotchi | undefined {
        return this.visibleGotchis.getValue()
            .filter(gotchi => gotchi.facesMeshNode)
            .find(gotchi => raycaster.intersectObject(gotchi.facesMeshNode).length > 0);
    }

    public dispose() {
        this.gotchis.forEach(gotchi => gotchi.dispose());
    }

    // Privates =============================================================

    private strongest(): IGotchiFitness | undefined {
        const ranked = this.fitness.rank(this.gotchis);
        return ranked[0];
    }

    private weakest(): IGotchiFitness | undefined {
        const ranked = this.fitness.rank(this.gotchis);
        return ranked.pop();
    }

    private save(gotchi: Gotchi) {
        const fingerprint = this.gotch.createFingerprint();
        console.log(`Saving the strongest ${fingerprint}`);
        localStorage.setItem(fingerprint, JSON.stringify(gotchi.genomeData));
    }

    private kill(fitness: IGotchiFitness) {
        fitness.gotchi.dispose();
        this.visibleGotchis.next(this.gotchis.filter((gotchi, index) => index !== fitness.index));
    }

    private rebootAll() {
        const promisedOffspring: Array<Promise<Gotchi>> = [];
        this.gotchis.forEach(gotchi => {
            const offspring = this.createOffspring(gotchi, true);
            if (offspring) {
                promisedOffspring.push(offspring);
            }
        });
        this.birthing = promisedOffspring.length;
        this.dispose();
        this.visibleGotchis.next([]);
        Promise.all(promisedOffspring).then(offspring => {
            this.visibleGotchis.next(offspring);
            this.birthing = 0;
            this.ageLimit = MINIMUM_AGE;
        });
    }

    private createOffspring(parent: Gotchi, clone: boolean): Promise<Gotchi> | undefined {
        const grow = !clone && Math.random() < CHANCE_OF_GROWTH;
        if (grow) {
            console.log('grow!');
        }
        const promisedGotchi = this.gotch.createGotchi(
            parent.fabric.jointCountMax + (grow ? 4 : 0),
            new Genome(parent.genomeData)
        );
        if (!promisedGotchi) {
            return undefined;
        }
        return promisedGotchi.then(child => {
            child.nextDirection = Direction.AHEAD;
            return clone ? child : child.withMutatedBehavior(this.mutationCount)
        });
    }

    private createRandomOffspring(gotchis: Gotchi[]): Promise<Gotchi> | undefined {
        if (gotchis.length) {
            console.log('adults', gotchis.length);
            const luckyOne = gotchis[Math.floor(gotchis.length * Math.random())];
            return this.createOffspring(luckyOne, false);
        }
        console.warn('no adults!');
        return undefined;
    }

    private get gotchis(): Gotchi[] {
        return this.visibleGotchis.getValue();
    }

}