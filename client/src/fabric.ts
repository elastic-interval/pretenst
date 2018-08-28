import {BufferGeometry, Float32BufferAttribute, Geometry, Vector3} from 'three';
import {FabricKernel} from './fabric-kernel';
import {IFabricExports} from './fabric-exports';

export const BILATERAL_MIDDLE = 0;
export const BILATERAL_RIGHT = 1;
export const BILATERAL_LEFT = 2;

const vectorFromIndex = (array: Float32Array, index: number) => new Vector3(array[index], array[index + 1], array[index + 2]);

interface IFaceJoint {
    jointNumber: number;
    jointIndex: number;
    tag: number;
    location: Vector3;
}

interface IFace {
    fabric: Fabric;
    index: number;
    laterality: number;
    midpoint: Vector3;
    normal: Vector3;
    joints: IFaceJoint[];
    concaveApexIndex: number;
    averageIdealSpan: number;
}

export class Fabric {
    private kernel: FabricKernel;

    constructor(private fabricExports: IFabricExports, jointCountMax: number) {
        this.kernel = new FabricKernel(fabricExports, jointCountMax, jointCountMax * 4, jointCountMax * 2);
    }

    public get faceCount() {
        return this.fabricExports.faces();
    }

    public getFaceHighlightGeometries(faceIndex: number): Geometry[] {
        const createGeometry = (index: number) => {
            const geometry = new Geometry();
            const face = this.getFace(index);
            const apexHeight = face.averageIdealSpan * Math.sqrt(2 / 3);
            const apex = new Vector3().add(face.midpoint).addScaledVector(face.normal, apexHeight);
            const faceOffset = face.index * 3;
            const faceLocations = face.fabric.kernel.faceLocations;
            geometry.vertices = [
                vectorFromIndex(faceLocations, faceOffset * 3), apex,
                vectorFromIndex(faceLocations, (faceOffset + 1) * 3), apex,
                vectorFromIndex(faceLocations, (faceOffset + 2) * 3), apex
            ];
            return geometry;
        };
        const geometries: Geometry[] = [];
        geometries.push(createGeometry(faceIndex));
        const oppositeFaceIndex = this.fabricExports.findOppositeFaceIndex(faceIndex);
        if (oppositeFaceIndex < this.fabricExports.faces()) {
            geometries.push(createGeometry(oppositeFaceIndex));
        }
        return geometries;
    }

