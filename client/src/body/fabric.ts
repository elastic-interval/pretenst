import {BufferGeometry, Float32BufferAttribute, Geometry, Vector3} from 'three';
import {FabricKernel, vectorFromFloatArray} from './fabric-kernel';
import {Direction, IFabricExports} from './fabric-exports';
import {FaceSnapshot, IJointSnapshot} from './face-snapshot';

export const BILATERAL_MIDDLE = 0;
export const BILATERAL_RIGHT = 1;
export const BILATERAL_LEFT = 2;
export const INTERVAL_MUSCLE_STATIC = -32767;
export const INTERVAL_MUSCLE_GROWING = -32766;
export const HANGING_DELAY = 3000;
export const HUNG_ALTITUDE = 7;
export const SEED_CORNERS = 5;
export const NORMAL_TICKS = 40;

export const INTERVALS_RESERVED = 1;

export class Fabric {
    private kernel: FabricKernel;
    private intervalCountMax: number;
    private faceCountMax: number;
    private facesGeometryStored: BufferGeometry | undefined;
    private lineSegmentsGeometryStored: BufferGeometry | undefined;

    constructor(private fabricExports: IFabricExports, public jointCountMax: number) {
        this.intervalCountMax = jointCountMax * 3 + 30;
        this.faceCountMax = jointCountMax * 2 + 20;
        this.kernel = new FabricKernel(fabricExports, this.jointCountMax, this.intervalCountMax, this.faceCountMax);
    }

    public disposeOfGeometry(): void {
        if (this.facesGeometryStored) {
            this.facesGeometryStored.dispose();
            this.facesGeometryStored = undefined;
        }
        if (this.lineSegmentsGeometryStored) {
            this.lineSegmentsGeometryStored.dispose();
            this.lineSegmentsGeometryStored = undefined;
        }
    }

