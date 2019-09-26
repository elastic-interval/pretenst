/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Genome } from "../genetics/genome"
import { Gotchi, IGotchiFactory } from "../gotchi/gotchi"
import { Hexalot } from "../island/hexalot"
import { HEXALOT_SHAPE } from "../island/island-logic"

import { FabricState, IFabricDimensions, IFabricEngine, IntervalRole } from "./fabric-engine"
import { GotchiBody } from "./gotchi-body"
import { Physics } from "./physics"
import { TensegrityFabric } from "./tensegrity-fabric"

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

interface IOffsets {
    _vectors: number
    _lineLocations: number
    _lineColors: number
    _faceMidpoints: number
    _faceNormals: number
    _faceLocations: number
    _jointLocations: number
    _intervalUnits: number
    _intervalStresses: number
}

function createOffsets(jointCountMax: number, intervalCountMax: number, faceCountMax: number, baseOffset: number): IOffsets {
    const offsets: IOffsets = {
        _vectors: 0,
        _lineLocations: 0,
        _lineColors: 0,
        _faceMidpoints: 0,
        _faceNormals: 0,
        _faceLocations: 0,
        _jointLocations: 0,
        _intervalUnits: 0,
        _intervalStresses: 0,
    }
    // sizes
    const seedVectorFloats = 4 * FLOATS_IN_VECTOR
    const faceVectorFloats = faceCountMax * FLOATS_IN_VECTOR
    const faceJointFloats = faceVectorFloats * VECTORS_FOR_FACE
    const faceLocationFloats = faceVectorFloats * VECTORS_FOR_FACE
    const jointLocationFloats = jointCountMax * FLOATS_IN_VECTOR
    const intervalUnitFloats = intervalCountMax * FLOATS_IN_VECTOR
    const lineFloats = intervalCountMax * FLOATS_IN_VECTOR * 2
    offsets._vectors = baseOffset
    offsets._lineColors = offsets._vectors + seedVectorFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._lineLocations = offsets._lineColors + lineFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._faceMidpoints = offsets._lineLocations + lineFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._faceNormals = offsets._faceMidpoints + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._faceLocations = offsets._faceNormals + faceJointFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._jointLocations = offsets._faceLocations + faceLocationFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._intervalUnits = offsets._jointLocations + jointLocationFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._intervalStresses = offsets._intervalUnits + intervalUnitFloats * Float32Array.BYTES_PER_ELEMENT
    return offsets
}

export class FabricKernel implements IGotchiFactory {
    private instanceArray: FabricInstance[] = []
    private instanceUsed: boolean[] = []
    private arrayBuffer: ArrayBuffer
    private spotCenters: Float32Array
    private hexalotBits: Int8Array

    constructor(private engine: IFabricEngine, private physics: Physics, dimensions: IFabricDimensions) {
        const fabricBytes = engine.init(dimensions.jointCountMax, dimensions.intervalCountMax, dimensions.faceCountMax, dimensions.instanceMax)
        this.arrayBuffer = engine.memory.buffer
        this.spotCenters = new Float32Array(this.arrayBuffer, 0, SPOT_CENTERS_FLOATS)
        this.hexalotBits = new Int8Array(this.arrayBuffer, SPOT_CENTERS_SIZE, HEXALOT_BITS)
        const byteLength = this.arrayBuffer.byteLength
        if (byteLength === 0) {
            throw new Error(`Zero byte length! ${fabricBytes}`)
        }
        for (let index = 0; index < dimensions.instanceMax; index++) {
            this.instanceArray.push(new FabricInstance(
                this.arrayBuffer,
                createOffsets(dimensions.jointCountMax, dimensions.intervalCountMax, dimensions.faceCountMax, HEXALOT_SIZE + index * fabricBytes),
                engine,
                dimensions,
                index,
                toFree => this.instanceUsed[toFree] = false,
            ))
            this.instanceUsed.push(false)
        }
    }

    public createTensegrityFabric(name: string): TensegrityFabric | undefined {
        const newInstance = this.allocateInstance()
        if (!newInstance) {
            return undefined
        }
        return new TensegrityFabric(newInstance, this.physics, name)
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
        this.engine.cloneInstance(gotchi.body.index, newInstance.index)
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
            this.hexalotBits[index] = land ? 1 : 0
        })
    }

    // ==============================================================

    private allocateInstance(): FabricInstance | undefined {
        const freeIndex = this.instanceUsed.indexOf(false)
        if (freeIndex < 0) {
            return undefined
        }
        this.instanceUsed[freeIndex] = true
        this.instanceArray[freeIndex].clear()
        this.instanceArray[freeIndex].reset()
        return this.instanceArray[freeIndex]
    }
}

