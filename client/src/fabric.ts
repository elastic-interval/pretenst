import {BufferGeometry, Float32BufferAttribute, Vector3} from 'three';

export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabricExports {

    memory: IMemory;

    init(joints: number, intervals: number, faces: number): number;

    joints(): number;

    intervals(): number;

    faces(): number;

    iterate(ticks: number): void;

    centralize(altitude: number): void;

    nextJointTag(): number;

    createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number;

    getJointTag(jointIndex: number): number;

    getJointLaterality(jointIndex: number): number;

    createInterval(role: number, alphaIndex: number, omegaIndex: number, span: number): number;

    getIntervalRole(intervalIndex: number): number;

    setIntervalRole(intervalIndex: number, role: number): number;

    findOppositeIntervalIndex(intervalIndex: number): number;

    triggerInterval(intervalIndex: number): void;

    createFace(joint0Index: number, joint1Index: number, joint2Index: number, apexJointIndex: number): number;

    removeFace(faceIndex: number): void;

    findOppositeFaceIndex(faceIndex: number): number;

    getFaceJointIndex(faceIndex: number, jointNumber: number): number;

    getFaceAverageIdealSpan(faceIndex: number): number;

    setBehaviorTime(behaviorIndex: number, variationIndex: number, behaviorTime: number): void;

    setBehaviorSpanVariation(behaviorIndex: number, variationIndex: number, behaviorVariation: number): void;
}

export const BILATERAL_MIDDLE = 0;
export const BILATERAL_RIGHT = 1;
export const BILATERAL_LEFT = 2;

export const vectorFromIndex = (array: Float32Array, index: number) => new Vector3(array[index], array[index + 1], array[index + 2]);

export interface IFace {
    fabric: EigFabric;
    index: number;
    laterality: number;
    midpoint: Vector3;
    normal: Vector3;
    jointIndex: number[];
    jointTag: string[];
    averageIdealSpan: number;
    createTetra: () => void;
}

export class EigFabric {
    private arrayBuffer: ArrayBuffer;
    private fabricBytes: number;
    private intervalCountMax: number;
    private faceCountMax: number;
    private lineLocationOffset: number;
    private lineColorsOffset: number;
    private faceMidpointsOffset: number;
    private faceNormalsOffset: number;
    private faceLocationsOffset: number;

    constructor(
        private fab: IFabricExports,
        private jointCountMax: number
    ) {
        // good guesses
        this.intervalCountMax = jointCountMax * 4;
        this.faceCountMax = jointCountMax * 2;
        // sizes
        const vectorsPerLine = 2;
        const floatsInVector = 3;
        const vectorsForFace = 3;
        const lineLocationFloats = this.intervalCountMax * vectorsPerLine * floatsInVector;
        const lineColorFloats = lineLocationFloats;
        const faceVectorFloats = this.faceCountMax * floatsInVector;
        const faceJointFloats = faceVectorFloats * vectorsForFace;
        // offsets
        this.faceLocationsOffset = (
            this.faceNormalsOffset = (
                this.faceMidpointsOffset = (
                    this.lineColorsOffset = (
                        this.lineLocationOffset = 0
                    ) + lineLocationFloats * Float32Array.BYTES_PER_ELEMENT
                ) + lineColorFloats * Float32Array.BYTES_PER_ELEMENT
            ) + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT
        ) + faceJointFloats * Float32Array.BYTES_PER_ELEMENT;
        this.fabricBytes = fab.init(jointCountMax, this.intervalCountMax, this.faceCountMax);
        this.arrayBuffer = fab.memory.buffer;
    }

