import {GeneSequence} from './gene-sequence';
import {Fabric, INTERVALS_RESERVED} from '../body/fabric';

export class Behavior {

    constructor(private fabric: Fabric, private behaviorGene: GeneSequence) {
    }

    public apply(): void {
        const muscleStateCount = this.fabric.muscleStateCount;
        for (let muscleStateIndex = 0; muscleStateIndex < muscleStateCount; muscleStateIndex++) {
            const spanVariation = this.behaviorGene.nextSpanVariation();
            this.fabric.setMuscleState(muscleStateIndex, spanVariation);
            // console.log(`MS${muscleStateIndex}= ${spanVariation}`);
        }
        const opposite = this.behaviorGene.next() > 0.5;
        for (let interval = 0; interval < this.fabric.intervalCount / 4; interval++) {
            const maxIntervalChoice = this.fabric.intervalCount - INTERVALS_RESERVED;
            const intervalChoice = INTERVALS_RESERVED + this.behaviorGene.nextChoice(maxIntervalChoice);
            const intervalMuscle = this.behaviorGene.nextChoice(muscleStateCount) * (opposite ? -1 : 1);
            // const intervalMuscle = this.behaviorGene.nextChoice(muscleStateCount * 2 - 1) - muscleStateCount + 1;
            // console.log(`I[${intervalChoice}]=${intervalMuscle}`);
            this.fabric.setIntervalMuscle(intervalChoice, intervalMuscle);
        }
    }
}