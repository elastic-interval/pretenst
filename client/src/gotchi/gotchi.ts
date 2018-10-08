import {Fabric, HANGING_DELAY} from '../body/fabric';
import {Behavior} from '../genetics/behavior';
import {Genome, IGenomeData} from '../genetics/genome';
import {Embryology} from '../genetics/embryology';
import {Vector3} from 'three';
import {Direction} from '../body/fabric-exports';

export interface IGotchiFactory {
    createGotchiAt(location: Vector3, jointCountMax: number, genome: Genome): Promise<Gotchi>;
}

const GEAR_UP = 0.0002;

export class Gotchi {
    public frozen = false;
    public clicked = false;
    public catchingUp = false;
    public facesMeshNode: any;
    public nextDirection: Direction = Direction.REST;
    private currentDirection: Direction = Direction.REST;
    private intensity = 1;
    private clutch = false;
    private embryology?: Embryology;
    private behavior: Behavior;
    private hangingCountdown: number;
    private mature = false;

    constructor(public fabric: Fabric, private genome: Genome) {
        this.embryology = genome.embryology(fabric);
        this.behavior = genome.behavior(fabric);
        this.hangingCountdown = HANGING_DELAY;
    }

    public get master() {
        return this.genome.master;
    }

    public get age() {
        return this.fabric.age;
    }

    public getDistanceFrom(location: Vector3) {
        if (this.fabric.age === 0) {
            throw new Error('Zero age midpoint!');
        }
        const midpoint = this.fabric.midpoint.sub(location);
        return Math.sqrt(midpoint.x * midpoint.x + midpoint.z * midpoint.z);
    }

    public withNewBody(fabric: Fabric): Gotchi {
        return new Gotchi(fabric, this.genome);
    }

    public withMutatedBehavior(mutations: number): Gotchi {
        this.genome = this.genome.withMutatedBehavior(mutations);
        return this;
    }

    public get genomeData(): IGenomeData {
        return this.genome.data;
    }

    public iterate(ticks: number): number {
        const changeClutch = () => {
            const intensity = this.intensity + ticks * (this.clutch ? -GEAR_UP : GEAR_UP);
            if (intensity > 1) {
                this.intensity = 1;
            } else if (intensity < 0) {
                this.intensity = 0;
                this.currentDirection = this.nextDirection;
                this.clutch = false;
            } else {
                this.intensity = intensity;
            }
        };
        const maxTimeSweep = this.fabric.iterate(ticks, this.currentDirection, this.intensity, this.hangingCountdown > 0);
        if (this.nextDirection !== this.currentDirection && !this.clutch) {
            this.clutch = true;
            changeClutch(); // so intensity < 1, engage
        }
        if (this.intensity < 1) {
            changeClutch();
        }
        if (maxTimeSweep === 0) {
            if (this.mature) {
                this.triggerAllIntervals();
            } else {
                if (this.embryology) {
                    const successful = this.embryology.step();
                    if (!successful) {
                        this.embryology = undefined;
                    }
                } else if (this.hangingCountdown > 0) {
                    this.hangingCountdown -= ticks;
                    if (this.hangingCountdown <= 0) {
                        this.fabric.removeHanger();
                    }
                } else {
                    this.behavior.apply();
                    this.triggerAllIntervals();
                    this.mature = true;
                }
            }
        }
        return maxTimeSweep;
    }

    public get growing(): boolean {
        return !!this.embryology;
    }

    public triggerAllIntervals() {
        for (let intervalIndex = 0; intervalIndex < this.fabric.intervalCount; intervalIndex++) {
            this.fabric.triggerInterval(intervalIndex);
        }
    }
}