import {Fabric, ROLES_RESERVED} from '../body/fabric';
import {Behavior} from '../genetics/behavior';
import {Genome} from '../genetics/genome';
import {Embryology} from '../genetics/embryology';
import {BufferGeometry} from 'three';

export class Gotchi {
    private embryology?: Embryology;
    private behavior: Behavior;

    constructor(private fabric: Fabric, private genome: Genome) {
        this.embryology = genome.embryology(fabric);
        this.behavior = genome.behavior(fabric);
    }

    public iterate(ticks: number, hanging: boolean): number {
        return this.fabric.iterate(ticks, hanging);
    }

    public centralize(altitude: number, intensity: number): number {
        return this.fabric.centralize(altitude, intensity);
    }

    public get facesGeometry(): BufferGeometry {
        return this.fabric.facesGeometry;
    }

    public get lineSegmentsGeometry(): BufferGeometry {
        return this.fabric.lineSegmentsGeometry;
    }

    public withNewFabric(fabric: Fabric): Gotchi {
        return new Gotchi(fabric, this.genome);
    }

    public get growing(): boolean {
        return !!this.embryology;
    }

    public embryoStep(): boolean {
        if (this.embryology) {
            const successful = this.embryology.step();
            if (!successful) {
                this.embryology = undefined;
                this.behavior.fillRoles();
            }
            return successful;
        } else {
            return false;
        }
    }

    public removeHanger() {
        this.fabric.removeHanger();
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