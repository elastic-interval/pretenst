import {IGeneExecution, IGenomeExecution} from './genome';
import {Fabric} from '../gotchi/fabric';

export class GenomeExecution implements IGenomeExecution {

    constructor(
        private fabric: Fabric,
        private growth?: IGeneExecution,
        private behavior?: IGeneExecution
    ) {
    }

    public get hanging(): boolean {
        return !!this.growth;
    }

    public step(): boolean {
        if (this.growth) {
            const ok = this.growth.step();
            if (!ok) {
                this.growth = undefined;
                this.fabric.removeHanger();
            }
            return true;
        } else if (this.behavior) {
            const ok = this.behavior.step();
            if (!ok) {
                this.behavior = undefined;
            }
            return true;
        } else {
            return false;
        }
    }
}