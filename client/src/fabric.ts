export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabric {

    memory: IMemory;

    init(joints: number, intervals: number, faces: number): void;

    createTetra(): void;

    iterate(ticks: number): void;

    centralize(altitude: number): void;
}
