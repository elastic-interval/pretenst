import {Fabric, HANGING_DELAY} from '../body/fabric';
import {Genome, IGenomeData} from '../genetics/genome';
import {Growth} from '../genetics/growth';
import {Vector3} from 'three';
import {Direction} from '../body/fabric-exports';
import {ITravel} from '../island/trip';

export interface IGotchiFactory {
    createGotchiAt(location: Vector3, jointCountMax: number, genome: Genome): Promise<Gotchi>;
}

const GEAR_UP = 0.00025;

export class Gotchi {
    public facesMeshNode: any;
    public travel?: ITravel;
    public nextDirection: Direction = Direction.REST;
    private currentDirection: Direction = Direction.REST;
    private intensity = 1;
    private clutch = false;
    private growth?: Growth;
    private hangingCountdown: number;
    private growthFinished = false;

    constructor(public fabric: Fabric, private genome: Genome) {
        this.growth = genome.growth(fabric);
        this.hangingCountdown = HANGING_DELAY;
    }

    public get master() {
        return this.genome.master;
    }

    public get age(): number {
        return this.fabric.age;
    }

    public get isGestating(): boolean {
        return this.fabric.isGestating;
    }

    public getDistanceFrom(location: Vector3) {
        const xx = this.fabric.vectors[0] - location.x;
        const zz = this.fabric.vectors[2] - location.z;
        return Math.sqrt(xx * xx + zz * zz);
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
        const timePassing = !(this.clutch || this.isGestating);
        const maxTimeSweep = this.fabric.iterate(ticks, this.currentDirection, this.intensity, timePassing);
        if (this.nextDirection !== this.currentDirection && !this.clutch) {
            this.clutch = true;
            changeClutch(); // so intensity < 1, engage
        }
        if (this.intensity < 1) {
            changeClutch();
        }
        if (maxTimeSweep === 0) {
            if (this.growthFinished) {
                this.triggerAllIntervals();
            } else {
                if (this.growth) {
                    const successful = this.growth.step();
                    if (!successful) {
                        this.growth = undefined;
                    }
                } else if (this.hangingCountdown > 0) {
                    this.hangingCountdown -= ticks;
                    if (this.hangingCountdown <= 0) {
                        this.fabric.removeHanger();
                    }
                } else {
                    this.genome.applyBehavior(this.fabric);
                    this.growthFinished = true;
                }
            }
        }
        return maxTimeSweep;
    }

    public get growing(): boolean {
        return !!this.growth;
    }

    public triggerAllIntervals() {
        for (let intervalIndex = 0; intervalIndex < this.fabric.intervalCount; intervalIndex++) {
            this.fabric.triggerInterval(intervalIndex);
        }
    }

    public dispose() {
        this.fabric.disposeOfGeometry();
    }
}