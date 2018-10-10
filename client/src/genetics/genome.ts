import {GeneSequence} from './gene-sequence';
import {Behavior} from './behavior';
import {Fabric} from '../body/fabric';
import {Growth} from './growth';

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

    public behavior(fabric: Fabric): Behavior {
        return new Behavior(fabric, new GeneSequence(this.data.behaviorSequence));
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

