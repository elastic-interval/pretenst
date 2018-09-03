import {Fabric} from './fabric';
import {IGenomeReader} from './genome';
import {FaceSnapshot} from './eig/face-snapshot';

export class GenomeInterpreter {

    private growingFaces: FaceSnapshot [] = [];

    constructor(private fabric: Fabric, private genomeReader: IGenomeReader) {
        this.growingFaces.push(fabric.getFaceSnapshot(0));
        this.growingFaces.push(fabric.getFaceSnapshot(2));
    }

    public step(): boolean {
        const faceChoice = this.genomeReader.nextChoice(this.growingFaces.length);
        const count: number = 5;// + this.genomeReader.nextChoice(5);
        let freshFaces: FaceSnapshot[] = [];
        if (count === 1) {
            const jointNumber: number = 2;// this.genomeReader.nextChoice(3);
            freshFaces = this.fabric.unfold(this.growingFaces[faceChoice].fresh.index, jointNumber);
            if (freshFaces.length > 0) {
                this.growingFaces[faceChoice] = freshFaces[2];
            }
            // console.log(`Single ${jointNumber} ${freshFaces}`);
        } else {
            for (let x = 0; x < count; x++) {
                const faceIndex = this.growingFaces[faceChoice].fresh.index;
                freshFaces = this.fabric.unfold(faceIndex, 2);
                if (freshFaces.length > 0) {
                    this.growingFaces[faceChoice] = freshFaces[2];
                }
                // console.log(`Multiple ${x}/${count} ${freshFaces}`);
            }
        }
        console.log(`J=${this.fabric.jointCount} I=${this.fabric.intervalCount} F=${this.fabric.faceCount}`);
        return freshFaces.length > 0;
    }
}