    public get facesGeometry(): BufferGeometry {
        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(this.kernel.faceLocations, 3));
        geometry.addAttribute('normal', new Float32BufferAttribute(this.kernel.faceNormals, 3));
        return geometry;
    }

    public get lineSegmentsGeometry(): BufferGeometry {
        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(this.kernel.lineLocations, 3));
        geometry.addAttribute('color', new Float32BufferAttribute(this.kernel.lineColors, 3));
        return geometry;
    }

    public createTetrahedron(): void {
        const R = Math.sqrt(2) / 2;
        this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, R, -R, R);
        this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, -R, R, R);
        this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, -R, -R, -R);
        this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, R, R, -R);
        this.createInterval(0, 1, -1);
        this.createInterval(1, 2, -1);
        this.createInterval(2, 3, -1);
        this.createInterval(2, 0, -1);
        this.createInterval(0, 3, -1);
        this.createInterval(3, 1, -1);
        this.createFace(0, 1, 2, 3);
        this.createFace(1, 3, 2, 0);
        this.createFace(1, 0, 3, 2);
        this.createFace(2, 3, 0, 1);
    }

    public createSeed(corners: number): void {
        const R = 1;
        for (let walk = 0; walk < corners; walk++) {
            const angle = walk * Math.PI * 2 / corners;
            this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, R * Math.sin(angle), R + R * Math.cos(angle), 0);
        }
        const jointPairName = this.fabricExports.nextJointTag();
        const left = this.fabricExports.createJoint(jointPairName, BILATERAL_LEFT, 0, R, -R);
        const right = this.fabricExports.createJoint(jointPairName, BILATERAL_RIGHT, 0, R, R);
        for (let walk = 0; walk < corners; walk++) {
            this.createInterval(walk, (walk + 1) % corners, -1);
            this.createInterval(walk, left, -1);
            this.createInterval(walk, right, -1);
            this.createInterval(left, right, -1);
        }
        const nonexistentApex = this.kernel.jointCountMax;
        for (let walk = 0; walk < corners; walk++) {
            this.createFace(left, walk, (walk + 1) % corners, nonexistentApex);
            this.createFace(right, (walk + 1) % corners, walk, nonexistentApex);
        }
    }

    public iterate(ticks: number): number {
        return this.fabricExports.iterate(ticks);
    }

    public get age(): number {
        return this.fabricExports.age();
    }

    public centralize(altitude: number, intensity: number): void {
        this.fabricExports.centralize(altitude, intensity);
    }

    public createTetra(faceIndex: number): void {
        this.unfoldFace(this.getFace(faceIndex));
    }

    public toString(): string {
        return `${(this.kernel.blockBytes / 1024).toFixed(1)}k =becomes=> ${this.kernel.bufferBytes / 65536} block(s)`
    }

    // ==========================================================

    private createFace(joint0Index: number, joint1Index: number, joint2Index: number, apexJointIndex: number): number {
        return this.fabricExports.createFace(joint0Index, joint1Index, joint2Index, apexJointIndex);
    }

    private removeFace(faceIndex: number): void {
        this.fabricExports.removeFace(faceIndex);
    }

    private createInterval(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fabricExports.createInterval(0, alphaIndex, omegaIndex, span);
    }

    private getFace(faceIndex: number): IFace {
        const getFaceLaterality = () => {
            for (let jointWalk = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
                const jointLaterality = this.fabricExports.getJointLaterality(this.fabricExports.getFaceJointIndex(faceIndex, jointWalk));
                if (jointLaterality !== BILATERAL_MIDDLE) {
                    return jointLaterality;
                }
            }
            return BILATERAL_MIDDLE;
        };
        const faceLaterality = getFaceLaterality();
        const triangle = [0, 1, 2];
        const joints: IFaceJoint[] = triangle
            .map(jointOfFace => {
                const jointIndex = this.fabricExports.getFaceJointIndex(faceIndex, jointOfFace);
                const tag = this.fabricExports.getJointTag(jointIndex);
                const location = vectorFromIndex(this.kernel.faceLocations, (faceIndex * 3 + jointOfFace) * 3);
                return {jointIndex, tag, location} as IFaceJoint;
            });
        return {
            fabric: this,
            index: faceIndex,
            laterality: faceLaterality,
            midpoint: vectorFromIndex(this.kernel.faceMidpoints, faceIndex * 3),
            normal: triangle
                .map(jointNumber => vectorFromIndex(
                    this.kernel.faceNormals,
                    (faceIndex * 3 + jointNumber) * 3
                ))
                .reduce((prev, current) => prev.add(current), new Vector3())
                .multiplyScalar(1 / 3.0),
            joints,
            concaveApexIndex: this.fabricExports.getFaceJointIndex(faceIndex, 3),
            averageIdealSpan: this.fabricExports.getFaceAverageIdealSpan(faceIndex)
        };
    }

    private unfoldFace(face: IFace, knownApexTag?: number) {
        // const sortOnTag = (a: IFaceJoint, b: IFaceJoint) => a.tag - b.tag;
        const chosenJoint = 0;
        const apexLocation = new Vector3().add(face.joints[chosenJoint].location).addScaledVector(face.normal, face.averageIdealSpan * 0.05);
        const apexTag = knownApexTag ? knownApexTag : this.fabricExports.nextJointTag();
        const apex = this.fabricExports.createJoint(apexTag, face.laterality, apexLocation.x, apexLocation.y, apexLocation.z);
        const intervalIndex = this.createInterval(face.joints[chosenJoint].jointIndex, apex, face.averageIdealSpan);
        this.fabricExports.triggerInterval(intervalIndex);
        face.joints.forEach(faceJoint => {
            if (faceJoint.jointNumber !== chosenJoint) {
                this.createInterval(faceJoint.jointIndex, apex, -1);
            }
        });
        if (face.concaveApexIndex < this.kernel.jointCountMax) {
            // this.createInterval(face.concaveApexIndex, apex, face.averageIdealSpan * 2 * Math.sqrt(2 / 3));
        }
        const jointIndex = face.joints.map(faceJoint => faceJoint.jointIndex);
        this.createFace(jointIndex[0], jointIndex[1], apex, jointIndex[2]);
        this.createFace(jointIndex[1], jointIndex[2], apex, jointIndex[0]);
        this.createFace(jointIndex[2], jointIndex[0], apex, jointIndex[1]);
        if (!knownApexTag) {
            const oppositeFaceIndex = this.fabricExports.findOppositeFaceIndex(face.index);
            if (oppositeFaceIndex < this.kernel.faceCountMax) {
                const oppositeFace = this.getFace(oppositeFaceIndex);
                this.unfoldFace(oppositeFace, apexTag);
                if (oppositeFaceIndex < face.index) {
                    this.removeFace(oppositeFaceIndex);
                    this.removeFace(face.index - 1);
                } else {
                    this.removeFace(face.index);
                    this.removeFace(oppositeFaceIndex - 1);
                }
            } else {
                this.removeFace(face.index);
            }
        }
    }
}

