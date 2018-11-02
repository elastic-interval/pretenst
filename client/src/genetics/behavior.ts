import {GeneReader} from './gene-reader';
import {Fabric, INTERVALS_RESERVED} from '../body/fabric';
import {Direction} from '../body/fabric-exports';

export class Behavior {
    constructor(private fabric: Fabric, private direction: Direction, private behaviorGene: GeneReader) {
    }

    public apply() {
        for (let intervalIndex = INTERVALS_RESERVED; intervalIndex < this.fabric.intervalCount; intervalIndex++) {
            const highLow = this.behaviorGene.nextChoice(256);
            // console.log(`I[${intervalIndex}][${this.direction}] = ${highLow}`);
            this.fabric.setIntervalHighLow(intervalIndex, this.direction, highLow);
        }
    }
}