/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Genome } from "../genetics/genome"
import { Gotchi, IGotchiFactory } from "../gotchi/gotchi"
import { Hexalot } from "../island/hexalot"
import { HEXALOT_SHAPE } from "../island/island-logic"

import { Direction, IFabricDimensions, IFabricExports, IFabricInstanceExports, IntervalRole } from "./fabric-exports"
import { GotchiBody } from "./gotchi-body"
import { SpinalTensegrity } from "./spinal-tensegrity"

const FLOATS_IN_VECTOR = 3
const VECTORS_FOR_FACE = 3
const HEXALOT_BITS = 128
const SPOT_CENTERS_FLOATS = HEXALOT_BITS * FLOATS_IN_VECTOR
const SPOT_CENTERS_SIZE = SPOT_CENTERS_FLOATS * Float32Array.BYTES_PER_ELEMENT
const HEXALOT_SIZE = SPOT_CENTERS_SIZE + HEXALOT_BITS

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
    const dimensions: IFabricDimensions = {
        instanceMax,
        jointCountMax,
        intervalCountMax,
        faceCountMax,
    }
    return new FabricKernel(fabricExports, dimensions)
}

interface IOffsets {
    vectorsOffset: number
    faceMidpointsOffset: number
    faceNormalsOffset: number
    faceLocationsOffset: number
    jointLocationsOffset: number
}

function createOffsets(faceCountMax: number, baseOffset: number): IOffsets {
    const offsets: IOffsets = {
        vectorsOffset: 0,
        faceMidpointsOffset: 0,
        faceNormalsOffset: 0,
        faceLocationsOffset: 0,
        jointLocationsOffset: 0,
    }
    // sizes
    const seedVectors = 4 * FLOATS_IN_VECTOR
    const faceVectorFloats = faceCountMax * FLOATS_IN_VECTOR
    const faceJointFloats = faceVectorFloats * VECTORS_FOR_FACE
    const faceLocationFloats = faceVectorFloats * VECTORS_FOR_FACE
    // offsets
    offsets.jointLocationsOffset = (
        offsets.faceLocationsOffset = (
            offsets.faceNormalsOffset = (
                offsets.faceMidpointsOffset = (
                    offsets.vectorsOffset = baseOffset
                ) + seedVectors * Float32Array.BYTES_PER_ELEMENT
            ) + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT
        ) + faceJointFloats * Float32Array.BYTES_PER_ELEMENT
    ) + faceLocationFloats * Float32Array.BYTES_PER_ELEMENT
    return offsets
}

export class FabricKernel implements IGotchiFactory {
    private instanceArray: IFabricInstanceExports[] = []
    private instanceUsed: boolean[] = []
    private arrayBuffer: ArrayBuffer
    private spotCenters: Float32Array
    private surface: Int8Array

    constructor(private exports: IFabricExports, dimensions: IFabricDimensions) {
        const fabricBytes = exports.init(dimensions.jointCountMax, dimensions.intervalCountMax, dimensions.faceCountMax, dimensions.instanceMax)
        this.arrayBuffer = exports.memory.buffer
        this.spotCenters = new Float32Array(this.arrayBuffer, 0, SPOT_CENTERS_FLOATS)
        this.surface = new Int8Array(this.arrayBuffer, SPOT_CENTERS_SIZE, HEXALOT_BITS)
        const byteLength = this.arrayBuffer.byteLength
        if (byteLength === 0) {
            throw new Error(`Zero byte length! ${fabricBytes}`)
        }
        for (let index = 0; index < dimensions.instanceMax; index++) {
            this.instanceArray.push(new InstanceExports(
                this.arrayBuffer,
                createOffsets(dimensions.faceCountMax, HEXALOT_SIZE + index * fabricBytes),
                exports,
                dimensions,
                index,
                toFree => this.instanceUsed[toFree] = false,
            ))
            this.instanceUsed.push(false)
        }
    }

    public createSpinalTensegrity(): SpinalTensegrity | undefined {
        const newInstance = this.allocateInstance()
        if (!newInstance) {
            return undefined
        }
        return new SpinalTensegrity(newInstance)
    }

    public createGotchiSeed(home: Hexalot, rotation: number, genome: Genome): Gotchi | undefined {
        const newInstance = this.allocateInstance()
        if (!newInstance) {
            return undefined
        }
        const fabric = new GotchiBody(newInstance).createSeed(home.center.x, home.center.z, rotation)
        return new Gotchi(home, fabric, genome, this)
    }

    public copyLiveGotchi(gotchi: Gotchi, genome: Genome): Gotchi | undefined {
        const newInstance = this.allocateInstance()
        if (!newInstance) {
            return undefined
        }
        this.exports.cloneInstance(gotchi.fabric.index, newInstance.index)
        const fabric = new GotchiBody(newInstance)
        return new Gotchi(gotchi.home, fabric, genome, this)
    }

