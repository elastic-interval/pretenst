import {IFabricExports} from './fabric-exports';

export class FabricKernel {
    private arrayBuffer: ArrayBuffer;
    private lineLocationOffset: number;
    private lineColorsOffset: number;
    private faceMidpointsOffset: number;
    private faceNormalsOffset: number;
    private faceLocationsOffset: number;
    private fabricBytes: number;

    constructor(
        public exports: IFabricExports,
        public jointCountMax: number,
        public intervalCountMax: number,
        public faceCountMax: number
    ) {
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
        this.fabricBytes = exports.init(jointCountMax, this.intervalCountMax, this.faceCountMax);
        this.arrayBuffer = exports.memory.buffer;
    }

    public get faceMidpoints(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.faceMidpointsOffset, this.exports.faces() * 3);
    }

    public get faceLocations(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.faceLocationsOffset, this.exports.faces() * 3 * 3);
    }

    public get faceNormals(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.faceNormalsOffset, this.exports.faces() * 3 * 3);
    }

    public get lineLocations(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.lineLocationOffset, this.exports.intervals() * 2 * 3);
    }

    public get lineColors(): Float32Array {
        return new Float32Array(this.arrayBuffer, this.lineColorsOffset, this.exports.intervals() * 2 * 3);
    }

    public get blockBytes() {
        return this.fabricBytes;
    }

    public get bufferBytes() {
        return this.arrayBuffer.byteLength;
    }
}