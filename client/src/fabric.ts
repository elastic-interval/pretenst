import {Vector3} from 'three';

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

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number;

    removeFace(faceIndex: number): void;

    findOppositeFaceIndex(faceIndex: number): number;

    findFaceApexIndex(faceIndex: number): number;

    getFaceJointIndex(faceIndex: number, jointNumber: number): number;

    getFaceAverageIdealSpan(faceIndex: number): number;
}

export const BILATERAL_MIDDLE = 0;
export const BILATERAL_RIGHT = 1;
export const BILATERAL_LEFT = 2;

export const ROLE_SPRING = 1;
export const ROLE_MUSCLE = 2;
export const ROLE_BAR = 3;
export const ROLE_CABLE = 4;
export const ROLE_TEMPORARY = 5;
export const ROLE_RING_SPRING = 6;
export const ROLE_COUNTER_CABLE = 7;
export const ROLE_HORIZONTAL_CABLE = 8;
export const ROLE_RING_CABLE = 9;
export const ROLE_VERTICAL_CABLE = 10;

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
}

export class EigFabric {
    private fabricBytes: number;
    private lineLocationsArray: Float32Array;
    private lineColorsArray: Float32Array;
    private faceMidpointsArray: Float32Array;
    private faceNormalsArray: Float32Array;
    private faceLocationsArray: Float32Array;
    private intervalCountMax: number;
    private faceCountMax: number;

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
        const lineLocationOffset = 0;
        const lineColorsOffset = lineLocationOffset + lineLocationFloats * Float32Array.BYTES_PER_ELEMENT;
        const midpointOffset = lineColorsOffset + lineColorFloats * Float32Array.BYTES_PER_ELEMENT;
        const normalOffset = midpointOffset + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT;
        const locationOffset = normalOffset + faceJointFloats * Float32Array.BYTES_PER_ELEMENT;
        this.fabricBytes = fab.init(jointCountMax, this.intervalCountMax, this.faceCountMax);
        this.lineLocationsArray = new Float32Array(fab.memory.buffer, lineLocationOffset, lineLocationFloats);
        this.lineColorsArray = new Float32Array(fab.memory.buffer, lineColorsOffset, lineColorFloats);
        this.faceMidpointsArray = new Float32Array(fab.memory.buffer, midpointOffset, faceVectorFloats);
        this.faceNormalsArray = new Float32Array(fab.memory.buffer, normalOffset, faceJointFloats);
        this.faceLocationsArray = new Float32Array(fab.memory.buffer, locationOffset, faceJointFloats);
    }

    public get initBytes() {
        return this.fabricBytes;
    }

    public get bytes() {
        return this.fab.memory.buffer.byteLength;
    }

    public get jointMax() {
        return this.jointCountMax;
    }

    public get intervalMax() {
        return this.intervalCountMax;
    }

    public get faceMax() {
        return this.faceCountMax;
    }

    public get lineLocations(): Float32Array {
        return this.lineLocationsArray;
    }

    public get lineColors(): Float32Array {
        return this.lineColorsArray;
    }

    public get faceMidpoints(): Float32Array {
        return this.faceMidpointsArray;
    }

    public get faceNormals(): Float32Array {
        return this.faceNormalsArray;
    }

    public get faceLocations(): Float32Array {
        return this.faceLocationsArray;
    }

    public createTetrahedron(): void {
        const R = Math.sqrt(2) / 2;
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R, -R, R);
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, -R, R, R);
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, -R, -R, -R);
        this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R, R, -R);
        this.createInterval(ROLE_SPRING, 0, 1, -1);
        this.createInterval(ROLE_SPRING, 1, 2, -1);
        this.createInterval(ROLE_SPRING, 2, 3, -1);
        this.createInterval(ROLE_SPRING, 2, 0, -1);
        this.createInterval(ROLE_SPRING, 0, 3, -1);
        this.createInterval(ROLE_SPRING, 3, 1, -1);
        this.createFace(0, 1, 2);
        this.createFace(1, 3, 2);
        this.createFace(1, 0, 3);
        this.createFace(2, 3, 0);
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
            this.createInterval(ROLE_SPRING, walk, (walk + 1) % corners, -1);
            this.createInterval(ROLE_SPRING, walk, left, -1);
            this.createInterval(ROLE_SPRING, walk, right, -1);
            this.createInterval(ROLE_SPRING, left, right, -1);
        }
        for (let walk = 0; walk < corners; walk++) {
            this.createFace(left, walk, (walk + 1) % corners);
            this.createFace(right, (walk + 1) % corners, walk);
        }
    }

    public createTetraFromFace(face: IFace, knownApexTag?: number) {
        const existingApexIndex = this.fab.findFaceApexIndex(face.index);
        const midpoint = new Vector3(face.midpoint.x, face.midpoint.y, face.midpoint.z);
        const apexLocation = new Vector3(face.normal.x, face.normal.y, face.normal.z).multiplyScalar(face.averageIdealSpan * Math.sqrt(2 / 3)).add(midpoint);
        const apexTag = knownApexTag ? knownApexTag : this.fab.nextJointTag();
        const apex = this.createJoint(apexTag, face.laterality, apexLocation.x, apexLocation.y, apexLocation.z);
        this.createInterval(ROLE_SPRING, face.jointIndex[0], apex, face.averageIdealSpan);
        this.createInterval(ROLE_SPRING, face.jointIndex[1], apex, face.averageIdealSpan);
        this.createInterval(ROLE_SPRING, face.jointIndex[2], apex, face.averageIdealSpan);
        if (existingApexIndex < this.fab.joints()) {
            this.createInterval(ROLE_MUSCLE, existingApexIndex, apex, face.averageIdealSpan * 2);
        }
        this.createFace(face.jointIndex[0], face.jointIndex[1], apex);
        this.createFace(face.jointIndex[1], face.jointIndex[2], apex);
        this.createFace(face.jointIndex[2], face.jointIndex[0], apex);
        if (!knownApexTag) {
            const oppositeFaceIndex = this.fab.findOppositeFaceIndex(face.index);
            if (oppositeFaceIndex < this.faces()) {
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

    // from IFabricExports ==========

    public get memory(): IMemory {
        return this.fab.memory;
    }

    public init(joints: number, intervals: number, faces: number): number {
        return this.fab.init(joints, intervals, faces);
    }

    public joints(): number {
        return this.fab.joints();
    }

    public intervals(): number {
        return this.fab.intervals();
    }

    public faces(): number {
        return this.fab.faces();
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

    public createInterval(role: number, alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fab.createInterval(role, alphaIndex, omegaIndex, span);
    }

    public createFace(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.fab.createFace(joint0Index, joint1Index, joint2Index);
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
        const jointNumbers = [0, 1, 2];
        const jointIndex = jointNumbers.map(jointNumber => this.fab.getFaceJointIndex(faceIndex, jointNumber));
        const normal = jointNumbers
            .map(jointNumber => vectorFromIndex(this.faceNormalsArray, (faceIndex * 3 + jointNumber) * 3))
            .reduce((prev, current) => prev.add(current), new Vector3()).multiplyScalar(1 / 3.0);
        return {
            fabric: this,
            index: faceIndex,
            laterality: getFaceLaterality(),
            midpoint: vectorFromIndex(this.faceMidpointsArray, faceIndex * 3),
            normal,
            jointIndex,
            jointTag: jointIndex.map(index => `${this.fab.getJointTag(index)}[${this.fab.getJointLaterality(index)}]`),
            averageIdealSpan: this.fab.getFaceAverageIdealSpan(faceIndex)
        }
    }
}