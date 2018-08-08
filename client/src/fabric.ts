export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabric {

    memory: IMemory;

    createTetra(): void;

    iterate(ticks: number): void;

    centralize(altitude: number): void;
}
