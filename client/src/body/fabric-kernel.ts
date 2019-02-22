import {Vector3} from "three"

import {Direction, IFabricExports, IFabricInstanceExports} from "./fabric-exports"

export const vectorFromFloatArray = (array: Float32Array, index: number, vector?: Vector3): Vector3 => {
    if (vector) {
        vector.set(array[index], array[index + 1], array[index + 2])
        return vector
    } else {
        return new Vector3(array[index], array[index + 1], array[index + 2])
    }
}

export function createFabricKernel(fabricExports: IFabricExports, instanceMax: number, jointCountMax: number): FabricKernel {
    const intervalCountMax = jointCountMax * 3 + 30
    const faceCountMax = jointCountMax * 2 + 20
    return new FabricKernel(fabricExports, instanceMax, jointCountMax, intervalCountMax, faceCountMax)
}

export class FabricKernel {
    private arrayBuffer: ArrayBuffer
    private vectorsOffset: number
    private faceMidpointsOffset: number
    private faceLocationsOffset: number
    private faceNormalsOffset: number
    private fabricBytes: number
    private vectorArray: Float32Array | undefined
    private faceMidpointsArray: Float32Array | undefined
    private faceLocationsArray: Float32Array | undefined
    private faceNormalsArray: Float32Array | undefined
    private midpointVector = new Vector3()
    private seedVector = new Vector3()
    private forwardVector = new Vector3()
    private rightVector = new Vector3()
    private instanceArray: IFabricInstanceExports[] = []

    constructor(
        private exports: IFabricExports,
        public instanceMax: number,
        public jointCountMax: number,
        public intervalCountMax: number,
        public faceCountMax: number,
    ) {
        // sizes
        const floatsInVector = 3
        const vectorsForFace = 3
        const seedVectors = 4 * floatsInVector
        const faceVectorFloats = this.faceCountMax * floatsInVector
        const faceJointFloats = faceVectorFloats * vectorsForFace
        // offsets
        this.faceLocationsOffset = (
            this.faceNormalsOffset = (
                this.faceMidpointsOffset = (
                    this.vectorsOffset = 0
                ) + seedVectors * Float32Array.BYTES_PER_ELEMENT
            ) + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT
        ) + faceJointFloats * Float32Array.BYTES_PER_ELEMENT
        this.fabricBytes = exports.init(this.jointCountMax, this.intervalCountMax, this.faceCountMax, this.instanceMax)
        this.arrayBuffer = exports.memory.buffer
        const byteLength = exports.memory.buffer.byteLength
        if (byteLength === 0) {
            throw new Error(`Zero byte length! ${this.fabricBytes}`)
        } else {
            console.log(`Got ${byteLength} bytes`)
        }
        for (let index = 0; index < instanceMax; index++) {
            this.instanceArray.push(new InstanceExports(exports, index))
        }
    }

    public get blockBytes() {
        return this.fabricBytes
    }

    public get bufferBytes() {
        return this.arrayBuffer.byteLength
    }

    public get instance(): IFabricInstanceExports[] {
        return this.instanceArray
    }

    public refresh() {
        this.faceMidpointsArray = this.faceLocationsArray = this.faceNormalsArray = undefined
    }

    // TODO: everything below must be per-instance

    public get vectors(): Float32Array {
        if (!this.vectorArray) {
            this.vectorArray = new Float32Array(this.arrayBuffer, this.vectorsOffset, 4 * 3)
        }
        return this.vectorArray
    }

    public get midpoint(): Vector3 {
        return vectorFromFloatArray(this.vectors, 0, this.midpointVector)
    }

    public get seed(): Vector3 {
        return vectorFromFloatArray(this.vectors, 3, this.seedVector)
    }

    public get forward(): Vector3 {
        return vectorFromFloatArray(this.vectors, 6, this.forwardVector)
    }

    public get right(): Vector3 {
        return vectorFromFloatArray(this.vectors, 9, this.rightVector)
    }

    public get faceMidpoints(): Float32Array {
        if (!this.faceMidpointsArray) {
            this.faceMidpointsArray = new Float32Array(this.arrayBuffer, this.faceMidpointsOffset, this.exports.getFaceCount() * 3)
        }
        return this.faceMidpointsArray
    }

    public get faceLocations(): Float32Array {
        if (!this.faceLocationsArray) {
            this.faceLocationsArray = new Float32Array(this.arrayBuffer, this.faceLocationsOffset, this.exports.getFaceCount() * 3 * 3)
        }
        return this.faceLocationsArray
    }

    public get faceNormals(): Float32Array {
        if (!this.faceNormalsArray) {
            this.faceNormalsArray = new Float32Array(this.arrayBuffer, this.faceNormalsOffset, this.exports.getFaceCount() * 3 * 3)
        }
        return this.faceNormalsArray
    }

}

class InstanceExports implements IFabricInstanceExports {

    constructor(private exports: IFabricExports, private index: number) {
    }

    public reset(): void {
        return this.ex.reset()
    }

    public getAge(): number {
        return this.ex.getAge()
    }

    public centralize(): void {
        this.ex.centralize()
    }

    public createFace(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.ex.createFace(joint0Index, joint1Index, joint2Index)
    }

    public createInterval(alphaIndex: number, omegaIndex: number, span: number, growing: boolean): number {
        return this.ex.createInterval(alphaIndex, omegaIndex, span, growing)
    }

    public createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number {
        return this.ex.createJoint(jointTag, laterality, x, y, z)
    }

    public endGestation(): void {
        this.ex.endGestation()
    }

    public getFaceCount(): number {
        return this.ex.getFaceCount()
    }

    public findOppositeFaceIndex(faceIndex: number): number {
        return this.ex.findOppositeFaceIndex(faceIndex)
    }

    public findOppositeIntervalIndex(intervalIndex: number): number {
        return this.ex.findOppositeIntervalIndex(intervalIndex)
    }

    public getDirection(): Direction {
        return this.ex.getDirection()
    }

    public getFaceAverageIdealSpan(faceIndex: number): number {
        return this.ex.getFaceAverageIdealSpan(faceIndex)
    }

    public getFaceJointIndex(faceIndex: number, jointNumber: number): number {
        return this.ex.getFaceJointIndex(faceIndex, jointNumber)
    }

    public getJointLaterality(jointIndex: number): number {
        return this.ex.getJointLaterality(jointIndex)
    }

    public getJointTag(jointIndex: number): number {
        return this.ex.getJointTag(jointIndex)
    }

    public getIntervalCount(): number {
        return this.ex.getIntervalCount()
    }

    public isGestating(): boolean {
        return this.ex.isGestating()
    }

    public iterate(ticks: number): boolean {
        return this.ex.iterate(ticks)
    }

    public getJointCount(): number {
        return this.ex.getJointCount()
    }

    public nextJointTag(): number {
        return this.ex.nextJointTag()
    }

    public removeFace(faceIndex: number): void {
        this.ex.removeFace(faceIndex)
    }

    public setAltitude(altitude: number): number {
        return this.ex.setAltitude(altitude)
    }

    public setDirection(direction: Direction): void {
        this.ex.setDirection(direction)
    }

    public setIntervalHighLow(intervalIndex: number, direction: Direction, highLow: number): void {
        this.ex.setIntervalHighLow(intervalIndex, direction, highLow)
    }

    private get ex(): IFabricExports {
        this.exports.setInstance(this.index)
        return this.exports
    }

}
