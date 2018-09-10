import {Fabric, ROLES_RESERVED} from '../body/fabric';
import {Behavior} from '../genetics/behavior';
import {Genome} from '../genetics/genome';
import {Embryology} from '../genetics/embryology';
import {BufferGeometry} from 'three';

const HANG_DELAY = 7000;

export class Gotchi {
    private embryology?: Embryology;
    private behavior: Behavior;
    private hangingCountdown = HANG_DELAY;

    constructor(private fabric: Fabric, private genome: Genome) {
        this.embryology = genome.embryology(fabric);
        this.behavior = genome.behavior(fabric);
    }

    public withNewFabric(fabric: Fabric): Gotchi {
        return new Gotchi(fabric, this.genome);
    }

    public get facesGeometry(): BufferGeometry {
        return this.fabric.facesGeometry;
    }

    public get lineSegmentsGeometry(): BufferGeometry {
        return this.fabric.lineSegmentsGeometry;
    }

    public iterate(ticks: number): number {
        if (!this.embryology && this.hangingCountdown > 0) {
            this.hangingCountdown -= ticks;
            if (this.hangingCountdown <= 0) {
                this.fabric.removeHanger();
            }
        }
        const maxTimeSweep = this.fabric.iterate(ticks, this.hangingCountdown > 0);
        if (maxTimeSweep === 0) {
            if (this.embryology) {
                const successful = this.embryology.step();
                if (!successful) {
                    this.embryology = undefined;
                    this.behavior.fillRoles();
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

    public attachRoleToIntervalPair() {
        if (this.behavior) {
            this.behavior.attachRoleToIntervalPair();
        }
    }

    public triggerAllRoles() {
        for (let roleIndex = ROLES_RESERVED; roleIndex < this.fabric.roleCount; roleIndex++) {
            this.fabric.triggerRole(roleIndex);
        }
    }

    public get genomeString(): string {
        return [this.genome.behaviorData.join(','),this.genome.behaviorData.join(',')].join(';')
    }

}