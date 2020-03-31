/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export enum GeneName {
    Forward = "Forward",
    Left = "Left",
    Right = "Right",
    MusclePeriod = "Attack",
    AttackPeriod = "Attack",
    DecayPeriod = "Decay",
}

export interface IGeneData {
    name: GeneName
    mutationCount: number
    geneString: string
}

export interface IGenomeData {
    generation: number
    genes: IGeneData[]
}

export interface ITwitch {
    when: number
    whichMuscle: number
    attack: number
    decay: number
    alternating: boolean
}

export function emptyGenome(): Genome {
    return new Genome(rollTheDice, [])
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
    return new Genome(rollTheDice, genes, genomeData.generation)
}

export interface IGene {
    name: GeneName
    mutationCount: number
    dice: IDie[]
}

export class Genome {
    public readonly generation: number

    constructor(private roll: () => IDie, private genes: IGene[], gen?: number) {
        this.generation = gen !== undefined ? gen : 1
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
        return new Genome(this.roll, genesCopy, this.generation + 1)
    }

    public get genomeData(): IGenomeData {
        return {
            genes: this.genes.map(g => ({
                name: g.name,
                mutationCount: g.mutationCount,
                geneString: serializeGene(g.dice),
            })),
            generation: this.generation,
        }
    }

    public toString(): string {
        return this.genes.map(gene => `${gene.name}:${gene.mutationCount}`).join(", ")
        // return this.genes.map(gene => serializeGene(gene.dice)).join("\n")
    }
}

interface IDie {
    index: number
    numeral: string
    symbol: string
    featureDelta: number
}

const DELTA = 1.1

const DICE: IDie[] = [
    {index: 0, numeral: "1", symbol: "⚀", featureDelta: 1 / DELTA / DELTA / DELTA},
    {index: 1, numeral: "2", symbol: "⚁", featureDelta: 1 / DELTA / DELTA},
    {index: 2, numeral: "3", symbol: "⚂", featureDelta: 1 / DELTA},
    {index: 3, numeral: "4", symbol: "⚃", featureDelta: DELTA},
    {index: 4, numeral: "5", symbol: "⚄", featureDelta: DELTA * DELTA},
    {index: 5, numeral: "6", symbol: "⚅", featureDelta: DELTA * DELTA * DELTA},
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

    public readMuscleTwitch(muscleCount: number, attackPeriod: number, decayPeriod: number): ITwitch {
        const whichMuscle2 = choice(muscleCount * 2, this.next(), this.next(), this.next(), this.next())
        const alternating = whichMuscle2 % 2 === 0
        const whichMuscle = Math.floor(whichMuscle2 / 2)
        return {
            when: choice(36, this.next(), this.next()),
            whichMuscle, alternating,
            attack: (2 + choice(6, this.next())) * attackPeriod,
            decay: (2 + choice(6, this.next())) * decayPeriod,
        }
    }

    public modifyFeature(original: number, generations: number): number {
        let value = original
        while (generations-- > 0) {
            value *= this.next().featureDelta
        }
        return value
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
