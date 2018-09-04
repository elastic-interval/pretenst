import {GeneSequence} from './gene-sequence';
import {Growth} from './growth';
import {Behavior} from './behavior';
import {Fabric} from '../gotchi/fabric';

export interface IGeneExecution {
    step(): boolean;
}

export const MAX_UINT16 = 65536.0;

export const sequenceToArray = (sequence: number[]) => {
    const uint16Array = new Uint16Array(sequence.length);
    sequence.forEach((floating: number, index: number) => {
        uint16Array[index] = Math.floor(floating * MAX_UINT16);
    });
    return uint16Array;
};

export class Genome {

    constructor(
        private growthSequence: number[],
        private behaviorSequence: number[]
    ) {
    }

    public createGrowthExecution(fabric: Fabric): IGeneExecution {
        return new Growth(fabric, new GeneSequence(this.growthSequence));
    }

    public createBehaviorExecution(fabric: Fabric): IGeneExecution {
        return new Behavior(fabric, new GeneSequence(this.behaviorSequence));
    }

    public get growthData(): Uint16Array {
        return sequenceToArray(this.growthSequence);
    }

    public get behaviorData(): Uint16Array {
        return sequenceToArray(this.behaviorSequence);
    }
}

