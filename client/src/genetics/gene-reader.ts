import {diceToNuance, IDie} from "./dice"
import {IGene} from "./genome"

export class GeneReader {
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
