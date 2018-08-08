export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabricExports {

    memory: IMemory;

    init(joints: number, intervals: number, faces: number): number;

    joints(): number;

    intervals(): number;

    faces(): number;

    createTetra(): void;

    tetraFromFace(face: number): void;

    iterate(ticks: number): void;

    centralize(altitude: number): void;
}

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

    public createTetra(): void {
        this.fabricExports.createTetra();
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
}