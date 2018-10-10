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
const MAX_POPULATION = 16;
const INITIAL_MUTATION_COUNT = 20;
const CHANCE_OF_GROWTH = 0.1;
// const MINIMUM_AGE = 10000;
const MAXIMUM_AGE = 60000;

export class Evolution {
    public visibleGotchis: BehaviorSubject<Gotchi[]> = new BehaviorSubject<Gotchi[]>([]);
    public fittest?: Gotchi;
    private mutationCount = INITIAL_MUTATION_COUNT;
    private fitness: Fitness;
    private birthing = 0;

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
        Promise.all(promisedGotchis).then(gotchis => {
            gotchis.forEach(gotchi => gotchi.nextDirection = Direction.AHEAD);
            this.visibleGotchis.next(gotchis);
        });
    }

    public get fastest(): IGotchiFitness | undefined {
        const mature = this.fitness.rank(this.gotchis.filter(gotchi => !gotchi.catchingUp));
        return mature.length ? mature[mature.length - 1] : undefined;
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

    public iterate(): number[] {
        const gotchis = this.gotchis;
        if (gotchis.length === 0) {
            return [];
        }
        const maxAge = Math.max(...gotchis.map(gotchi => gotchi.age));
        let frozenCount = 0;
        const adultGotchis = gotchis.filter(gotchi => {
            if (gotchi.frozen) {
                frozenCount++;
                return true;
            }
            const youngerByTicks = (maxAge - gotchi.age) / NORMAL_TICKS;
            const catchUpTicks = youngerByTicks > 3 ? 3 : youngerByTicks;
            gotchi.catchingUp = catchUpTicks > 0;
            if (gotchi.catchingUp) {
                gotchi.iterate(NORMAL_TICKS * catchUpTicks);
            }
            return !gotchi.catchingUp;
        });
        if (maxAge > MAXIMUM_AGE || frozenCount > gotchis.length / 2) {
            console.log(`maxAge=${maxAge} frozenCount=${frozenCount}`);
            this.saveStrongest(adultGotchis);
            this.rebootAll(frozenCount === 0);
        }
        while (gotchis.length + this.birthing < MAX_POPULATION) {
            this.birthing++;
            console.log('towards max pop', this.birthing, adultGotchis.length);
            const offspring = this.createRandomOffspring(adultGotchis.concat(adultGotchis.filter(g => g.frozen)));
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
        return this.gotchis.map(gotchi => {
            if (gotchi.frozen) {
                return 0;
            }
            if (this.fitness.shouldFreeze(gotchi)) {
                gotchi.frozen = true;
                this.killWeakest(adultGotchis);
            }
            return gotchi.iterate(NORMAL_TICKS);
        });
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

    private saveStrongest(matureGotchis: Gotchi[]) {
        const ranked = this.fitness.rank(matureGotchis);
        const strongest = ranked[0];
        if (strongest) {
            const fingerprint = this.gotch.createFingerprint();
            console.log(`Saving the strongest ${fingerprint}`);
            localStorage.setItem(fingerprint, JSON.stringify(strongest.gotchi.genomeData));
        }
    }

    private rebootAll(killHalf: boolean) {
        const ranked = this.fitness.rank(this.gotchis);
        if (killHalf) {
            console.log(JSON.stringify(ranked.map(f => f.distance), null, 2));
            ranked.splice(ranked.length / 2);
            console.log(JSON.stringify(ranked.map(f => f.distance), null, 2));
        }
        const promisedOffspring: Array<Promise<Gotchi>> = [];
        ranked.map(f => f.gotchi).forEach(gotchi => {
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
            this.birthing -= offspring.length;
        });
    }

    private killWeakest(matureGotchis: Gotchi[]) {
        const ranked = this.fitness.rank(matureGotchis);
        const weakest = ranked.pop();
        if (weakest) {
            weakest.gotchi.dispose();
            this.visibleGotchis.next(this.gotchis.filter((gotchi, index) => index !== weakest.index));
            return true;
        }
        return false;
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

    private createRandomOffspring(adultGotchis: Gotchi[]): Promise<Gotchi> | undefined {
        if (adultGotchis.length) {
            console.log('adults', adultGotchis.length);
            const luckyOne = adultGotchis[Math.floor(adultGotchis.length * Math.random())];
            return this.createOffspring(luckyOne, false);
        }
        console.warn('no adults!');
        return undefined;
    }

    private get gotchis(): Gotchi[] {
        return this.visibleGotchis.getValue();
    }

}