class LazyFloatArray {
    private array: Float32Array | undefined

    constructor(private buffer: ArrayBuffer, private offset: number, private length: () => number) {
    }

    public get floats(): Float32Array {
        if (this.array) {
            return this.array
        }
        return this.array = new Float32Array(this.buffer, this.offset, this.length())
    }

    public clear(): void {
        this.array = undefined
    }
}

export class FabricInstance {
    private vectors: LazyFloatArray
    private lineColors: LazyFloatArray
    private lineLocations: LazyFloatArray
    private faceMidpoints: LazyFloatArray
    private faceNormals: LazyFloatArray
    private faceLocations: LazyFloatArray
    private jointLocations: LazyFloatArray
    private intervalUnits: LazyFloatArray
    private intervalStresses: LazyFloatArray
    private midpointVector = new Vector3()
    private seedVector = new Vector3()
    private forwardVector = new Vector3()
    private rightVector = new Vector3()

    constructor(
        private buffer: ArrayBuffer,
        private offsets: IOffsets,
        private engine: IFabricEngine,
        private dimensions: IFabricDimensions,
        private fabricIndex: number,
        private releaseInstance: (index: number) => void,
    ) {
        this.vectors = new LazyFloatArray(this.buffer, this.offsets._vectors, () => 3 * 4)
        this.lineColors = new LazyFloatArray(this.buffer, this.offsets._lineColors, () => this.engine.getIntervalCount() * 3 * 2)
        this.lineLocations = new LazyFloatArray(this.buffer, this.offsets._lineLocations, () => this.engine.getIntervalCount() * 3 * 2)
        this.faceMidpoints = new LazyFloatArray(this.buffer, this.offsets._faceMidpoints, () => this.engine.getFaceCount() * 3)
        this.faceNormals = new LazyFloatArray(this.buffer, this.offsets._faceNormals, () => this.engine.getFaceCount() * 3 * 3)
        this.faceLocations = new LazyFloatArray(this.buffer, this.offsets._faceLocations, () => this.engine.getFaceCount() * 3 * 3)
        this.jointLocations = new LazyFloatArray(this.buffer, this.offsets._jointLocations, () => this.engine.getJointCount() * 3)
        this.intervalUnits = new LazyFloatArray(this.buffer, this.offsets._intervalUnits, () => this.engine.getIntervalCount() * 3)
        this.intervalStresses = new LazyFloatArray(this.buffer, this.offsets._intervalUnits, () => this.engine.getIntervalCount())
    }

    public get index(): number {
        return this.fabricIndex
    }

    public release(): void {
        this.releaseInstance(this.fabricIndex)
        this.fabricEngine.reset()
    }

    public clear(): void {
        this.faceMidpoints.clear()
        this.faceLocations.clear()
        this.faceNormals.clear()
        this.jointLocations.clear()
        this.lineLocations.clear()
        this.lineColors.clear()
        this.intervalUnits.clear()
        this.intervalStresses.clear()
    }

    public getDimensions(): IFabricDimensions {
        return this.dimensions
    }

    public extendBusyCountdown(factor: number): void {
        this.fabricEngine.extendBusyCountdown(factor)
    }

    public reset(): void {
        return this.fabricEngine.reset()
    }

    public getAge(): number {
        return this.fabricEngine.getAge()
    }

    public centralize(): void {
        this.fabricEngine.centralize()
    }

    public createFace(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.fabricEngine.createFace(joint0Index, joint1Index, joint2Index)
    }

    public createInterval(alphaIndex: number, omegaIndex: number, intervalRole: IntervalRole): number {
        return this.fabricEngine.createInterval(alphaIndex, omegaIndex, intervalRole)
    }

    public removeInterval(intervalIndex: number): void {
        this.fabricEngine.removeInterval(intervalIndex)
    }

    public createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number {
        return this.fabricEngine.createJoint(jointTag, laterality, x, y, z)
    }

    public getFaceCount(): number {
        return this.fabricEngine.getFaceCount()
    }

    public findOppositeFaceIndex(faceIndex: number): number {
        return this.fabricEngine.findOppositeFaceIndex(faceIndex)
    }

    public findOppositeIntervalIndex(intervalIndex: number): number {
        return this.fabricEngine.findOppositeIntervalIndex(intervalIndex)
    }

    public getCurrentState(): FabricState {
        return this.fabricEngine.getCurrentState()
    }

    public getFaceJointIndex(faceIndex: number, jointNumber: number): number {
        return this.fabricEngine.getFaceJointIndex(faceIndex, jointNumber)
    }

