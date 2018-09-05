import {GeneSequence} from './gene-sequence';
import {Fabric, INTERVALS_RESERVED, ROLE_STATE_COUNT, ROLES_RESERVED} from '../gotchi/fabric';

export class Behavior {

    constructor(private fabric: Fabric, private behaviorGene: GeneSequence) {
    }

    public fillRoles(): void {
        for (let roleIndex = ROLES_RESERVED; roleIndex < this.fabric.roleCount; roleIndex++) {
            for (let stateIndex = 0; stateIndex < ROLE_STATE_COUNT; stateIndex++) {
                const time = this.behaviorGene.nextTime();
                const spanVariation = this.behaviorGene.nextSpanVariation();
                // console.log(`${roleIndex}/${stateIndex}: [${time}]${spanVariation}`);
                this.fabric.setRoleState(roleIndex, stateIndex, time, spanVariation);
            }
        }
        this.fabric.prepareRoles();
    }

    public attachRoleToIntervalPair(): void {
        const intervalChoice = INTERVALS_RESERVED + this.behaviorGene.nextChoice(this.fabric.intervalCount - INTERVALS_RESERVED);
        const roleChoice = ROLES_RESERVED + this.behaviorGene.nextChoice(this.fabric.roleCount - ROLES_RESERVED);
        console.log(`I[${intervalChoice}]=${roleChoice}`);
        this.fabric.setIntervalRole(intervalChoice, roleChoice);
    }
}