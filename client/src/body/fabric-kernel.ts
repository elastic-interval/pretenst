import {IFabricExports} from './fabric-exports';
import {Vector3} from 'three';

export const vectorFromFloatArray = (array: Float32Array, index: number) => new Vector3(array[index], array[index + 1], array[index + 2]);

export class FabricKernel {
    private arrayBuffer: ArrayBuffer;
    private faceMidpointsOffset: number;
    private vectorsOffset: number;
    private faceLocationsOffset: number;
    private faceNormalsOffset: number;
    private fabricBytes: number;
    private vectorArray: Float32Array | undefined;
    private faceMidpointsArray: Float32Array | undefined;
    private faceLocationsArray: Float32Array | undefined;
    private faceNormalsArray: Float32Array | undefined;

    constructor(
        public exports: IFabricExports,
        public jointCountMax: number,
        public intervalCountMax: number,
        public faceCountMax: number
    ) {
        // sizes
        const floatsInVector = 3;
        const vectorsForFace = 3;
        const faceVectorFloats = this.faceCountMax * floatsInVector;
        const faceJointFloats = faceVectorFloats * vectorsForFace;
        // offsets
        this.faceLocationsOffset = (
            this.faceNormalsOffset = (
                this.faceMidpointsOffset = (
                    this.vectorsOffset = 0
                ) + 3 * floatsInVector * Float32Array.BYTES_PER_ELEMENT
            ) + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT
        ) + faceJointFloats * Float32Array.BYTES_PER_ELEMENT;
        this.fabricBytes = exports.init(jointCountMax, this.intervalCountMax, this.faceCountMax);
        this.arrayBuffer = exports.memory.buffer;
    }

    public refresh() {
        this.faceMidpointsArray = this.faceLocationsArray = this.faceNormalsArray = undefined;
    }

    public get vectors(): Float32Array {
        if (!this.vectorArray) {
            this.vectorArray = new Float32Array(this.arrayBuffer, this.vectorsOffset, 3 * 3);
        }
        return this.vectorArray;
    }

    public get midpointVector(): Vector3 {
        return vectorFromFloatArray(this.vectors, 0);
    }

    public get seedVector(): Vector3 {
        return vectorFromFloatArray(this.vectors, 3);
    }

    public get headVector(): Vector3 {
        return vectorFromFloatArray(this.vectors, 6);
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

    public get blockBytes() {
        return this.fabricBytes;
    }

    public get bufferBytes() {
        return this.arrayBuffer.byteLength;
    }
}