export const MAX_TIME = 65536;

export class GeneSequence {
    private cursor = 0;

    constructor(private sequence: number[]) {
    }

    public next(): number {
        while (this.sequence.length < this.cursor + 1) {
            this.sequence.push(Math.random());
        }
        return this.sequence[this.cursor++];

    }

    public nextChoice(maxChoice: number): number {
        return Math.floor(maxChoice * this.next());
    }
}