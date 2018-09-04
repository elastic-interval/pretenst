export const MAX_TIME = 3600;
export const MAX_VARIATION = 1.618;
export const MIN_VARIATION = 0.618;

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

    public nextVariation(): number {
        const zeroToOne = this.next();
        return MAX_VARIATION * zeroToOne + MIN_VARIATION * (1.0 - zeroToOne);
    }

    public nextTimeSpan(): number {
        return this.nextChoice(MAX_TIME);
    }
}