    public get midpoint(): Vector3 {
        return this.kernel.midpoint;
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

    public get muscleCount() {
        return this.fabricExports.muscles();
    }

    public getFaceHighlightGeometries(faceIndex: number): Geometry[] {
        const createGeometry = (index: number) => {
            const face = this.getFaceSnapshot(index);
            const apexHeight = face.averageIdealSpan * Math.sqrt(2 / 3);
            const apex = new Vector3().add(face.midpoint).addScaledVector(face.normal, apexHeight);
            const faceOffset = face.index * 3;
            const faceLocations = this.kernel.faceLocations;
            const geometry = new Geometry();
            geometry.vertices = [
                vectorFromFloatArray(faceLocations, faceOffset * 3), apex,
                vectorFromFloatArray(faceLocations, (faceOffset + 1) * 3), apex,
                vectorFromFloatArray(faceLocations, (faceOffset + 2) * 3), apex
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
        if (this.facesGeometryStored) {
            this.facesGeometryStored.dispose();
            this.facesGeometryStored = undefined;
        }
        this.facesGeometryStored = geometry;
        return geometry;
    }

    public get lineSegmentsGeometry(): BufferGeometry {
        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(this.kernel.lineLocations, 3));
        geometry.addAttribute('color', new Float32BufferAttribute(this.kernel.lineColors, 3));
        if (this.lineSegmentsGeometryStored) {
            this.lineSegmentsGeometryStored.dispose();
            this.lineSegmentsGeometryStored = undefined;
        }
        this.lineSegmentsGeometryStored = geometry;
        return geometry;
    }

    // public createTetrahedron(): void {
    //     const R = Math.sqrt(2) / 2;
    //     this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, R, -R, R);
    //     this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, -R, R, R);
    //     this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, -R, -R, -R);
    //     this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, R, R, -R);
    //     this.interval(0, 1, -1);
    //     this.interval(1, 2, -1);
    //     this.interval(2, 3, -1);
    //     this.interval(2, 0, -1);
    //     this.interval(0, 3, -1);
    //     this.interval(3, 1, -1);
    //     this.face(0, 1, 2);
    //     this.face(1, 3, 2);
    //     this.face(1, 0, 3);
    //     this.face(2, 3, 0);
    // }

    public createSeed(x: number, y: number): void {
        const hanger = new Vector3(x, 0, y);
        const hangerJoint = this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, hanger.x, hanger.y, hanger.z);
        const R = 1;
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const angle = walk * Math.PI * 2 / SEED_CORNERS;
            this.fabricExports.createJoint(
                this.fabricExports.nextJointTag(),
                BILATERAL_MIDDLE,
                R * Math.sin(angle) + hanger.x,
                R * Math.cos(angle) + hanger.y,
                hanger.z);
        }
        const jointPairName = this.fabricExports.nextJointTag();
        const left = this.fabricExports.createJoint(jointPairName, BILATERAL_LEFT, hanger.x, hanger.y, hanger.z - R);
        const right = this.fabricExports.createJoint(jointPairName, BILATERAL_RIGHT, hanger.x, hanger.y, hanger.z + R);
        this.interval(hangerJoint, left, -1);
        this.interval(hangerJoint, right, -1);
        this.interval(left, right, -1);
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.interval(walk + 1, (walk + 1) % SEED_CORNERS + 1, -1);
            this.interval(walk + 1, left, -1);
            this.interval(walk + 1, right, -1);
        }
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.face(left, walk + 1, (walk + 1) % SEED_CORNERS + 1);
            this.face(right, (walk + 1) % SEED_CORNERS + 1, walk + 1);
        }
        hanger.y += this.setAltitude(HUNG_ALTITUDE);
    }

    public iterate(ticks: number, direction: Direction, intensity: number, hanging: boolean): number {
        return this.fabricExports.iterate(ticks, direction, intensity, hanging);
    }

    public removeHanger(): void {
        this.fabricExports.removeHanger();
        this.kernel.refresh();
    }

    public get age(): number {
        return this.fabricExports.age();
    }

    public centralize(): void {
        this.fabricExports.centralize();
    }

    public setAltitude(altitude: number): number {
        return this.fabricExports.setAltitude(altitude);
    }

    public unfold(faceIndex: number, jointNumber: number): FaceSnapshot [] {
        const newJointCount = this.jointCount + 2;
        if (newJointCount >= this.jointCountMax) {
            return [];
        }
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

    public getFaceSnapshot(faceIndex: number): FaceSnapshot {
        return new FaceSnapshot(this, this.kernel, this.fabricExports, faceIndex);
    }

    public setMuscleHighLow(muscleIndex: number, direction: Direction, highLow: number): void {
        this.fabricExports.setMuscleHighLow(muscleIndex, direction, highLow);
    }

    public setIntervalMuscle(intervalIndex: number, intervalMuscle: number): void {
        if (intervalIndex < INTERVALS_RESERVED || intervalIndex >= this.intervalCount) {
            throw new Error(`Bad interval index index ${intervalIndex}`);
        }
        const specialMuscle = intervalMuscle === INTERVAL_MUSCLE_STATIC || intervalMuscle === INTERVAL_MUSCLE_GROWING;
        if (!specialMuscle && Math.abs(intervalMuscle) >= this.muscleCount) {
            throw new Error(`Bad interval muscle: ${intervalMuscle}`);
        }
        // console.log(`I[${intervalIndex}]=${intervalMuscle}`);
        this.fabricExports.setIntervalMuscle(intervalIndex, intervalMuscle); // could be negative
        const oppositeIntervalIndex = this.fabricExports.findOppositeIntervalIndex(intervalIndex);
        if (oppositeIntervalIndex < this.intervalCount) {
            const oppositeIntervalMuscle = specialMuscle ? intervalMuscle : Math.abs(intervalMuscle); // same if positive, opposite if negative
            // console.log(`O[${oppositeIntervalIndex}]=${oppositeIntervalMuscle}`);
            this.fabricExports.setIntervalMuscle(oppositeIntervalIndex, oppositeIntervalMuscle);
        }
    }

    public triggerInterval(intervalIndex: number): void {
        this.fabricExports.triggerInterval(intervalIndex);
    }

    public toString(): string {
        return `${(this.kernel.blockBytes / 1024).toFixed(1)}k =becomes=> ${this.kernel.bufferBytes / 65536} block(s)`
    }

    // ==========================================================

    private face(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.fabricExports.createFace(joint0Index, joint1Index, joint2Index);
    }

    private interval(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fabricExports.createInterval(INTERVAL_MUSCLE_STATIC, alphaIndex, omegaIndex, span);
    }

    private intervalGrowth(alphaIndex: number, omegaIndex: number, span: number): number {
        const intervalIndex = this.fabricExports.createInterval(INTERVAL_MUSCLE_GROWING, alphaIndex, omegaIndex, span);
        this.fabricExports.triggerInterval(intervalIndex);
        return intervalIndex;
    }

    private unfoldFace(faceToReplace: FaceSnapshot, faceJointIndex: number, apexTag: number): FaceSnapshot [] {
        const jointIndex = faceToReplace.joints.map(faceJoint => faceJoint.jointIndex);
        const sortedJoints = faceToReplace.joints.sort((a: IJointSnapshot, b: IJointSnapshot) => b.tag - a.tag);
        const chosenJoint = sortedJoints[faceJointIndex];
        const apexLocation = new Vector3().add(chosenJoint.location).addScaledVector(faceToReplace.normal, faceToReplace.averageIdealSpan * 0.1);
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
        this.intervalGrowth(chosenJoint.jointIndex, apexIndex, faceToReplace.averageIdealSpan);
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
        faceToReplace.remove();
        this.kernel.refresh();
        return createdFaceIndexes
            .map(index => index - 1) // after removal, since we're above
            .map(index => new FaceSnapshot(this, this.kernel, this.fabricExports, index));
    }
}

