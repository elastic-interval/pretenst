import {GeneSequence} from './gene-sequence';
import {Fabric, INTERVALS_RESERVED} from '../body/fabric';
import {Direction} from '../body/fabric-exports';

export class Behavior {

    constructor(private fabric: Fabric, private behaviorGene: GeneSequence) {
    }

    public apply(): void {
        const muscleCount = this.fabric.muscleCount;
        for (let muscleIndex = 0; muscleIndex < muscleCount; muscleIndex++) {
            const highLow = this.behaviorGene.nextChoice(256);
            this.fabric.setMuscleHighLow(muscleIndex, Direction.AHEAD, highLow);
            // console.log(`M[${muscleIndex}]=${highLow}`);
        }
        const opposite = this.behaviorGene.next() > 0.3;
        for (let intervalIndex = 0; intervalIndex < this.fabric.intervalCount - INTERVALS_RESERVED; intervalIndex++) {
            const intervalMuscle = this.behaviorGene.nextChoice(muscleCount) * (opposite ? -1 : 1);
            this.fabric.setIntervalMuscle(INTERVALS_RESERVED + intervalIndex, intervalMuscle);
            // console.log(`I[${intervalMuscle}]=${intervalMuscle}`);
        }
    }
}