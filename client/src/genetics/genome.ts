import {GeneSequence} from './gene-sequence';
import {Behavior} from './behavior';
import {Fabric} from '../gotchi/fabric';
import {Embryology} from './embryology';

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
        private embryoSequence: number[],
        private behaviorSequence: number[]
    ) {
    }

    public embryology(fabric: Fabric): Embryology {
        return new Embryology(fabric, new GeneSequence(this.embryoSequence));
    }

    public behavior(fabric: Fabric): Behavior {
        return new Behavior(fabric, new GeneSequence(this.behaviorSequence));
    }

    public get embryologyDat(): Uint16Array {
        return sequenceToArray(this.embryoSequence);
    }

    public get behaviorData(): Uint16Array {
        return sequenceToArray(this.behaviorSequence);
    }
}

