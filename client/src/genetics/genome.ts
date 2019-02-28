import {Direction} from "../body/fabric-exports"

import {deserializeGene, DICE, IDie, serializeGene} from "./dice"
import {GeneReader} from "./gene-reader"

export interface IGenomeData {
    master: string
    geneMap: { [key: string]: string; }
}

function rollTheDice(): IDie {
    return DICE[Math.floor(Math.random() * DICE.length)]
}

export function fromGenomeData(genomeData: IGenomeData) {
    return new Genome(genomeData, rollTheDice)
}

export class Genome {

    private gene: { [key: string]: IDie[]; } = {}

    constructor(private data: IGenomeData, private roll: () => IDie) {
        if (data.geneMap) {
            Object.keys(data.geneMap).forEach(direction => this.gene[direction] = deserializeGene(data.geneMap[direction]))
        }
    }

    public get master() {
        return this.data.master
    }

    public createReader(direction: Direction): GeneReader {
        const gene = this.gene[direction]
        if (gene) {
            return new GeneReader(gene, this.roll)
        } else {
            this.gene[direction] = []
            return new GeneReader(this.gene[direction], this.roll)
        }
    }

    public withMutatedBehavior(direction: Direction, mutations: number): Genome {
        const mutated: { [key: string]: IDie[]; } = {}
        Object.keys(this.gene).forEach(key => {
            mutated[key] = this.gene[key].slice()
        })
        if (!mutated[direction]) {
            mutated[direction] = []
        }
        for (let hit = 0; hit < mutations; hit++) {
            const geneNumber = Math.floor(Math.random() * mutated[direction].length)
            mutated[direction][geneNumber] = this.roll()
            // console.log(`G[${direction}][${geneNumber}] = ${directionGene[geneNumber]}`);
        }
        const genome = new Genome({master: this.master, geneMap:{}}, this.roll)
        genome.gene = mutated
        return genome
    }

    public get genomeData(): IGenomeData {
        this.data.geneMap = {}
        Object.keys(this.gene).forEach(key => this.data.geneMap[key] = serializeGene(this.gene[key]))
        return this.data
    }
}

