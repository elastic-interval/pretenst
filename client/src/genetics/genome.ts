import {GeneSequence} from './gene-sequence';
import {Growth} from './growth';
import {Behavior} from './behavior';
import {GenomeExecution} from './genome-execution';
import {Fabric} from '../gotchi/fabric';

export interface IGeneExecution {
    step(): boolean;
}

export interface IGenomeExecution extends IGeneExecution {
    hanging: boolean;
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

    public createExecution(fabric: Fabric): IGenomeExecution {
        return new GenomeExecution(
            fabric,
            new Growth(fabric, new GeneSequence(this.growthSequence)),
            new Behavior(fabric, new GeneSequence(this.behaviorSequence))
        );
    }

    public get growth(): Uint16Array {
        return sequenceToArray(this.growthSequence);
    }

    public get behavior(): Uint16Array {
        return sequenceToArray(this.behaviorSequence);
    }
}

