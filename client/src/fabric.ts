import {createOctahedron, createTetrahedron} from './eig/eig-factory';

export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabricExports {

    memory: IMemory;

    init(joints: number, intervals: number, faces: number): number;

    joints(): number;

    intervals(): number;

    faces(): number;

    tetraFromFace(face: number): void;

    iterate(ticks: number): void;

    centralize(altitude: number): void;

    createJoint(laterality: number, jointName: number, x: number, y: number, z: number): number;

    createInterval(role: number, alphaIndex: number, omegaIndex: number, span: number): number;

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number;

    getFaceLaterality(faceIndex: number): number;
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

export class EigFabric implements IFabricExports {
    private responseFromInit: number;
    private linePairs: Float32Array;
    private faceMidpoints: Float32Array;
    private faceNormals: Float32Array;

    constructor(
        private fabricExports: IFabricExports,
        private jointCountMax: number,
        private intervalCountMax: number,
        private faceCountMax: number
    ) {
        const linePairFloats = intervalCountMax * 2 * 3;
        const midpointOffset = linePairFloats * Float32Array.BYTES_PER_ELEMENT;
        const faceFloats = faceCountMax * 3;
        const normalOffset = midpointOffset + faceFloats * Float32Array.BYTES_PER_ELEMENT;
        this.responseFromInit = fabricExports.init(jointCountMax, intervalCountMax, faceCountMax);
        this.linePairs = new Float32Array(fabricExports.memory.buffer, 0, linePairFloats);
        this.faceMidpoints = new Float32Array(fabricExports.memory.buffer, midpointOffset, faceFloats);
        this.faceNormals = new Float32Array(fabricExports.memory.buffer, normalOffset, faceFloats);
    }

    public get initBytes() {
        return this.responseFromInit;
    }

    public get bytes() {
        return this.fabricExports.memory.buffer.byteLength;
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
        createTetrahedron(this);
    }

    public createOctahedron(): void {
        createOctahedron(this);
    }

    // from IFabricExports ==========

    public get memory(): IMemory {
        return this.fabricExports.memory;
    }

    public init(joints: number, intervals: number, faces: number): number {
        return this.fabricExports.init(joints, intervals, faces);
    }

    public joints(): number {
        return this.fabricExports.joints();
    }

    public intervals(): number {
        return this.fabricExports.intervals();
    }

    public faces(): number {
        return this.fabricExports.faces();
    }

    public tetraFromFace(face: number): void {
        this.fabricExports.tetraFromFace(face);
    }

    public iterate(ticks: number): void {
        this.fabricExports.iterate(ticks);
    }

    public centralize(altitude: number): void {
        this.fabricExports.centralize(altitude);
    }

    public createJoint(laterality: number, jointName: number, x: number, y: number, z: number): number {
        return this.fabricExports.createJoint(laterality, jointName, x, y, z);
    }

    public createInterval(role: number, alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fabricExports.createInterval(role, alphaIndex, omegaIndex, span);
    }

    public createFace(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.fabricExports.createFace(joint0Index, joint1Index, joint2Index);
    }

    public getFaceLaterality(faceIndex: number): number {
        return this.fabricExports.getFaceLaterality(faceIndex);
    }

}