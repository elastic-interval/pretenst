import {Fabric} from './fabric';
import {GeneSequence} from './gene-sequence';
import {IGeneExecution} from './genome';

export class Behavior implements IGeneExecution {

    constructor(private fabric: Fabric, private behaviorGene: GeneSequence) {
    }

    public step(): boolean {
        if (this.fabric.intervalCount) {
            this.behaviorGene.next();
        }
        return false;
    }
}