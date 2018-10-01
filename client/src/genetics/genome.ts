import {GeneSequence} from './gene-sequence';
import {Behavior} from './behavior';
import {Fabric} from '../body/fabric';
import {Embryology} from './embryology';

export interface IGenomeData {
    master: string;
    embryoSequence: number[];
    behaviorSequence: number[];
}

export class Genome {

    constructor(public data: IGenomeData) {
        if (!data.embryoSequence) {
            data.embryoSequence = [];
        }
        if (!data.behaviorSequence) {
            data.behaviorSequence = [];
        }
    }

    public get master() {
        return this.data.master;
    }

    public embryology(fabric: Fabric): Embryology {
        return new Embryology(fabric, new GeneSequence(this.data.embryoSequence));
    }

    public behavior(fabric: Fabric): Behavior {
        return new Behavior(fabric, new GeneSequence(this.data.behaviorSequence));
    }

    public withMutatedBehavior(mutations: number): Genome {
        const genome = new Genome({
            master: this.data.master,
            embryoSequence: this.data.embryoSequence.slice(),
            behaviorSequence: this.data.behaviorSequence.slice()
        });
        for (let hit = 0; hit < mutations; hit++) {
            const geneNumber = Math.floor(Math.random() * genome.data.behaviorSequence.length);
            genome.data.behaviorSequence[geneNumber] = Math.random();
        }
        return genome;
    }
}

