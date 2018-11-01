import {GeneSequence} from './gene-sequence';
import {Fabric, INTERVALS_RESERVED} from '../body/fabric';
import {Growth} from './growth';
import {Direction} from '../body/fabric-exports';

export interface IGenomeData {
    master: string;
    growthSequence: number[];
    behaviorSequence: number[];
}

export class Genome {

    constructor(public data: IGenomeData) {
        if (!data.growthSequence) {
            data.growthSequence = [];
        }
        if (!data.behaviorSequence) {
            data.behaviorSequence = [];
        }
    }

    public get master() {
        return this.data.master;
    }

    public growth(fabric: Fabric): Growth {
        return new Growth(fabric, new GeneSequence(this.data.growthSequence));
    }

    public applyBehavior(fabric: Fabric): void {
        const behaviorGene = new GeneSequence(this.data.behaviorSequence);
        for (let intervalIndex = INTERVALS_RESERVED; intervalIndex < fabric.intervalCount; intervalIndex++) {
            for (let direction = Direction.FORWARD; direction <= Direction.REVERSE; direction++) {
                const highLow = behaviorGene.nextChoice(256);
                fabric.setIntervalHighLow(intervalIndex, direction, highLow);
            }
        }
    }

    public withMutatedBehavior(mutations: number): Genome {
        const genome = new Genome({
            master: this.data.master,
            growthSequence: this.data.growthSequence.slice(),
            behaviorSequence: this.data.behaviorSequence.slice()
        });
        for (let hit = 0; hit < mutations; hit++) {
            const geneNumber = Math.floor(Math.random() * genome.data.behaviorSequence.length);
            genome.data.behaviorSequence[geneNumber] = Math.random();
        }
        return genome;
    }

    public toJSON() {
        return JSON.stringify(this.data);
    }
}

