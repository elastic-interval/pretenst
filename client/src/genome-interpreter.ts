import {Fabric} from './fabric';
import {IGenomeReader} from './genome';
import {FaceSnapshot} from './eig/face-snapshot';

const UNFOLD_JOINT = 2;
const FACE_AHEAD = 2;

export class GenomeInterpreter {

    private growingFaces: FaceSnapshot [] = [];

    constructor(private fabric: Fabric, private genomeReader: IGenomeReader) {
        this.growingFaces.push(fabric.getFaceSnapshot(0));
        if (this.genomeReader.nextChoice(2)) {
            this.growingFaces.push(fabric.getFaceSnapshot(2));
            if (!this.genomeReader.nextChoice(3)) {
                this.growingFaces.push(fabric.getFaceSnapshot(4));
            }
        }
    }

    public step(): boolean {
        const freshFaces: FaceSnapshot[] = [];
        for (let growingFace = 0; growingFace < this.growingFaces.length; growingFace++) {
            const count: number = 1 + this.genomeReader.nextChoice(5);
            if (count < 3) { // maybe go crooked
                const unfoldJoint = this.growingFaces[growingFace].isDerived ? UNFOLD_JOINT : this.genomeReader.nextChoice(3);
                const unfoldedFaces = this.fabric.unfold(this.growingFaces[growingFace].fresh.index, unfoldJoint);
                const nextFace: number = this.genomeReader.nextChoice(2);
                if (unfoldedFaces.length > 0) {
                    this.growingFaces[growingFace] = unfoldedFaces[nextFace];
                }
                freshFaces.push(...unfoldedFaces);
                console.log(`Crooked ${nextFace}`);
            } else {
                for (let x = 0; x < count; x++) {
                    const faceIndex = this.growingFaces[growingFace].fresh.index;
                    const unfoldedFaces = this.fabric.unfold(faceIndex, UNFOLD_JOINT);
                    if (unfoldedFaces.length > 0) {
                        this.growingFaces[growingFace] = unfoldedFaces[FACE_AHEAD];
                    }
                    freshFaces.push(...unfoldedFaces);
                }
                console.log(`Straight for ${count}`);
            }
        }
        console.log(`J=${this.fabric.jointCount} I=${this.fabric.intervalCount} F=${this.fabric.faceCount}`);
        return freshFaces.length > 0;
    }
}