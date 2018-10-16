import {IFabricExports} from './fabric-exports';
import {Vector3} from 'three';

export const vectorFromFloatArray = (array: Float32Array, index: number, vector?: Vector3): Vector3 => {
    if (vector) {
        vector.set(array[index], array[index + 1], array[index + 2]);
        return vector;
    } else {
        return new Vector3(array[index], array[index + 1], array[index + 2]);
    }
};

export class FabricKernel {
    private arrayBuffer: ArrayBuffer;
    private vectorsOffset: number;
    private compassSegmentsOffset: number;
    private faceMidpointsOffset: number;
    private faceLocationsOffset: number;
    private faceNormalsOffset: number;
    private fabricBytes: number;
    private vectorArray: Float32Array | undefined;
    private compassSegmentsArray: Float32Array | undefined;
    private faceMidpointsArray: Float32Array | undefined;
    private faceLocationsArray: Float32Array | undefined;
    private faceNormalsArray: Float32Array | undefined;
    private midpointVector = new Vector3();
    private seedVector = new Vector3();
    private forwardVector = new Vector3();
    private rightVector = new Vector3();

    constructor(
        public exports: IFabricExports,
        public jointCountMax: number,
        public intervalCountMax: number,
        public faceCountMax: number
    ) {
        // sizes
        const floatsInVector = 3;
        const vectorsForFace = 3;
        const seedFloats = 4 * floatsInVector;
        const compassFloats = 8 * floatsInVector;
        const faceVectorFloats = this.faceCountMax * floatsInVector;
        const faceJointFloats = faceVectorFloats * vectorsForFace;
        // offsets
        this.faceLocationsOffset = (
            this.faceNormalsOffset = (
                this.faceMidpointsOffset = (
                    this.compassSegmentsOffset = (
                        this.vectorsOffset = 0
                    )  + seedFloats * Float32Array.BYTES_PER_ELEMENT
                ) + compassFloats * Float32Array.BYTES_PER_ELEMENT
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
            this.vectorArray = new Float32Array(this.arrayBuffer, this.vectorsOffset, 4 * 3);
        }
        return this.vectorArray;
    }

    public get midpoint(): Vector3 {
        return vectorFromFloatArray(this.vectors, 0, this.midpointVector);
    }

    public get seed(): Vector3 {
        return vectorFromFloatArray(this.vectors, 3, this.seedVector);
    }

    public get forward(): Vector3 {
        return vectorFromFloatArray(this.vectors, 6, this.forwardVector);
    }

    public get right(): Vector3 {
        return vectorFromFloatArray(this.vectors, 9, this.rightVector);
    }

    public get compassSegments(): Float32Array {
        if (!this.compassSegmentsArray) {
            this.compassSegmentsArray = new Float32Array(this.arrayBuffer, this.compassSegmentsOffset, 8 * 3);
        }
        return this.compassSegmentsArray;
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