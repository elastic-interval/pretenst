import {Fabric, ROLES_RESERVED} from '../body/fabric';
import {Behavior} from '../genetics/behavior';
import {Genome} from '../genetics/genome';
import {Embryology} from '../genetics/embryology';
import {BufferGeometry, Vector3} from 'three';

const HANG_DELAY = 4000;
const REST_DELAY = 3000;

export class Gotchi {
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
        const maxTimeSweep = this.fabric.iterate(ticks, this.hangingCountdown > 0);
        if (maxTimeSweep === 0) {
            if (this.mature) {
                this.triggerAllRoles();
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
                    this.behavior.apply();
                    this.triggerAllRoles();
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

    public triggerAllRoles() {
        for (let roleIndex = ROLES_RESERVED; roleIndex < this.fabric.roleCount; roleIndex++) {
            this.fabric.triggerRole(roleIndex);
        }
    }

    public get genomeString(): string {
        return [this.genome.behaviorData.join(','), this.genome.behaviorData.join(',')].join(';')
    }

}