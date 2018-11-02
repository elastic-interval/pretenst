import {GeneReader} from './gene-reader';
import {Fabric} from '../body/fabric';
import {Growth} from './growth';
import {Direction} from '../body/fabric-exports';
import {Behavior} from './behavior';

export interface IGenomeData {
    master: string;
    gene: Map<Direction, number[]>;
}

export function freshGenomeFor(master: string): Genome {
    const genomeData: IGenomeData = {master, gene: new Map<Direction, number[]>()};
    return new Genome(genomeData);
}

export class Genome {

    constructor(public data: IGenomeData) {
        if (!this.data.gene) {
            this.data.gene = new Map<Direction, number[]>();
        }
    }

    public get master() {
        return this.data.master;
    }

    public growth(fabric: Fabric): Growth {
        return new Growth(fabric, this.createReader(Direction.REST));
    }

    public behavior(fabric: Fabric, direction: Direction): Behavior {
        return new Behavior(fabric, direction, this.createReader(direction));
    }

    public withMutatedBehavior(direction: Direction, mutations: number): Genome {
        const geneClone = new Map<Direction, number[]>();
        this.data.gene.forEach((numbers, geneDirection) => {
            geneClone[geneDirection] = numbers.slice();
        });
        const directionGene: number[] = geneClone[direction] ? geneClone[direction]: [];
        for (let hit = 0; hit < mutations; hit++) {
            const geneNumber = Math.floor(Math.random() * directionGene.length);
            directionGene[geneNumber] = Math.random();
        }
        return new Genome({master: this.data.master, gene: geneClone});
    }

    public toJSON() {
        return JSON.stringify(this.data);
    }

    // ================= private

    private createReader(direction: Direction): GeneReader {
        const gene = this.data.gene[direction];
        if (gene) {
            return new GeneReader(gene);
        } else {
            const freshGene: number[] = [];
            this.data.gene[direction] = freshGene;
            return new GeneReader(freshGene);
        }
    }
}

