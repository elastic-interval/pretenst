import {Direction} from "../body/fabric-exports"

import {DICE, IDie} from "./dice"
import {GeneReader} from "./gene-reader"

export interface IGenomeData {
    master: string
    gene: { [key: string]: IDie[]; }
}

function rollTheDice(): IDie {
    return DICE[Math.floor(Math.random() * DICE.length)]
}

export function freshGenomeFor(master: string): Genome {
    const genomeData: IGenomeData = {master, gene: {}}
    return new Genome(genomeData, rollTheDice)
}

export class Genome {

    constructor(public data: IGenomeData, private roll: () => IDie) {
        if (!this.data.gene) {
            this.data.gene = {}
        }
    }

    public get master() {
        return this.data.master
    }

    public createReader(direction: Direction): GeneReader {
        const gene = this.data.gene[direction]
        if (gene) {
            return new GeneReader(gene, this.roll)
        } else {
            const freshGene: IDie[] = []
            this.data.gene[direction] = freshGene
            return new GeneReader(freshGene, this.roll)
        }
    }

    public withMutatedBehavior(direction: Direction, mutations: number): Genome {
        const geneClone = {}
        Object.keys(this.data.gene).forEach(key => {
            geneClone[key] = this.data.gene[key].slice()
        })
        const directionGene: IDie[] = geneClone[direction] ? geneClone[direction] : []
        for (let hit = 0; hit < mutations; hit++) {
            const geneNumber = Math.floor(Math.random() * directionGene.length)
            directionGene[geneNumber] = this.roll()
            // console.log(`G[${direction}][${geneNumber}] = ${directionGene[geneNumber]}`);
        }
        const genomeData: IGenomeData = {master: this.data.master, gene: geneClone}
        return new Genome(genomeData, this.roll)
    }

    public toJSON() {
        return JSON.stringify(this.data)
    }
}

