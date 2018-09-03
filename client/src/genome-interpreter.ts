import {Fabric} from './fabric';
import {IGenomeReader} from './genome';

export class GenomeInterpreter {

    private growingFaceIndexes: number [] = [];

    constructor(private fabric: Fabric, private genomeReader: IGenomeReader) {
        this.growingFaceIndexes.push(0);
    }

    public step(): boolean {
        const faceChoice = this.genomeReader.nextChoice(this.growingFaceIndexes.length);
        const count: number = 5;// + this.genomeReader.nextChoice(5);
        let freshFaceIndexes: number[] = [];
        if (count === 1) {
            const jointNumber: number = 2;// this.genomeReader.nextChoice(3);
            freshFaceIndexes = this.fabric.unfold(this.growingFaceIndexes[faceChoice], jointNumber);
            this.growingFaceIndexes[faceChoice] = freshFaceIndexes[2];
            console.log(`Single ${jointNumber} ${freshFaceIndexes}`);
        } else {
            for (let x = 0; x < count; x++) {
                const faceIndex = this.growingFaceIndexes[faceChoice];
                freshFaceIndexes = this.fabric.unfold(faceIndex, 2);
                this.growingFaceIndexes[faceChoice] = freshFaceIndexes[2];
                console.log(`Multiple ${x}/${count} ${freshFaceIndexes}`);
            }
        }
        console.log(`J=${this.fabric.jointCount} I=${this.fabric.intervalCount} F=${this.fabric.faceCount}`);
        return freshFaceIndexes.length > 0;
    }
}