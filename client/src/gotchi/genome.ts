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
    generation: number
    geneString: string
}

export interface ITwitch {
    when: number
    whichMuscle: number
    attack: number
    decay: number
    twitchNuance: number
    alternating: boolean
}

export function emptyGenome(): Genome {
    return new Genome(rollTheDice, [])
}

export function fromGenomeData(geneData: IGeneData[]): Genome {
    if (geneData.length === 0) {
        return emptyGenome()
    }
    const genes = geneData.map(({geneName, generation, geneString}) => {
        const dice = deserializeGene(geneString)
        return {geneName, generation, dice}
    })
    return new Genome(rollTheDice, genes)
}

export interface IGene {
    geneName: GeneName
    generation: number
    dice: IDie[]
}

function getGene(search: GeneName, genes: IGene[]): IGene {
    const existing = genes.find(({geneName}) => search === geneName)
    if (existing) {
        return existing
    }
    const fresh: IGene = {geneName: search, generation: 1, dice: []}
    genes.push(fresh)
    return fresh
}

export class Genome {
    constructor(private roll: () => IDie, private genes: IGene[]) {
    }

    public createReader(name: GeneName): GeneReader {
        return new GeneReader(getGene(name, this.genes), this.roll)
    }

    public get twitchCount(): number {
        const maxGeneration = this.genes.reduce((max, {generation}) => Math.max(max, generation), 0)
        return Math.floor(Math.sqrt(maxGeneration + 2)) + 2
    }

    public withDirectionMutations(directionNames: GeneName[]): Genome {
        const genesCopy: IGene[] = this.genes.map(gene => {
            const {geneName, generation} = gene
            const dice = gene.dice.slice() // TODO: tweet this to the world
            return {geneName, generation, dice}
        })
        directionNames.forEach(directionName => {
            const directionGene = getGene(directionName, genesCopy)
            mutateGene(() => this.roll(), directionGene)
        })
        if (Math.random() > 0.6) {
            const modifierName = randomModifierName()
            const modifierGene = getGene(modifierName, genesCopy)
            mutateGene(() => this.roll(), modifierGene)
        }
        return new Genome(this.roll, genesCopy)
    }

    public get genomeData(): IGeneData[] {
        return this.genes.map(gene => {
            const {geneName, generation, dice} = gene
            const geneString = serializeGene(dice)
            return <IGeneData>{geneName, generation, geneString}
        })
    }

    public get generation(): number {
        return this.genes.reduce((max, {generation}) => Math.max(max, generation), 0)
    }

    public toString(): string {
        return this.genes.map(gene => `(${gene.geneName}:${gene.generation})`).join(", ")
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
    gene.generation++
}

export class GeneReader {
    private cursor = 0

    constructor(private gene: IGene, private roll: () => IDie) {
    }

    public readMuscleTwitch(muscleCount: number, attackPeriod: number, decayPeriod: number, twitchNuance: number): ITwitch {
        const doubleMuscle = diceToInteger(muscleCount * 2, this.next(), this.next(), this.next(), this.next())
        const alternating = doubleMuscle % 2 === 0
        const whichMuscle = Math.floor(doubleMuscle / 2)
        return {
            when: diceToInteger(36, this.next(), this.next()),
            whichMuscle, alternating,
            attack: (2 + diceToFloat(6, this.next())) * attackPeriod,
            decay: (2 + diceToFloat(6, this.next())) * decayPeriod,
            twitchNuance,
        }
    }

    public modifyFeature(original: number): number {
        const woops = Math.random() > 0.97
        if (woops) {
            this.discard() // woops, dropped the dice
        }
        let value = original
        const weightOfNew = 0.5
        for (let tick = 0; tick < this.gene.generation; tick++) {
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

    private discard(): void {
        this.gene.generation = 1
        this.gene.dice = []
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