    public get faceMidpoints(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.faceMidpointsOffset, this.fab.faces() * 3);
    }

    public get faceLocations(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.faceLocationsOffset, this.fab.faces() * 3 * 3);
    }

    public get faceNormals(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.faceNormalsOffset, this.fab.faces() * 3 * 3);
    }

    public get lineLocations(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.lineLocationOffset, this.fab.intervals() * 2 * 3);
    }

    public get lineColors(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.lineColorsOffset, this.fab.intervals() * 2 * 3);
    }

    public get facesGeometry(): BufferGeometry {
        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(this.faceLocations, 3));
        geometry.addAttribute('normal', new Float32BufferAttribute(this.faceNormals, 3));
        return geometry;
    }

    public get lineSegmentsGeometry(): BufferGeometry {
        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(this.lineLocations, 3));
        geometry.addAttribute('color', new Float32BufferAttribute(this.lineColors, 3));
        return geometry;
    }

    public get initBytes() {
        return this.fabricBytes;
    }

    public get bytes() {
        return this.arrayBuffer.byteLength;
    }

    public createTetrahedron(): void {
        const R = Math.sqrt(2) / 2;
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R, -R, R);
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, -R, R, R);
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, -R, -R, -R);
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R, R, -R);
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
        const R = Math.sqrt(2) / 2;
        for (let walk = 0; walk < corners; walk++) {
            const angle = walk * Math.PI * 2 / corners;
            this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R * Math.sin(angle), R + R * Math.cos(angle), 0);
        }
        const jointPairName = this.fab.nextJointTag();
        const left = this.createJoint(jointPairName, BILATERAL_LEFT, 0, R, -R);
        const right = this.createJoint(jointPairName, BILATERAL_RIGHT, 0, R, R);
        for (let walk = 0; walk < corners; walk++) {
            this.createInterval(walk, (walk + 1) % corners, -1);
            this.createInterval(walk, left, -1);
            this.createInterval(walk, right, -1);
            this.createInterval(left, right, -1);
        }
        for (let walk = 0; walk < corners; walk++) {
            this.createFace(left, walk, (walk + 1) % corners, this.jointCountMax);
            this.createFace(right, (walk + 1) % corners, walk, this.jointCountMax);
        }
    }

    public init(joints: number, intervals: number, faces: number): number {
        return this.fab.init(joints, intervals, faces);
    }

    public iterate(ticks: number): void {
        this.fab.iterate(ticks);
    }

    public centralize(altitude: number): void {
        this.fab.centralize(altitude);
    }

    public createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number {
        return this.fab.createJoint(jointTag, laterality, x, y, z);
    }

    public createInterval(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fab.createInterval(0, alphaIndex, omegaIndex, span);
    }

    public get intervalCount(): number {
        return this.fab.intervals();
    }

    public createFace(joint0Index: number, joint1Index: number, joint2Index: number, apexJointIndex: number): number {
        return this.fab.createFace(joint0Index, joint1Index, joint2Index, apexJointIndex);
    }

    public removeFace(faceIndex: number): void {
        this.fab.removeFace(faceIndex);
    }

    public getFace(faceIndex: number): IFace {
        const getFaceLaterality = () => {
            for (let jointWalk = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
                const jointLaterality = this.fab.getJointLaterality(this.fab.getFaceJointIndex(faceIndex, jointWalk));
                if (jointLaterality !== BILATERAL_MIDDLE) {
                    return jointLaterality;
                }
            }
            return BILATERAL_MIDDLE;
        };
        const jointIndex = [0, 1, 2, 3]
            .map(jointNumber => this.fab.getFaceJointIndex(faceIndex, jointNumber));
        const normal = [0, 1, 2]
            .map(jointNumber => vectorFromIndex(this.faceNormals, (faceIndex * 3 + jointNumber) * 3))
            .reduce((prev, current) => prev.add(current), new Vector3()).multiplyScalar(1 / 3.0);
        const face: IFace = {
            fabric: this,
            index: faceIndex,
            laterality: getFaceLaterality(),
            midpoint: vectorFromIndex(this.faceMidpoints, faceIndex * 3),
            normal,
            jointIndex,
            jointTag: jointIndex.map(index => `${this.fab.getJointTag(index)}[${this.fab.getJointLaterality(index)}]`),
            averageIdealSpan: this.fab.getFaceAverageIdealSpan(faceIndex),
            createTetra: () => this.createTetraFromFace(face)
        };
        return face;
    }

    // Mutations ============================================

    public setRandomIntervalRole(intervalIndex: number): void {
        const role = Math.floor(Math.random() * 64);
        this.fab.setIntervalRole(intervalIndex, role);
        this.fab.triggerInterval(intervalIndex);
        const oppositeIntervalIndex = this.fab.findOppositeIntervalIndex(intervalIndex);
        if (oppositeIntervalIndex < this.intervalCountMax) {
            this.fab.setIntervalRole(oppositeIntervalIndex, -role);
            this.fab.triggerInterval(oppositeIntervalIndex);
        }
    }

    public setRandomBehaviorFeature(): void {
        const behaviorIndex = Math.floor(Math.random() * 64);
        const variationIndexIndex = Math.floor(Math.random() * 3);
        if (Math.random() < 0.5) {
            const behaviorTime = Math.floor(Math.random() * 65536);
            this.fab.setBehaviorTime(behaviorIndex, variationIndexIndex, behaviorTime);
        } else {
            const behaviorVariation = Math.floor((Math.random() - 0.5) * 65536);
            this.fab.setBehaviorSpanVariation(behaviorIndex, variationIndexIndex, behaviorVariation);
        }
    }

    // ==========================================================

    private createTetraFromFace(face: IFace, knownApexTag?: number) {
        const midpoint = new Vector3(face.midpoint.x, face.midpoint.y, face.midpoint.z);
        const apexLocation = new Vector3(face.normal.x, face.normal.y, face.normal.z).multiplyScalar(face.averageIdealSpan * Math.sqrt(2 / 3)).add(midpoint);
        const apexTag = knownApexTag ? knownApexTag : this.fab.nextJointTag();
        const apex = this.createJoint(apexTag, face.laterality, apexLocation.x, apexLocation.y, apexLocation.z);
        this.createInterval(face.jointIndex[0], apex, face.averageIdealSpan);
        this.createInterval(face.jointIndex[1], apex, face.averageIdealSpan);
        this.createInterval(face.jointIndex[2], apex, face.averageIdealSpan);
        const existingApexIndex = face.jointIndex[3];
        if (existingApexIndex < this.jointCountMax) {
            this.createInterval(existingApexIndex, apex, face.averageIdealSpan * 2 * Math.sqrt(2 / 3));
        }
        this.createFace(face.jointIndex[0], face.jointIndex[1], apex, face.jointIndex[2]);
        this.createFace(face.jointIndex[1], face.jointIndex[2], apex, face.jointIndex[0]);
        this.createFace(face.jointIndex[2], face.jointIndex[0], apex, face.jointIndex[1]);
        if (!knownApexTag) {
            const oppositeFaceIndex = this.fab.findOppositeFaceIndex(face.index);
            if (oppositeFaceIndex < this.faceCountMax) {
                const oppositeFace = this.getFace(oppositeFaceIndex);
                this.createTetraFromFace(oppositeFace, apexTag);
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