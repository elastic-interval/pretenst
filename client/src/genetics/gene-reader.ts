import {diceToNuance, IDie} from "./dice"

export class GeneReader {
    private cursor = 0

    constructor(private sequence: IDie[], private roll: () => IDie) {
        if (!this.sequence) {
            this.sequence = []
        }
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
        return this.sequence ? this.sequence.length : 0
    }

    private next(): IDie {
        while (this.sequence.length < this.cursor + 1) {
            this.sequence.push(this.roll())
        }
        return this.sequence[this.cursor++]
    }
}
