import {GeneSequence} from './gene-sequence';
import {Fabric, INTERVALS_RESERVED, MUSCLE_STATES_RESERVED} from '../body/fabric';

export class Behavior {

    constructor(private fabric: Fabric, private behaviorGene: GeneSequence) {
    }

    public apply(): void {
        for (let muscleStateIndex = 0; muscleStateIndex < this.fabric.muscleStateCount; muscleStateIndex++) {
            const spanVariation = this.behaviorGene.nextSpanVariation();
            this.fabric.setMuscleState(muscleStateIndex, spanVariation);
            console.log(`MS${muscleStateIndex}= ${spanVariation}`);
        }
        for (let interval = 0; interval < this.fabric.intervalCount / 4; interval++) {
            const maxIntervalChoice = this.fabric.intervalCount - INTERVALS_RESERVED;
            const intervalChoice = INTERVALS_RESERVED + this.behaviorGene.nextChoice(maxIntervalChoice);
            const muscleStateChoice = this.fabric.muscleStateCount - MUSCLE_STATES_RESERVED;
            const roleIndexChoice = this.behaviorGene.nextChoice(muscleStateChoice * 2) - muscleStateChoice;
            const roleChoice = (roleIndexChoice < 0 ? 1 - MUSCLE_STATES_RESERVED : MUSCLE_STATES_RESERVED) + roleIndexChoice;
            console.log(`I[${intervalChoice}]=${roleChoice}`);
            this.fabric.setIntervalRole(intervalChoice, roleChoice);
        }
    }
}