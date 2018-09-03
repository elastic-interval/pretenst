import {BufferGeometry, Float32BufferAttribute, Geometry, Vector3} from 'three';
import {FabricKernel} from './fabric-kernel';
import {IFabricExports} from './fabric-exports';

export const BILATERAL_MIDDLE = 0;
export const BILATERAL_RIGHT = 1;
export const BILATERAL_LEFT = 2;

const vectorFromIndex = (array: Float32Array, index: number) => new Vector3(array[index], array[index + 1], array[index + 2]);

export interface IJointSnapshot {
    jointNumber: number;
    jointIndex: number;
    tag: number;
    location: Vector3;
}

export interface IFaceSnapshot {
    fabric: Fabric;
    index: number;
    laterality: number;
    midpoint: Vector3;
    normal: Vector3;
    joints: IJointSnapshot[];
    averageIdealSpan: number;
}

export class Fabric {
    private kernel: FabricKernel;
    private intervalCountMax: number;
    private faceCountMax: number;

    constructor(private fabricExports: IFabricExports, private jointCountMax: number) {
        this.intervalCountMax = jointCountMax * 3;
        this.faceCountMax = jointCountMax * 2;
        this.kernel = new FabricKernel(fabricExports, this.jointCountMax, this.intervalCountMax, this.faceCountMax);
    }

    public get jointCount() {
        return this.fabricExports.joints();
    }

    public get intervalCount() {
        return this.fabricExports.intervals();
    }

    public get faceCount() {
        return this.fabricExports.faces();
    }

    public getFaceHighlightGeometries(faceIndex: number): Geometry[] {
        const createGeometry = (index: number) => {
            const geometry = new Geometry();
            const face = this.getFaceSnapshot(index);
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
        this.interval(0, 1, -1);
        this.interval(1, 2, -1);
        this.interval(2, 3, -1);
        this.interval(2, 0, -1);
        this.interval(0, 3, -1);
        this.interval(3, 1, -1);
        this.face(0, 1, 2);
        this.face(1, 3, 2);
        this.face(1, 0, 3);
        this.face(2, 3, 0);
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
            this.interval(walk, (walk + 1) % corners, -1);
            this.interval(walk, left, -1);
            this.interval(walk, right, -1);
            this.interval(left, right, -1);
        }
        for (let walk = 0; walk < corners; walk++) {
            this.face(left, walk, (walk + 1) % corners);
            this.face(right, (walk + 1) % corners, walk);
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

    public unfold(faceIndex: number, jointNumber: number): number [] {
        const apexTag = this.fabricExports.nextJointTag();
        let oppositeFaceIndex = this.fabricExports.findOppositeFaceIndex(faceIndex);
        const freshFaces = this.unfoldFace(this.getFaceSnapshot(faceIndex), jointNumber, apexTag);
        if (oppositeFaceIndex < this.kernel.faceCountMax) {
            if (oppositeFaceIndex > faceIndex) {
                oppositeFaceIndex--; // since faceIndex was deleted
            }
            const oppositeFace = this.getFaceSnapshot(oppositeFaceIndex);
            return this.unfoldFace(oppositeFace, jointNumber, apexTag);
        } else {
            return freshFaces;
        }
    }

    public getFaceSnapshot(faceIndex: number): IFaceSnapshot {
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
        const joints: IJointSnapshot[] = triangle
            .map(jointNumber => {
                const jointIndex = this.fabricExports.getFaceJointIndex(faceIndex, jointNumber);
                const tag = this.fabricExports.getJointTag(jointIndex);
                const location = vectorFromIndex(this.kernel.faceLocations, (faceIndex * 3 + jointNumber) * 3);
                return {jointNumber, jointIndex, tag, location} as IJointSnapshot;
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
            averageIdealSpan: this.fabricExports.getFaceAverageIdealSpan(faceIndex)
        };
    }

    public toString(): string {
        return `${(this.kernel.blockBytes / 1024).toFixed(1)}k =becomes=> ${this.kernel.bufferBytes / 65536} block(s)`
    }

    // ==========================================================

    private face(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.fabricExports.createFace(joint0Index, joint1Index, joint2Index);
    }

    private interval(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fabricExports.createInterval(0, alphaIndex, omegaIndex, span);
    }

    private trigger(intervalIndex: number): void {
        if (intervalIndex < this.intervalCountMax) {
            this.fabricExports.triggerInterval(intervalIndex);
        }
    }

    private unfoldFace(faceToReplace: IFaceSnapshot, faceJointIndex: number, apexTag: number): number [] {
        const jointIndex = faceToReplace.joints.map(faceJoint => faceJoint.jointIndex);
        const sortedJoints = faceToReplace.joints.sort((a: IJointSnapshot, b: IJointSnapshot) => b.tag - a.tag);
        const chosenJoint = sortedJoints[faceJointIndex];
        const apexLocation = new Vector3().add(chosenJoint.location).addScaledVector(faceToReplace.normal, faceToReplace.averageIdealSpan * 0.05);
        const apexIndex = this.fabricExports.createJoint(apexTag, faceToReplace.laterality, apexLocation.x, apexLocation.y, apexLocation.z);
        if (apexIndex >= this.jointCountMax) {
            return [];
        }
        sortedJoints.forEach(faceJoint => {
            if (faceJoint.jointNumber !== chosenJoint.jointNumber) {
                const idealSpan = new Vector3().subVectors(faceJoint.location, apexLocation).length();
                this.interval(faceJoint.jointIndex, apexIndex, idealSpan);
            }
        });
        this.trigger(this.interval(chosenJoint.jointIndex, apexIndex, faceToReplace.averageIdealSpan));
        const createdFaceIndexes: number[] = [];
        sortedJoints.map(joint => joint.jointNumber).forEach((jointNumber: number, index: number) => { // youngest first
            switch (jointNumber) {
                case 0:
                    createdFaceIndexes[index] = this.face(jointIndex[1], jointIndex[2], apexIndex);
                    break;
                case 1:
                    createdFaceIndexes[index] = this.face(jointIndex[2], jointIndex[0], apexIndex);
                    break;
                case 2:
                    createdFaceIndexes[index] = this.face(jointIndex[0], jointIndex[1], apexIndex);
                    break;
            }
        });
        this.fabricExports.removeFace(faceToReplace.index);
        return createdFaceIndexes.map(index => index - 1); // after removal, since we're above
    }
}

