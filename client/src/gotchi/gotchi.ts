import {Fabric} from '../body/fabric';
import {Genome, IGenomeData} from '../genetics/genome';
import {Growth} from '../genetics/growth';
import {Vector3} from 'three';
import {ITravel} from '../island/trip';
import {Direction} from '../body/fabric-exports';

export interface IGotchiFactory {
    createGotchiAt(location: Vector3, jointCountMax: number, genome: Genome): Promise<Gotchi>;
}

export class Gotchi {
    public facesMeshNode: any;
    public travel?: ITravel;
    private growth?: Growth;
    private growthFinished = false;

    constructor(public fabric: Fabric, private genome: Genome) {
        this.growth = genome.growth(fabric);
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

    public withMutatedBehavior(direction: Direction, mutations: number): Gotchi {
        this.genome = this.genome.withMutatedBehavior(direction, mutations);
        return this;
    }

    public get genomeData(): IGenomeData {
        return this.genome.data;
    }

    public get direction(): Direction {
        return this.fabric.direction;
    }

    public set direction(direction: Direction) {
        this.fabric.direction = direction;
    }

    public iterate(ticks: number): boolean {
        const wrapAround = this.fabric.iterate(ticks);
        if (wrapAround && !this.growthFinished) {
            if (this.growth) {
                const successful = this.growth.step();
                if (!successful) {
                    this.growth = undefined;
                }
            } else {
                for (let direction=Direction.FORWARD; direction <= Direction.REVERSE; direction++) {
                    this.genome.behavior(this.fabric, direction).apply();
                }
                this.growthFinished = true;
                this.fabric.endGestation();
            }
        }
        return !!this.growth;
    }

    public get growing(): boolean {
        return !!this.growth;
    }

    public dispose() {
        this.fabric.disposeOfGeometry();
    }
}