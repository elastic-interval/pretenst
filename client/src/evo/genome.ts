/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IMuscle } from "./runner-logic"
import { ITwitchConfig } from "./twitcher"

export class Genome {
    constructor(private roll: () => IDie, private genes: IGene[]) {
    }

    public createReader(name: GeneName): GeneReader {
        return new GeneReader(getGene(name, this.genes), this.roll)
    }

    public get totalTwitches(): number {
        const maxTosses = this.genes.reduce((max, {tosses}) => Math.max(max, tosses), 0)
        return Math.floor(Math.pow(maxTosses, 0.66)) + 2
    }

    public withMutations(directionGeneNames: GeneName[], mutateTwitchConfig: boolean): Genome {
        const genesCopy: IGene[] = this.genes.map(gene => {
            const {geneName, tosses} = gene
            const dice = gene.dice.slice() // TODO: tweet this to the world
            return {geneName, tosses, dice}
        })
        directionGeneNames.forEach(directionName => {
            const directionGene = getGene(directionName, genesCopy)
            mutateGene(() => this.roll(), directionGene)
        })
        if (mutateTwitchConfig) {
            const twitchConfig = getGene(GeneName.TwitchConfig, genesCopy)
            mutateGene(() => this.roll(), twitchConfig)
            twitchConfig.tosses++
        }
        return new Genome(this.roll, genesCopy)
    }

    public get geneData(): IGeneData[] {
        return this.genes.map(gene => {
            const {geneName, tosses, dice} = gene
            const geneString = serializeGene(dice)
            return <IGeneData>{geneName, tosses, geneString}
        })
    }

    public get tosses(): number {
        return this.genes.reduce((sum, {tosses}: IGene) => sum + tosses, 0)
    }

    public toString(): string {
        return this.genes.map(gene => `(${gene.geneName}:${gene.tosses})`).join(", ")
        // return this.genes.map(gene => serializeGene(gene.dice)).join("\n")
    }
}

export class GeneReader {
    private cursor = 0

    constructor(private gene: IGene, private roll: () => IDie) {
    }

    public chooseFrom(total: number): number {
        return Math.floor(total * diceToNuance(this.nextDie(), this.nextDie()))
    }

    public readMuscleTwitch(loop: IMuscle[], config: ITwitchConfig): ITwitch {
        const {attackPeriod, decayPeriod, twitchNuance} = config
        const muscle = loop[this.nextDie().index]
        return {
            muscle, twitchNuance,
            when: diceToInteger(36, this.nextDie(), this.nextDie()),
            attack: (2 + diceToFloat(6, this.nextDie())) * attackPeriod,
            decay: (2 + diceToFloat(6, this.nextDie())) * decayPeriod,
        }
    }

    public readFeatureValue(low: number, high: number): number {
        const nuance = diceToNuance(this.nextDie(), this.nextDie(), this.nextDie())
        return low * nuance + high * (1 - nuance)
    }

    public get length(): number {
        return this.gene.dice.length
    }

    public nextDie(): IDie {
        while (this.gene.dice.length < this.cursor + 1) {
            this.gene.dice.push(this.roll())
        }
        return this.gene.dice[this.cursor++]
    }
}

interface IDie {
    index: number
    numeral: string
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

function diceToInteger(max: number, ...dice: IDie[]): number {
    return Math.floor(diceToNuance(...dice) * max)
}

function diceToFloat(max: number, ...dice: IDie[]): number {
    return diceToNuance(...dice) * max
}

function mutateGene(roll: () => IDie, gene: IGene): void {
    if (gene.dice.length === 0) {
        gene.dice.push(roll())
    } else {
        const woops = Math.floor(Math.random() * gene.dice.length)
        const currentRoll = gene.dice[woops]
        while (gene.dice[woops] === currentRoll) {
            gene.dice[woops] = roll()
        }
    }
    gene.tosses++
}

function rollTheDice(): IDie {
    return DICE[Math.floor(Math.random() * DICE.length)]
}

function diceToNuance(...dice: IDie[]): number {
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

export enum GeneName {
    Body = "Body",
    ToA = "ToA",
    ToB = "ToB",
    ToC = "ToC",
    TwitchConfig = "TwitchConfig",
}

export interface IGeneData {
    geneName: GeneName
    tosses: number
    geneString: string
}

export interface ITwitch {
    when: number
    muscle: IMuscle
    attack: number
    decay: number
    twitchNuance: number
}

export function emptyGenome(): Genome {
    return new Genome(rollTheDice, [])
}

export function fromGeneData(geneData: IGeneData[]): Genome {
    if (geneData.length === 0) {
        return emptyGenome()
    }
    const genes = geneData.map(({geneName, tosses, geneString}) => {
        const dice = deserializeGene(geneString)
        return {geneName, tosses, dice}
    })
    return new Genome(rollTheDice, genes)
}

export interface IGene {
    geneName: GeneName
    tosses: number
    dice: IDie[]
}

function getGene(search: GeneName, genes: IGene[]): IGene {
    const existing = genes.find(({geneName}) => search === geneName)
    if (existing) {
        return existing
    }
    const fresh: IGene = {geneName: search, tosses: 0, dice: []}
    genes.push(fresh)
    return fresh
}
