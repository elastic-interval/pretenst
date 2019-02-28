export interface IDie {
    index: number,
    numeral: string,
    symbol: string
}

export const DICE: IDie[] = [
    {index: 0, numeral: "1", symbol: "⚀"},
    {index: 1, numeral: "2", symbol: "⚁"},
    {index: 2, numeral: "3", symbol: "⚂"},
    {index: 3, numeral: "4", symbol: "⚃"},
    {index: 4, numeral: "5", symbol: "⚄"},
    {index: 5, numeral: "6", symbol: "⚅"},
]

const createDiceMap = (): { [key: string]: IDie; } => {
    const map = {}
    DICE.forEach(die => map[die.numeral] = die)
    return map
}

export const DICE_MAP = createDiceMap()

export function diceToNuance(dice: IDie[]): number {
    if (dice.length === 0) {
        throw new Error("No dice!")
    }
    const max = Math.pow(6, dice.length)
    const lessThanMax = dice.reduce((sum: number, die: IDie) => sum * 6 + die.index, 0)
    return (lessThanMax + 0.5) / max
}

export function serializeGene(dice: IDie[]): string {
    return dice.map(die => die.numeral).join()
}

export function deserializeGene(s: string): IDie[] {
    return s.split("").map((numeral: string): IDie => DICE_MAP[numeral])
}
