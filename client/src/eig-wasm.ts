export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IEigWasm {

    memory: IMemory;

    createTetra(): void;

    iterate(ticks: number): void;

    centralize(altitude: number): void;
}
