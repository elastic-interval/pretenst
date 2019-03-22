/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Direction } from "../body/fabric-exports"

import { deserializeGene, DICE, IDie, serializeGene } from "./dice"
import { GeneReader } from "./gene-reader"
import { IGeneData } from "./genome"

export interface IGeneData {
    direction: Direction
    mutationCount: number
    geneString: string,
}

export interface IGenomeData {
    genes: IGeneData[]
}

function rollTheDice(): IDie {
    return DICE[Math.floor(Math.random() * DICE.length)]
}

export function freshGenome(): Genome {
    return new Genome([], rollTheDice)
}

export function fromGenomeData(genomeData: IGenomeData): Genome {
    if (!genomeData.genes) {
        return freshGenome()
    }
    const genes = genomeData.genes.map(g => {
        return {
            direction: g.direction,
            mutationCount: g.mutationCount,
            dice: deserializeGene(g.geneString),
        }
    })
    return new Genome(genes, rollTheDice)
}

export function fromOptionalGenomeData(genomeData?: IGenomeData): Genome | undefined {
    if (!genomeData) {
        return undefined
    }
    return fromGenomeData(genomeData)
}

export interface IGene {
    direction: Direction
    mutationCount: number
    dice: IDie[]
}

export class Genome {

    constructor(private genes: IGene[], private roll: () => IDie) {
    }

    public createReader(direction: Direction): GeneReader {
        const existingGene = this.genes.find(g => direction === g.direction)
        if (existingGene) {
            return new GeneReader(existingGene, this.roll)
        } else {
            const freshGene: IGene = {direction, mutationCount: 0, dice: []}
            this.genes.push(freshGene)
            return new GeneReader(freshGene, this.roll)
        }
    }

    public withMutatedBehavior(direction: Direction, mutations: number): Genome {
        const genesCopy: IGene[] = this.genes.map(g => {
            return {
                direction: g.direction,
                mutationCount: g.mutationCount,
                dice: g.dice.slice(),
            }
        })
        const geneToMutate = genesCopy.find(g => direction === g.direction)
        if (geneToMutate) {
            for (let hit = 0; hit < mutations; hit++) {
                const geneNumber = Math.floor(Math.random() * geneToMutate.dice.length)
                geneToMutate.dice[geneNumber] = this.roll()
                geneToMutate.mutationCount++
            }
        }
        return new Genome(genesCopy, this.roll)
    }

    public get genomeData(): IGenomeData {
        return {
            genes: this.genes.map(g => {
                return {
                    direction: g.direction,
                    mutationCount: g.mutationCount,
                    geneString: serializeGene(g.dice),
                }
            }),
        }
    }
}

