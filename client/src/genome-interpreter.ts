import {Fabric, IFace} from './fabric';
import {IGenomeReader} from './genome';

export interface IGrowthStep {
    piority: number;

    grow(): IFace[];
}

export class GenomeInterpreter {

    private steps: IGrowthStep[] = [];

    constructor(private fabric: Fabric, private genomeReader: IGenomeReader) {
        this.steps.push({
            piority: 3,
            grow: () => {
                let index: IFace[] = [];
                for (let x = 0; x < 5; x++) {
                    index = this.fabric.createTetra(this.fabric.faceCount - 1, 2)
                }
                return index;
            }
        });
        this.steps.push({
            piority: 1,
            grow: () => {
                return this.fabric.createTetra(this.fabric.faceCount - 1, 1);
            }
        });
    }

    public step(): boolean {
        const choice = this.genomeReader.nextChoice(this.steps.length);
        const faces = this.steps[choice].grow();
        console.log(`J=${this.fabric.jointCount} I=${this.fabric.intervalCount} F=${this.fabric.faceCount}`);
        return faces.length > 0;
    }
}