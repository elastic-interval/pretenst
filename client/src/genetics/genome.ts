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
        const muscleCount = fabric.muscleCount;
        for (let muscleIndex = 0; muscleIndex < muscleCount; muscleIndex++) {
            for (let direction = Direction.AHEAD; direction <= Direction.RIGHT; direction++) {
                const highLow = behaviorGene.nextChoice(256);
                fabric.setMuscleHighLow(muscleIndex, direction, highLow);
                // console.log(`M[${muscleIndex}]=${highLow}`);
            }
        }
        // todo: too much assignment here, due to opposites
        for (let intervalIndex = 0; intervalIndex < fabric.intervalCount - INTERVALS_RESERVED; intervalIndex++) {
            const opposite = behaviorGene.next() > 0.3;
            const intervalMuscle = behaviorGene.nextChoice(muscleCount) * (opposite ? -1 : 1);
            fabric.setIntervalMuscle(INTERVALS_RESERVED + intervalIndex, intervalMuscle);
            // console.log(`I[${intervalMuscle}]=${intervalMuscle}`);
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

