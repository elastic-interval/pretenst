import {Gotchi} from './gotchi';
import {NORMAL_TICKS} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Raycaster, Vector3} from 'three';
import {Gotch} from '../island/gotch';
import {Direction} from '../body/fabric-exports';
import {compareEvolvers, Evolver} from './evolver';
import {Trip} from '../island/trip';
import {BehaviorSubject} from 'rxjs/index';

export const INITIAL_JOINT_COUNT = 47;
const MAX_POPULATION = 16;
const INITIAL_MUTATION_COUNT = 14;
const CHANCE_OF_GROWTH = 0.1;
const MINIMUM_AGE = 15000;
const MAXIMUM_AGE = 50000;
const INCREASE_AGE_LIMIT = 1000;
const SURVIVAL_RATE = 0.85;

export class Evolution {
    public evolversNow: BehaviorSubject<Evolver[]> = new BehaviorSubject<Evolver[]>([]);
    private mutationCount = INITIAL_MUTATION_COUNT;
    private evolverId = 0;
    private evolversBeingBorn = 0;
    private ageLimit = MINIMUM_AGE;

    constructor(private gotch: Gotch, private trip: Trip) {
        let mutatingGenome = gotch.genome;
        const promisedGotchis: Array<Promise<Gotchi>> = [];
        for (let walk = 0; walk < MAX_POPULATION && mutatingGenome; walk++) {
            const promisedGotchi = this.gotch.createGotchi(INITIAL_JOINT_COUNT, mutatingGenome);
            if (promisedGotchi) {
                promisedGotchis.push(promisedGotchi);
            }
            mutatingGenome = mutatingGenome.withMutatedBehavior(INITIAL_MUTATION_COUNT / 5);
        }
        this.evolversBeingBorn = MAX_POPULATION;
        Promise.all(promisedGotchis).then(gotchis => {
            this.evolversBeingBorn = 0;
            this.evolversNow.next(gotchis.map(gotchi => {
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
            .map(evolver => evolver.gotchi.fabric.vectors)
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
        if (frozenCount > evolvers.length / 2 || (activeEvolvers.length === 0 && this.evolversBeingBorn === 0)) {
            this.rebootAll(SURVIVAL_RATE);
            this.ageLimit += INCREASE_AGE_LIMIT;
            if (this.ageLimit >= MAXIMUM_AGE) {
                this.ageLimit = MINIMUM_AGE;
                const toSave = this.strongest();
                if (toSave) {
                    this.save(toSave.gotchi);
                }
            }
        }
        activeEvolvers.forEach(activeEvolver => {
            const behind = this.ageLimit - activeEvolver.gotchi.age;
            activeEvolver.gotchi.iterate(behind > NORMAL_TICKS ? NORMAL_TICKS : behind);
        });
        activeEvolvers.forEach(activeEvolver => {
            if (activeEvolver.frozen || activeEvolver.gotchi.isGestating || activeEvolver.gotchi.age === 0) {
                return;
            }
            const gotchiDirection = activeEvolver.gotchi.direction;
            const chosenDirection = activeEvolver.voteDirection();
            if (chosenDirection !== undefined && gotchiDirection !== chosenDirection) {
                console.log(`${activeEvolver.id}: ${Direction[gotchiDirection]} ==> ${Direction[chosenDirection]}`);
                activeEvolver.gotchi.direction = chosenDirection;
            }
        });
        if (evolvers.length > 0 && evolvers.length + this.evolversBeingBorn < MAX_POPULATION) {
            console.log(`Birth ${evolvers.length} + ${this.evolversBeingBorn} < ${MAX_POPULATION}`, this.evolversBeingBorn);
            const offspring = this.createRandomOffspring(evolvers.concat(evolvers.filter(g => g.frozen)));
            if (offspring) {
                this.evolversBeingBorn++;
                offspring.then(gotchi => {
                    this.evolversBeingBorn--;
                    // console.log('birth', this.evolversBeingBorn, this.evolversNow.getValue().length + 1);
                    this.evolversNow.next(this.evolversNow.getValue().concat([this.gotchiToEvolver(gotchi)]));
                });
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
        return evolvers.sort(compareEvolvers);
    }

    private strongest(): Evolver | undefined {
        return this.ranked[0];
    }

    // private weakest(): Evolver | undefined {
    //     return this.ranked.pop();
    // }
    //
    // private kill(deadEvolver: Evolver) {
    //     deadEvolver.gotchi.dispose();
    //     this.evolversNow.next(this.evolversNow.getValue().filter(evolver => evolver.id !== deadEvolver.id));
    // }

    private save(gotchi: Gotchi) {
        const fingerprint = this.gotch.createFingerprint();
        console.log(`Saving the strongest ${fingerprint}`);
        localStorage.setItem(fingerprint, JSON.stringify(gotchi.genomeData));
    }

    private rebootAll(survivalRate: number) {
        const promisedOffspring: Array<Promise<Gotchi>> = [];
        const ranked = this.ranked;
        const deadEvolvers = ranked.splice(Math.ceil(ranked.length * survivalRate));
        console.log(`REBOOT: dead=${deadEvolvers.length} remaining=${ranked.length}`);
        deadEvolvers.forEach(evolver => evolver.gotchi.dispose());
        ranked.forEach(evolver => {
            const offspring = this.createOffspring(evolver.gotchi, true);
            if (offspring) {
                evolver.gotchi.dispose();
                promisedOffspring.push(offspring);
            }
        });
        this.evolversBeingBorn = promisedOffspring.length;
        this.evolversNow.next([]);
        Promise.all(promisedOffspring).then(offspring => {
            console.log(`survived=${offspring.length}`);
            this.evolversNow.next(offspring.map(off => this.gotchiToEvolver(off)));
            this.evolversBeingBorn -= promisedOffspring.length;
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
        const travel = this.trip.createTravel(0);
        return new Evolver(this.evolverId++, gotchi, travel);
    };
}