    public getJointLaterality(jointIndex: number): number {
        return this.fabricEngine.getJointLaterality(jointIndex)
    }

    public getJointTag(jointIndex: number): number {
        return this.fabricEngine.getJointTag(jointIndex)
    }

    public getIntervalCount(): number {
        return this.fabricEngine.getIntervalCount()
    }

    public iterate(ticks: number): boolean {
        return this.fabricEngine.iterate(ticks)
    }

    public getJointCount(): number {
        return this.fabricEngine.getJointCount()
    }

    public nextJointTag(): number {
        return this.fabricEngine.nextJointTag()
    }

    public removeFace(faceIndex: number): void {
        this.fabricEngine.removeFace(faceIndex)
    }

    public setAltitude(altitude: number): number {
        return this.fabricEngine.setAltitude(altitude)
    }

    public getNextState(): FabricState {
        return this.fabricEngine.getNextState()
    }

    public setNextState(state: FabricState): void {
        this.fabricEngine.setNextState(state)
    }

    public getRoleLength(intervalRole: IntervalRole): number {
        return this.fabricEngine.getRoleLength(intervalRole)
    }

    public setRoleLength(intervalRole: IntervalRole, factor: number): void {
        this.fabricEngine.setRoleLength(intervalRole, factor)
    }

    public setIntervalStateLength(intervalIndex: number, state: FabricState, length: number): void {
        this.fabricEngine.setIntervalStateLength(intervalIndex, state, length)
    }

    public changeRestIntervalRole(intervalIndex: number, intervalRole: IntervalRole): void {
        this.fabricEngine.changeRestIntervalRole(intervalIndex, intervalRole)
    }

    public changeRestLength(intervalIndex: number, length: number): void {
        this.fabricEngine.changeRestLength(intervalIndex, length)
    }

    public multiplyRestLength(intervalIndex: number, factor: number): void {
        this.fabricEngine.multiplyRestLength(intervalIndex, factor)
    }

    public getJointLocation(jointIndex: number): Vector3 {
        return vectorFromFloatArray(this.jointLocations.floats, jointIndex * 3)
    }

    public getIntervalUnit(intervalIndex: number): Vector3 {
        return vectorFromFloatArray(this.intervalUnits.floats, intervalIndex * 3)
    }

    public getFaceLocations(): Float32Array {
        return this.faceLocations.floats
    }

    public getFaceMidpoint(faceIndex: number): Vector3 {
        const locations = this.faceLocations.floats
        const index = faceIndex * 3
        const a = vectorFromFloatArray(locations, 3 * index)
        const b = vectorFromFloatArray(locations, 3 * (index + 1))
        const c = vectorFromFloatArray(locations, 3 * (index + 2))
        return new Vector3().add(a).add(b).add(c).multiplyScalar(1.0 / 3.0)
    }

    public getIntervalLocation(intervalIndex: number): Vector3 {
        return vectorFromFloatArray(this.lineLocations.floats, intervalIndex * 3)
    }

    public getFaceNormals(): Float32Array {
        return this.faceNormals.floats
    }

    public getFaceNormal(faceIndex: number): Vector3 {
        const normals = this.faceNormals.floats
        const index = faceIndex * 3
        const a = vectorFromFloatArray(normals, 3 * index)
        const b = vectorFromFloatArray(normals, 3 * (index + 1))
        const c = vectorFromFloatArray(normals, 3 * (index + 2))
        return new Vector3().add(a).add(b).add(c).multiplyScalar(1.0 / 3.0)
    }

    public getLineLocations(): Float32Array {
        return this.lineLocations.floats
    }

    public getLineColors(): Float32Array {
        return this.lineColors.floats
    }

    public getIntervalMidpoint(intervalIndex: number): Vector3 {
        const a = this.getIntervalLocation(intervalIndex * 2)
        const b = this.getIntervalLocation(intervalIndex * 2 + 1)
        return new Vector3().add(a).add(b).multiplyScalar(0.5)
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
        return this.vectors.floats
    }

    public get midpoint(): Vector3 {
        return vectorFromFloatArray(this.vectors.floats, 0, this.midpointVector)
    }

    public get seed(): Vector3 {
        return vectorFromFloatArray(this.vectors.floats, 3, this.seedVector)
    }

    public get forward(): Vector3 {
        return vectorFromFloatArray(this.vectors.floats, 6, this.forwardVector)
    }

    public get right(): Vector3 {
        return vectorFromFloatArray(this.vectors.floats, 9, this.rightVector)
    }

    private get fabricEngine(): IFabricEngine {
        this.engine.setInstance(this.index)
        return this.engine
    }
}

