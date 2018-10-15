import {Gotchi} from './gotchi';
import {NORMAL_TICKS} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Raycaster, Vector3} from 'three';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Gotch} from '../island/gotch';
import {Direction} from '../body/fabric-exports';
import {Spot} from '../island/spot';
import {Evolver} from './evolver';

export const INITIAL_JOINT_COUNT = 47;
const MAX_POPULATION = 12;
const INITIAL_MUTATION_COUNT = 20;
const CHANCE_OF_GROWTH = 0.1;
const MINIMUM_AGE = 15000;
const MAXIMUM_AGE = 40000;
const INCREASE_AGE_LIMIT = 1000;

export class Evolution {
    public evolversNow: BehaviorSubject<Evolver[]> = new BehaviorSubject<Evolver[]>([]);
    private mutationCount = INITIAL_MUTATION_COUNT;
    private evolverId = 0;
    private target: Vector3;
    private birthing = 0;
    private ageLimit = MINIMUM_AGE;

    constructor(private gotch: Gotch, targetSpot: Spot) {
        this.target = targetSpot.center;
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
            this.birthing = 0;
            this.evolversNow.next(gotchis.map(gotchi => {
                gotchi.nextDirection = Direction.AHEAD;
                return this.gotchiToEvolver(gotchi);
            }));
        });
    }

    public get midpoint(): Vector3 {
        const evolvers = this.evolversNow.getValue();
        if (evolvers.length === 0) {
            return this.gotch.center;
        }
        return evolvers
            .map(evolver => evolver.gotchi.fabric.midpoint)
            .reduce((prev, array) => {
                prev.x += array[0];
                prev.y += array[1];
                prev.z += array[2];
                return prev;
            }, new Vector3())
            .multiplyScalar(1 / evolvers.length);
    }

    public iterate(): void {
        const evolvers = this.evolversNow.getValue();
        let frozenCount = 0;
        const activeEvolvers = evolvers.filter(evolver => {
            if (evolver.frozen || evolver.touchedDestination) {
                evolver.frozen = true;
                frozenCount++;
                return false;
            }
            return evolver.gotchi.age < this.ageLimit;
        });
        if (frozenCount > evolvers.length / 2 || this.ageLimit >= MAXIMUM_AGE) {
            console.log(`frozenCount=${frozenCount}`);
            this.ageLimit = MINIMUM_AGE;
            evolvers.forEach(gotchi => gotchi.frozen = true);
            const toSave = this.strongest();
            if (toSave) {
                this.save(toSave.gotchi);
            }
            this.rebootAll();
        }
        else if (activeEvolvers.length === 0) {
            for (let count = this.ageLimit / MINIMUM_AGE; count > 0; count -= 1) {
                const toDie = this.weakest();
                if (toDie) {
                    this.kill(toDie);
                }
            }
            this.ageLimit += INCREASE_AGE_LIMIT;
        } else if (activeEvolvers.length < evolvers.length) {
            const ticks = NORMAL_TICKS * 10;
            activeEvolvers.forEach(activeEvolver => {
                const behind = this.ageLimit - activeEvolver.gotchi.age;
                activeEvolver.gotchi.iterate(behind > ticks ? ticks : behind);
            });
        } else {
            const ticks = NORMAL_TICKS;
            activeEvolvers.forEach(activeEvolver => {
                const behind = this.ageLimit - activeEvolver.gotchi.age;
                activeEvolver.gotchi.iterate(behind > ticks ? ticks : behind);
            });
        }
        if (evolvers.length > 0 && evolvers.length + this.birthing < MAX_POPULATION) {
            console.log(`Birth because ${evolvers.length} + ${this.birthing} < ${MAX_POPULATION}`, this.birthing);
            const offspring = this.createRandomOffspring(evolvers.concat(evolvers.filter(g => g.frozen)));
            if (offspring) {
                this.birthing++;
                offspring.then(gotchi => {
                    this.birthing--;
                    console.log('birth', this.birthing, this.evolversNow.getValue().length + 1);
                    this.evolversNow.next(this.evolversNow.getValue().concat([this.gotchiToEvolver(gotchi)]));
                });
            } else {
                console.warn('no offspring');
            }
        }
    }

    public findGotchi(raycaster: Raycaster): Evolver | undefined {
        return this.evolversNow.getValue()
            .filter(evolver => evolver.gotchi.facesMeshNode)
            .find(evolver => raycaster.intersectObject(evolver.gotchi.facesMeshNode).length > 0);
    }

    public dispose() {
        this.evolversNow.getValue().forEach(evolver => evolver.gotchi.dispose());
    }

    // Privates =============================================================

    private get ranked(): Evolver[] {
        const evolvers = this.evolversNow.getValue();
        evolvers.forEach(e => e.calculateFitness());
        return evolvers.sort((a,b) => b.fitness - a.fitness);
    }

    private strongest(): Evolver | undefined {
        return this.ranked[0];
    }

    private weakest(): Evolver | undefined {
        return this.ranked.pop();
    }

    private save(gotchi: Gotchi) {
        const fingerprint = this.gotch.createFingerprint();
        console.log(`Saving the strongest ${fingerprint}`);
        localStorage.setItem(fingerprint, JSON.stringify(gotchi.genomeData));
    }

    private kill(deadEvolver: Evolver) {
        deadEvolver.gotchi.dispose();
        this.evolversNow.next(this.evolversNow.getValue().filter(evolver => evolver.id !== deadEvolver.id));
    }

    private rebootAll() {
        const promisedOffspring: Array<Promise<Gotchi>> = [];
        this.evolversNow.getValue().forEach(evolver => {
            const offspring = this.createOffspring(evolver.gotchi, true);
            if (offspring) {
                promisedOffspring.push(offspring);
            }
        });
        this.birthing = promisedOffspring.length;
        this.dispose();
        this.evolversNow.next([]);
        console.log(`reboot birthing=${this.birthing} evolvers=${this.evolversNow.getValue().length}`);
        Promise.all(promisedOffspring).then(offspring => {
            this.evolversNow.next(offspring.map(off => this.gotchiToEvolver(off)));
            this.birthing -= promisedOffspring.length;
            console.log('rebirth done');
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
            console.log('stilborn!');
            return undefined;
        }
        return promisedGotchi.then(child => {
            child.nextDirection = Direction.AHEAD;
            return clone ? child : child.withMutatedBehavior(this.mutationCount)
        });
    }

    private createRandomOffspring(evolvers: Evolver[]): Promise<Gotchi> | undefined {
        if (evolvers.length) {
            const luckyOne = evolvers[Math.floor(evolvers.length * Math.random())];
            return this.createOffspring(luckyOne.gotchi, false);
        }
        return undefined;
    }

    private gotchiToEvolver = (gotchi: Gotchi): Evolver => {
        return new Evolver(this.evolverId++, gotchi, this.gotch.center, this.target);
    };
}