import {Fabric} from '../body/fabric';
import {Behavior} from '../genetics/behavior';
import {Genome} from '../genetics/genome';
import {Embryology} from '../genetics/embryology';
import {BufferGeometry, Vector3} from 'three';

const HANG_DELAY = 6000;
const REST_DELAY = 4000;

export class Gotchi {
    public frozen = false;
    public replacementExpected = false;
    public clone = false;
    public replacement: Gotchi | null;
    private embryology?: Embryology;
    private behavior: Behavior;
    private hangingCountdown = HANG_DELAY;
    private restCountdown = REST_DELAY;
    private mature = false;

    constructor(private fabric: Fabric, private genome: Genome) {
        this.embryology = genome.embryology(fabric);
        this.behavior = genome.behavior(fabric);
    }

    public get age() {
        return this.fabric.age;
    }

    public dispose() {
        this.fabric.dispose();
    }

    public withNewBody(fabric: Fabric): Gotchi {
        return new Gotchi(fabric, this.genome);
    }

    public mutateBehavior(mutations: number): void {
        this.genome = this.genome.withMutatedBehavior(mutations);
    }

    public get midpoint(): Vector3 {
        return this.fabric.midpoint;
    }

    public get facesGeometry(): BufferGeometry {
        return this.fabric.facesGeometry;
    }

    public get lineSegmentsGeometry(): BufferGeometry {
        return this.fabric.lineSegmentsGeometry;
    }

    public iterate(ticks: number): number {
        if (this.frozen) {
            return 0;
        }
        const maxTimeSweep = this.fabric.iterate(ticks, this.hangingCountdown > 0);
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
                } else if (this.restCountdown > 0) {
                    this.restCountdown -= ticks;
                } else {
                    this.fabric.centralize(0, 1);
                    this.behavior.apply();
                    this.triggerAllIntervals();
                    this.mature = true;
                }
            }
        }
        return maxTimeSweep;
    }

    public centralize(altitude: number, intensity: number): number {
        return this.fabric.centralize(altitude, intensity);
    }

    public get growing(): boolean {
        return !!this.embryology;
    }

    public triggerAllIntervals() {
        for (let intervalIndex = 0; intervalIndex < this.fabric.intervalCount; intervalIndex++) {
            this.fabric.triggerInterval(intervalIndex);
        }
    }

    public get genomeString(): string {
        return [this.genome.behaviorData.join(','), this.genome.behaviorData.join(',')].join(';')
    }
}