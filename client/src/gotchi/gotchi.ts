import {Fabric} from '../body/fabric';
import {Behavior} from '../genetics/behavior';
import {Genome} from '../genetics/genome';
import {Embryology} from '../genetics/embryology';

export class Gotchi {
    private embryology?: Embryology;
    private behavior: Behavior;

    constructor(public fabric: Fabric, private genome: Genome) {
        this.embryology = genome.embryology(fabric);
        this.behavior = genome.behavior(fabric);
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

    public attachRoleToIntervalPair() {
        if (this.behavior) {
            this.behavior.attachRoleToIntervalPair();
        }
    }

    public get genomeString(): string {
        return [this.genome.behaviorData.join(','),this.genome.behaviorData.join(',')].join(';')
    }
}