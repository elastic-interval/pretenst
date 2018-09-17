import {IFabricExports} from './fabric-exports';
import {Vector3} from 'three';

export const vectorFromFloatArray = (array: Float32Array, index: number) => new Vector3(array[index], array[index + 1], array[index + 2]);

export class FabricKernel {
    private arrayBuffer: ArrayBuffer;
    private lineLocationOffset: number;
    private lineColorsOffset: number;
    private faceMidpointsOffset: number;
    private midpointOffset: number;
    private faceLocationsOffset: number;
    private faceNormalsOffset: number;
    private fabricBytes: number;
    private faceMidpointsArray: Float32Array | undefined;
    private faceLocationsArray: Float32Array | undefined;
    private faceNormalsArray: Float32Array | undefined;
    private lineLocationsArray: Float32Array | undefined;
    private lineColorsArray: Float32Array | undefined;

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
        this.midpointOffset = (
            this.faceLocationsOffset = (
                this.faceNormalsOffset = (
                    this.faceMidpointsOffset = (
                        this.lineColorsOffset = (
                            this.lineLocationOffset = 0
                        ) + lineLocationFloats * Float32Array.BYTES_PER_ELEMENT
                    ) + lineColorFloats * Float32Array.BYTES_PER_ELEMENT
                ) + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT
            ) + faceJointFloats * Float32Array.BYTES_PER_ELEMENT
        ) + faceJointFloats * Float32Array.BYTES_PER_ELEMENT;
        this.fabricBytes = exports.init(jointCountMax, this.intervalCountMax, this.faceCountMax);
        this.arrayBuffer = exports.memory.buffer;
    }

    public refresh() {
        this.faceMidpointsArray = this.faceLocationsArray = this.faceNormalsArray = this.lineLocationsArray = this.lineColorsArray = undefined;
    }

    public get midpoint(): Vector3 {
        const midpointArray = new Float32Array(this.arrayBuffer, this.midpointOffset, 3);
        return vectorFromFloatArray(midpointArray, 0);
    }

    public get faceMidpoints(): Float32Array {
        if (!this.faceMidpointsArray) {
            this.faceMidpointsArray = new Float32Array(this.arrayBuffer, this.faceMidpointsOffset, this.exports.faces() * 3);
        }
        return this.faceMidpointsArray;
    }

    public get faceLocations(): Float32Array {
        if (!this.faceLocationsArray) {
            this.faceLocationsArray = new Float32Array(this.arrayBuffer, this.faceLocationsOffset, this.exports.faces() * 3 * 3);
        }
        return this.faceLocationsArray;
    }

    public get faceNormals(): Float32Array {
        if (!this.faceNormalsArray) {
            this.faceNormalsArray = new Float32Array(this.arrayBuffer, this.faceNormalsOffset, this.exports.faces() * 3 * 3);
        }
        return this.faceNormalsArray;
    }

    public get lineLocations(): Float32Array {
        if (!this.lineLocationsArray) {
            this.lineLocationsArray = new Float32Array(this.arrayBuffer, this.lineLocationOffset, this.exports.intervals() * 2 * 3);
        }
        return this.lineLocationsArray;
    }

    public get lineColors(): Float32Array {
        if (!this.lineColorsArray) {
            this.lineColorsArray = new Float32Array(this.arrayBuffer, this.lineColorsOffset, this.exports.intervals() * 2 * 3);
        }
        return this.lineColorsArray;
    }

    public get blockBytes() {
        return this.fabricBytes;
    }

    public get bufferBytes() {
        return this.arrayBuffer.byteLength;
    }
}