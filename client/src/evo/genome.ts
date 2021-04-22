/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IMuscle } from "./runner-logic"

export enum GeneName {
    Forward = "Forward",
    Left = "Left",
    Right = "Right",
    MusclePeriod = "Attack",
    AttackPeriod = "Attack",
    DecayPeriod = "Decay",
    TwitchNuance = "TwitchNuance",
    TicksPerSlice = "TicksPerSlice",
}

function isModifier(name: GeneName): boolean {
    switch (name) {
        case GeneName.Forward:
        case GeneName.Left:
        case GeneName.Right:
            return false
        case GeneName.MusclePeriod:
        case GeneName.AttackPeriod:
        case GeneName.DecayPeriod:
        case GeneName.TwitchNuance:
        case GeneName.TicksPerSlice:
            return true
    }
}

export const MODIFIER_NAMES: GeneName[] = Object.keys(GeneName).filter(key => isModifier(GeneName[key])).map(k => GeneName[k])

export function randomModifierName(): GeneName {
    return MODIFIER_NAMES[Math.floor(Math.random() * MODIFIER_NAMES.length)]
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
    alternating: boolean
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

    public withMutations(directionNames: GeneName[], modifierName?: GeneName): Genome {
        const genesCopy: IGene[] = this.genes.map(gene => {
            const {geneName, tosses} = gene
            const dice = gene.dice.slice() // TODO: tweet this to the world
            return {geneName, tosses, dice}
        })
        directionNames.forEach(directionName => {
            const directionGene = getGene(directionName, genesCopy)
            mutateGene(() => this.roll(), directionGene)
        })
        if (modifierName) {
            const modifierGene = getGene(modifierName, genesCopy)
            modifierGene.tosses++
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
        return this.genes.reduce((sum, {tosses}:IGene) => sum + tosses, 0)
    }

    public toString(): string {
        return this.genes.map(gene => `(${gene.geneName}:${gene.tosses})`).join(", ")
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

function diceToInteger(max: number, ...dice: IDie[]): number {
    return Math.floor(diceToNuance(dice) * max)
}

function diceToFloat(max: number, ...dice: IDie[]): number {
    return diceToNuance(dice) * max
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

export class GeneReader {
    private cursor = 0

    constructor(private gene: IGene, private roll: () => IDie) {
    }

    public readMuscleTwitch(muscles: IMuscle[], attackPeriod: number, decayPeriod: number, twitchNuance: number): ITwitch {
        const doubleMuscle = diceToInteger(muscles.length * 2, this.next(), this.next(), this.next())
        const alternating = doubleMuscle % 2 === 0
        const whichMuscle = Math.floor(doubleMuscle / 2)
        const muscle = muscles[whichMuscle]
        return {
            when: diceToInteger(36, this.next(), this.next()),
            muscle, alternating,
            attack: (2 + diceToFloat(6, this.next())) * attackPeriod,
            decay: (2 + diceToFloat(6, this.next())) * decayPeriod,
            twitchNuance,
        }
    }

    public modifyFeature(original: number): number {
        let value = original
        const weightOfNew = 0.5
        if (this.gene.tosses === 0) {
            this.gene.tosses++
        }
        for (let tick = 0; tick < this.gene.tosses; tick++) {
            value = value * (weightOfNew * this.next().featureDelta + (1 - weightOfNew))
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
