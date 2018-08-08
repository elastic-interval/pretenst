export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabricExports {

    memory: IMemory;

    init(joints: number, intervals: number, faces: number): number;

    createTetra(): void;

    iterate(ticks: number): void;

    centralize(altitude: number): void;
}

export class EigFabric implements IFabricExports {
    private responseFromInit: number;
    private linePairs: Float32Array;

    constructor(
        private fabricExports: IFabricExports,
        private joints: number,
        private intervals: number,
        private faces: number
    ) {
        this.responseFromInit = fabricExports.init(joints, intervals, faces);
        this.linePairs = new Float32Array(fabricExports.memory.buffer, 0, intervals * 2 * 3 * 4);
    }

    public get initBytes() {
        return this.responseFromInit;
    }

    public get bytes() {
        return this.fabricExports.memory.buffer.byteLength;
    }

    public get jointCount() {
        return this.joints;
    }

    public get intervalCount() {
        return this.intervals;
    }

    public get faceCount() {
        return this.faces;
    }

    public get lines(): Float32Array {
        return this.linePairs;
    }

    // from IFabricExports ==========

    public get memory(): IMemory {
        return this.fabricExports.memory;
    }

    public init(joints: number, intervals: number, faces: number): number {
        return this.fabricExports.init(joints, intervals, faces);
    }

    public createTetra(): void {
        this.fabricExports.createTetra();
    }

    public iterate(ticks: number): void {
        this.fabricExports.iterate(ticks);
    }

    public centralize(altitude: number): void {
        this.fabricExports.centralize(altitude);
    }
}