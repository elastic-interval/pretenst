export interface IGenomeReader {
    cursor: number;
    next: () => number;
    nextChoice: (maxChoice: number) => number;
    nextVariation: () => number;
    nextTimeSpan: () => number;
}

export const MAX_UINT16 = 65536.0;
export const MAX_TIME = 3600;
export const MAX_VARIATION = 1.618;
export const MIN_VARIATION = 0.618;

export class Genome {
    private rawData: Uint16Array;

    constructor(size: number) {
        this.rawData = new Uint16Array(size)
    }

    public createReader(destruct: () => void): IGenomeReader {
        const reader: IGenomeReader = {

            cursor: 0,

            next: () => {
                if (reader.cursor === this.rawData.length - 1) {
                    destruct();
                }
                return this.rawData[reader.cursor++] / MAX_UINT16;
            },

            nextChoice: (maxChoice: number) => {
                // const zeroToOne = reader.next();
                // const choice = Math.floor(maxChoice * zeroToOne);
                // console.log(`${maxChoice} * ${zeroToOne} = ${choice}`);
                // return choice;
                return Math.floor(maxChoice * reader.next());
            },

            nextVariation: () => {
                const zeroToOne = reader.next();
                return MAX_VARIATION * zeroToOne + MIN_VARIATION * (1.0 - zeroToOne);
            },

            nextTimeSpan(): number {
                return reader.nextChoice(MAX_TIME);
            },
        };
        return reader;
    }

    public randomize(): Genome {
        for (let which = 0; which < this.rawData.length; which++) {
            this.randomizeNuance(which);
        }
        return this;
    }

    public mutate(): void {
        this.randomizeNuance(Math.floor(Math.random() * this.rawData.length));
    }

    private randomizeNuance(which: number) {
        this.rawData[which] = Math.floor(Math.random() * MAX_UINT16);
    }
}
