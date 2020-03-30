/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { ITwitch } from "./time-cycle"

export enum GeneName {
    Forward = "Forward",
    Left = "Left",
    Right = "Right",
}

export interface IGeneData {
    name: GeneName
    mutationCount: number
    geneString: string
}

export interface IGenomeData {
    genes: IGeneData[]
}

export function emptyGenome(): Genome {
    return new Genome([], rollTheDice)
}

export function fromGenomeData(genomeData: IGenomeData): Genome {
    if (!genomeData.genes) {
        return emptyGenome()
    }
    const genes = genomeData.genes.map(g => ({
        name: g.name,
        mutationCount: g.mutationCount,
        dice: deserializeGene(g.geneString),
    }))
    return new Genome(genes, rollTheDice)
}

export function fromOptionalGenomeData(genomeData?: IGenomeData): Genome | undefined {
    if (!genomeData) {
        return undefined
    }
    return fromGenomeData(genomeData)
}

export interface IGene {
    name: GeneName
    mutationCount: number
    dice: IDie[]
}

export class Genome {

    constructor(private genes: IGene[], private roll: () => IDie) {
    }

    public createReader(name: GeneName): GeneReader {
        const existingGene = this.genes.find(g => name === g.name)
        if (existingGene) {
            return new GeneReader(existingGene, this.roll)
        } else {
            const freshGene: IGene = {name, mutationCount: 0, dice: []}
            this.genes.push(freshGene)
            return new GeneReader(freshGene, this.roll)
        }
    }

    public mutationCount(name: GeneName): number {
        const gene = this.genes.find(g => name === g.name)
        if (!gene) {
            return 0
        }
        return gene.mutationCount
    }

    public withMutations(name: GeneName, mutations: number): Genome {
        const genesCopy: IGene[] = this.genes.map(g => ({
            name: g.name,
            mutationCount: g.mutationCount,
            dice: g.dice.slice(), // TODO: tweet this to the world
        }))
        const geneToMutate = genesCopy.find(g => name === g.name)
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
            genes: this.genes.map(g => ({
                name: g.name,
                mutationCount: g.mutationCount,
                geneString: serializeGene(g.dice),
            })),
        }
    }

    public toString(): string {
        return this.genes.map(gene => `${gene.name}:${gene.mutationCount}`).join(", ")
        // return this.genes.map(gene => serializeGene(gene.dice)).join("\n")
    }
}

interface IDie {
    index: number,
    numeral: string,
    symbol: string
}

const DICE: IDie[] = [
    {index: 0, numeral: "1", symbol: "⚀"},
    {index: 1, numeral: "2", symbol: "⚁"},
    {index: 2, numeral: "3", symbol: "⚂"},
    {index: 3, numeral: "4", symbol: "⚃"},
    {index: 4, numeral: "5", symbol: "⚄"},
    {index: 5, numeral: "6", symbol: "⚅"},
]

const DICE_MAP = ((): { [key: string]: IDie; } => {
    const map = {}
    DICE.forEach(die => {
        map[die.numeral] = die
        map[die.symbol] = die
    })
    return map
})()

function choice(max: number, ...dice: IDie[]): number {
    return Math.floor(diceToNuance(dice) * max)
}

export class GeneReader {
    private cursor = 0

    constructor(private gene: IGene, private roll: () => IDie) {
    }

    public readMuscleTwitch(muscleCount: number): ITwitch {
        return {
            when: choice(36, this.next(), this.next()),
            whichMuscle: choice(muscleCount, this.next(), this.next(), this.next(), this.next()),
            attack: (2 + choice(6, this.next())) * 1500,
            decay: (2 + choice(6, this.next())) * 1000,
        }
    }

    public get length(): number {
        return this.gene.dice.length
    }

    private next(): IDie {
        while (this.gene.dice.length < this.cursor + 1) {
            this.gene.dice.push(this.roll())
        }
        return this.gene.dice[this.cursor++]
    }
}

function rollTheDice(): IDie {
    return DICE[Math.floor(Math.random() * DICE.length)]
}

function diceToNuance(dice: IDie[]): number {
    if (dice.length === 0) {
        throw new Error("No dice!")
    }
    const base6 = dice.reduce((sum: number, die: IDie) => sum * 6 + die.index, 0)
    return base6 / Math.pow(6, dice.length)
}

function serializeGene(dice: IDie[]): string {
    return dice.map(die => die.symbol).join("")
}

function deserializeGene(s: string): IDie[] {
    return s.split("").map((numeral: string): IDie => DICE_MAP[numeral]).filter(die => !!die)
}
