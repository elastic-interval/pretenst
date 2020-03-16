/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Direction } from "./gotchi"

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

function diceToNuance(dice: IDie[]): number {
    if (dice.length === 0) {
        throw new Error("No dice!")
    }
    const max = Math.pow(6, dice.length)
    const lessThanMax = dice.reduce((sum: number, die: IDie) => sum * 6 + die.index, 0)
    return (lessThanMax + 0.5) / max
}

function serializeGene(dice: IDie[]): string {
    return dice.map(die => die.symbol).join("")
}

function deserializeGene(s: string): IDie[] {
    return s.split("").map((numeral: string): IDie => DICE_MAP[numeral]).filter(die => !!die)
}

class GeneReader {
    private cursor = 0

    constructor(private gene: IGene, private roll: () => IDie) {
    }

    public chooseFrom(maxChoice: number): number {
        const choice = (...dice: IDie[]) => Math.floor(diceToNuance(dice) * maxChoice)
        if (maxChoice <= 6) {
            return choice(this.next())
        } else if (maxChoice <= 6 * 6) {
            return choice(this.next(), this.next())
        } else if (maxChoice <= 6 * 6 * 6) {
            return choice(this.next(), this.next(), this.next())
        } else if (maxChoice <= 6 * 6 * 6 * 6) {
            return choice(this.next(), this.next(), this.next(), this.next())
        } else {
            return choice(this.next(), this.next(), this.next(), this.next(), this.next())
        }
    }

    public get size(): number {
        return this.gene.dice.length
    }

    private next(): IDie {
        while (this.gene.dice.length < this.cursor + 1) {
            this.gene.dice.push(this.roll())
        }
        return this.gene.dice[this.cursor++]
    }
}