    public setHexalot(spotCenters: Vector3[], surface: boolean[]): void {
        if (spotCenters.length !== HEXALOT_SHAPE.length || surface.length !== HEXALOT_SHAPE.length) {
            throw new Error("Size problem")
        }
        spotCenters.forEach((center, index) => {
            this.spotCenters[index * FLOATS_IN_VECTOR] = center.x
            this.spotCenters[index * FLOATS_IN_VECTOR + 1] = center.y
            this.spotCenters[index * FLOATS_IN_VECTOR + 2] = center.z
        })
        surface.forEach((land, index) => {
            this.surface[index] = land ? 1 : 0
        })
    }

    // ==============================================================

    private allocateInstance(): IFabricInstanceExports | undefined {
        const freeIndex = this.instanceUsed.indexOf(false)
        if (freeIndex < 0) {
            return undefined
        }
        this.instanceUsed[freeIndex] = true
        this.instanceArray[freeIndex].freshGeometry()
        return this.instanceArray[freeIndex]
    }
}

class InstanceExports implements IFabricInstanceExports {
    private vectorArray: Float32Array | undefined
    private jointLocationsArray: Float32Array | undefined
    private faceMidpointsArray: Float32Array | undefined
    private faceLocationsArray: Float32Array | undefined
    private faceNormalsArray: Float32Array | undefined
    private midpointVector = new Vector3()
    private seedVector = new Vector3()
    private forwardVector = new Vector3()
    private rightVector = new Vector3()

    constructor(
        private buffer: ArrayBuffer,
        private offsets: IOffsets,
        private exports: IFabricExports,
        private dimensions: IFabricDimensions,
        private fabricIndex: number,
        private recycleFabric: (index: number) => void,
    ) {
    }

    public get index(): number {
        return this.fabricIndex
    }

    public recycle(): void {
        this.recycleFabric(this.fabricIndex)
    }

    public getDimensions(): IFabricDimensions {
        return this.dimensions
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

    public createInterval(alphaIndex: number, omegaIndex: number, idealSpan: number, intervalRole: IntervalRole, growing: boolean): number {
        return this.ex.createInterval(alphaIndex, omegaIndex, idealSpan, intervalRole, growing)
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

    public getCurrentDirection(): Direction {
        return this.ex.getCurrentDirection()
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

    public getNextDirection(): Direction {
        return this.ex.getNextDirection()
    }

    public setNextDirection(direction: Direction): void {
        this.ex.setNextDirection(direction)
    }

    public setIntervalHighLow(intervalIndex: number, direction: Direction, highLow: number): void {
        this.ex.setIntervalHighLow(intervalIndex, direction, highLow)
    }

    private get ex(): IFabricExports {
        this.exports.setInstance(this.index)
        return this.exports
    }

    public freshGeometry(): void {
        this.vectorArray = this.faceMidpointsArray = this.faceLocationsArray = this.faceNormalsArray = this.jointLocationsArray = undefined
    }

    public getJointLocation(jointIndex: number): Vector3 {
        return vectorFromFloatArray(this.jointLocations, jointIndex * 3)
    }

    public getFaceLocations(): Float32Array {
        return this.faceLocations
    }

    public getFaceMidpoints(): Float32Array {
        return this.faceMidpoints
    }

    public getFaceNormals(): Float32Array {
        return this.faceNormals
    }

    public getForward(): Vector3 {
        return this.forward
    }

    public getMidpoint(): Vector3 {
        return this.midpoint
    }

    public getRight(): Vector3 {
        return this.right
    }

    public getSeed(): Vector3 {
        return this.seed
    }

    public getVectors(): Float32Array {
        return this.vectors
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

    public get vectors(): Float32Array {
        if (!this.vectorArray) {
            this.vectorArray = new Float32Array(this.buffer, this.offsets.vectorsOffset, 4 * 3)
        }
        return this.vectorArray
    }

    public get jointLocations(): Float32Array {
        if (!this.jointLocationsArray) {
            this.jointLocationsArray =
                new Float32Array(this.buffer, this.offsets.jointLocationsOffset, this.exports.getJointCount() * 3)
        }
        return this.jointLocationsArray
    }

    public get faceMidpoints(): Float32Array {
        if (!this.faceMidpointsArray) {
            this.faceMidpointsArray =
                new Float32Array(this.buffer, this.offsets.faceMidpointsOffset, this.exports.getFaceCount() * 3)
        }
        return this.faceMidpointsArray
    }

    public get faceLocations(): Float32Array {
        if (!this.faceLocationsArray) {
            this.faceLocationsArray =
                new Float32Array(this.buffer, this.offsets.faceLocationsOffset, this.exports.getFaceCount() * 3 * 3)
        }
        return this.faceLocationsArray
    }

    public get faceNormals(): Float32Array {
        if (!this.faceNormalsArray) {
            this.faceNormalsArray =
                new Float32Array(this.buffer, this.offsets.faceNormalsOffset, this.exports.getFaceCount() * 3 * 3)
        }
        return this.faceNormalsArray
    }

}
