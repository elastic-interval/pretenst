import {GeneSequence} from './gene-sequence';
import {Behavior} from './behavior';
import {Fabric} from '../body/fabric';
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
    private embryoSequence: number[] = [];
    private behaviorSequence: number[] = [];

    constructor(
        embryoData?: Uint16Array,
        behaviorData?: Uint16Array
    ) {
        if (embryoData) {
            embryoData.forEach(value => this.embryoSequence.push(value));
        }
        if (behaviorData) {
            behaviorData.forEach(value => this.behaviorSequence.push(value));
        }
    }

    public embryology(fabric: Fabric): Embryology {
        return new Embryology(fabric, new GeneSequence(this.embryoSequence));
    }

    public behavior(fabric: Fabric): Behavior {
        return new Behavior(fabric, new GeneSequence(this.behaviorSequence));
    }

    public get embryologyData(): Uint16Array {
        return sequenceToArray(this.embryoSequence);
    }

    public get behaviorData(): Uint16Array {
        return sequenceToArray(this.behaviorSequence);
    }

    public withMutatedBehavior(mutations: number): Genome {
        const genome = new Genome();
        genome.embryoSequence = this.embryoSequence.slice();
        genome.behaviorSequence = this.behaviorSequence.slice();
        for (let hit = 0; hit < mutations; hit++) {
            const geneNumber = Math.floor(Math.random() * genome.behaviorSequence.length);
            genome.behaviorSequence[geneNumber] = Math.random();
        }
        return genome;
    }
}

