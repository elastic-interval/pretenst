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

function freshGenomeData(master: string): IGenomeData {
    return {
        master,
        geneMap: {},
    }
}

export function fromMaster(master: string): Genome {
    return new Genome(freshGenomeData(master), rollTheDice)
}

export function fromGenomeData(genomeData: IGenomeData): Genome {
    return new Genome(genomeData, rollTheDice)
}

export class Genome {

    private geneMap: { [key: string]: IDie[]; } = {}

    constructor(private data: IGenomeData, private roll: () => IDie) {
        if (data.geneMap) {
            Object.keys(data.geneMap).forEach(direction => this.geneMap[direction] = deserializeGene(data.geneMap[direction]))
        }
    }

    public get master(): string {
        return this.data.master
    }

    public createReader(direction: Direction): GeneReader {
        const gene = this.geneMap[direction]
        if (gene) {
            return new GeneReader(gene, this.roll)
        } else {
            this.geneMap[direction] = []
            return new GeneReader(this.geneMap[direction], this.roll)
        }
    }

    public withMutatedBehavior(direction: Direction, mutations: number): Genome {
        const mutatedGeneMap: { [key: string]: IDie[]; } = {}
        Object.keys(this.geneMap).forEach(key => {
            mutatedGeneMap[key] = this.geneMap[key].slice()
        })
        if (!mutatedGeneMap[direction]) {
            mutatedGeneMap[direction] = []
        }
        for (let hit = 0; hit < mutations; hit++) {
            const geneNumber = Math.floor(Math.random() * mutatedGeneMap[direction].length)
            mutatedGeneMap[direction][geneNumber] = this.roll()
        }
        const genome = new Genome(freshGenomeData(this.master), this.roll)
        genome.geneMap = mutatedGeneMap
        return genome
    }

    public get genomeData(): IGenomeData {
        this.data.geneMap = {}
        Object.keys(this.geneMap).forEach(key => this.data.geneMap[key] = serializeGene(this.geneMap[key]))
        return this.data
    }
}

