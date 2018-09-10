import {GeneSequence} from './gene-sequence';
import {FaceSnapshot} from '../body/face-snapshot';
import {Fabric} from '../body/fabric';

const UNFOLD_JOINT = 2;
const FACE_AHEAD = 2;

export class Embryology {

    private growingFaces: FaceSnapshot [] = [];

    constructor(private fabric: Fabric, private growthGene: GeneSequence) {
        this.growingFaces.push(fabric.getFaceSnapshot(0));
        if (this.growthGene.nextChoice(3)) {
            this.growingFaces.push(fabric.getFaceSnapshot(2));
            if (!this.growthGene.nextChoice(3)) {
                this.growingFaces.push(fabric.getFaceSnapshot(4));
            }
        }
    }

    public step(): boolean {
        const freshFaces: FaceSnapshot[] = [];
        for (let growingFace = 0; growingFace < this.growingFaces.length; growingFace++) {
            const count: number = 1 + this.growthGene.nextChoice(5);
            if (count < 3) { // maybe go crooked
                const unfoldJoint = this.growingFaces[growingFace].isDerived ? UNFOLD_JOINT : this.growthGene.nextChoice(3);
                const unfoldedFaces = this.fabric.unfold(this.growingFaces[growingFace].fresh.index, unfoldJoint);
                const nextFace: number = this.growthGene.nextChoice(2);
                if (unfoldedFaces.length > 0) {
                    this.growingFaces[growingFace] = unfoldedFaces[nextFace];
                }
                freshFaces.push(...unfoldedFaces);
            } else {
                for (let x = 0; x < count; x++) {
                    const faceIndex = this.growingFaces[growingFace].fresh.index;
                    const unfoldedFaces = this.fabric.unfold(faceIndex, UNFOLD_JOINT);
                    if (unfoldedFaces.length > 0) {
                        this.growingFaces[growingFace] = unfoldedFaces[FACE_AHEAD];
                    }
                    freshFaces.push(...unfoldedFaces);
                }
            }
        }
        return freshFaces.length > 0;
    }
}