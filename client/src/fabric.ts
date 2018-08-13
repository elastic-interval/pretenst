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
    private responseFromInit: number;
    private linePairs: Float32Array;
    private faceMidpoints: Float32Array;
    private faceNormals: Float32Array;

    constructor(
        private fab: IFabricExports,
        private jointCountMax: number,
        private intervalCountMax: number,
        private faceCountMax: number
    ) {
        const linePairFloats = intervalCountMax * 2 * 3;
        const midpointOffset = linePairFloats * Float32Array.BYTES_PER_ELEMENT;
        const faceFloats = faceCountMax * 3;
        const normalOffset = midpointOffset + faceFloats * Float32Array.BYTES_PER_ELEMENT;
        this.responseFromInit = fab.init(jointCountMax, intervalCountMax, faceCountMax);
        this.linePairs = new Float32Array(fab.memory.buffer, 0, linePairFloats);
        this.faceMidpoints = new Float32Array(fab.memory.buffer, midpointOffset, faceFloats);
        this.faceNormals = new Float32Array(fab.memory.buffer, normalOffset, faceFloats);
    }

    public get initBytes() {
        return this.responseFromInit;
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

    public get lines(): Float32Array {
        return this.linePairs;
    }

    public get midpoints(): Float32Array {
        return this.faceMidpoints;
    }

    public get normals(): Float32Array {
        return this.faceNormals;
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

    public createOctahedron(): void {
        const R = Math.sqrt(2) / 2;
        for (let walk = 0; walk < 4; walk++) {
            const angle = walk * Math.PI / 2 + Math.PI / 4;
            this.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R * Math.cos(angle), 0, R + R * Math.sin(angle));
        }
        const jointPairName = this.fab.nextJointTag();
        const left = this.createJoint(jointPairName, BILATERAL_LEFT, 0, -R, R);
        const right = this.createJoint(jointPairName, BILATERAL_RIGHT, 0, R, R);
        for (let walk = 0; walk < 4; walk++) {
            this.createInterval(ROLE_SPRING, walk, (walk + 1) % 4, -1);
            this.createInterval(ROLE_SPRING, walk, left, -1);
            this.createInterval(ROLE_SPRING, walk, right, -1);
        }
        for (let walk = 0; walk < 4; walk++) {
            this.createFace(left, walk, (walk + 1) % 4);
            this.createFace(right, (walk + 1) % 4, walk);
        }
    }

    public createTetraFromFace(face: IFace) {
        this.removeFace(face.index);
        const midpoint = new Vector3(face.midpoint.x, face.midpoint.y, face.midpoint.z);
        const apexLocation = new Vector3(face.normal.x, face.normal.y, face.normal.z).multiplyScalar(face.averageIdealSpan / 2).add(midpoint);
        const apex = this.createJoint(this.fab.nextJointTag(), face.laterality, apexLocation.x, apexLocation.y, apexLocation.z);
        this.createInterval(ROLE_SPRING, face.jointIndex[0], apex, face.averageIdealSpan);
        this.createInterval(ROLE_SPRING, face.jointIndex[1], apex, face.averageIdealSpan);
        this.createInterval(ROLE_SPRING, face.jointIndex[2], apex, face.averageIdealSpan);
        this.createFace(face.jointIndex[0], face.jointIndex[1], apex);
        this.createFace(face.jointIndex[1], face.jointIndex[2], apex);
        this.createFace(face.jointIndex[2], face.jointIndex[0], apex);
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
        const getFaceLaterality = ()=> {
            for (let jointWalk= 0; jointWalk < 3; jointWalk++) { // face inherits laterality
                const jointLaterality = this.fab.getJointLaterality(this.fab.getFaceJointIndex(faceIndex, jointWalk));
                if (jointLaterality !== BILATERAL_MIDDLE) {
                    return jointLaterality;
                }
            }
            return BILATERAL_MIDDLE;
        };
        const faceOffset = faceIndex * 3;
        const jointIndex = [0, 1, 2].map(index => this.fab.getFaceJointIndex(faceIndex, index));
        return {
            fabric: this,
            index: faceIndex,
            laterality: getFaceLaterality(),
            midpoint: new Vector3(
                this.faceMidpoints[faceOffset],
                this.faceMidpoints[faceOffset + 1],
                this.faceMidpoints[faceOffset + 2],
            ),
            normal: new Vector3(
                this.faceNormals[faceOffset],
                this.faceNormals[faceOffset + 1],
                this.faceNormals[faceOffset + 2],
            ),
            jointIndex,
            jointTag: jointIndex.map(index => `${this.fab.getJointTag(index)}-${this.fab.getJointLaterality(index)}`),
            averageIdealSpan: this.fab.getFaceAverageIdealSpan(faceIndex)
        }
    }
}