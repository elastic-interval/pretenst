/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricState, IFabricDimensions, IFabricEngine, Limit } from "./fabric-engine"
import { IOffsets, vectorFromFloatArray } from "./fabric-kernel"

export const JOINT_RADIUS = 0.1

export class FabricInstance {
    private vectors: LazyFloatArray
    private lineColors: LazyFloatArray
    private lineLocations: LazyFloatArray
    private faceMidpoints: LazyFloatArray
    private faceNormals: LazyFloatArray
    private faceLocations: LazyFloatArray
    private jointLocations: LazyFloatArray
    private intervalUnits: LazyFloatArray
    private intervalDisplacements: LazyFloatArray
    private midpointVector = new Vector3()
    private seedVector = new Vector3()
    private forwardVector = new Vector3()
    private rightVector = new Vector3()

    constructor(
        private buffer: ArrayBuffer,
        private offsets: IOffsets,
        private dimensions: IFabricDimensions,
        private fabricIndex: number,
        private releaseInstance: (index: number) => void,
        private fabricEngine: IFabricEngine,
    ) {
        this.vectors = new LazyFloatArray(this.buffer, this.offsets._vectors, () => 3 * 4)
        this.lineColors = new LazyFloatArray(this.buffer, this.offsets._lineColors, () => this.fabricEngine.getIntervalCount() * 3 * 2)
        this.lineLocations = new LazyFloatArray(this.buffer, this.offsets._lineLocations, () => this.fabricEngine.getIntervalCount() * 3 * 2)
        this.faceMidpoints = new LazyFloatArray(this.buffer, this.offsets._faceMidpoints, () => this.fabricEngine.getFaceCount() * 3)
        this.faceNormals = new LazyFloatArray(this.buffer, this.offsets._faceNormals, () => this.fabricEngine.getFaceCount() * 3 * 3)
        this.faceLocations = new LazyFloatArray(this.buffer, this.offsets._faceLocations, () => this.fabricEngine.getFaceCount() * 3 * 3)
        this.jointLocations = new LazyFloatArray(this.buffer, this.offsets._jointLocations, () => this.fabricEngine.getJointCount() * 3)
        this.intervalUnits = new LazyFloatArray(this.buffer, this.offsets._intervalUnits, () => this.fabricEngine.getIntervalCount() * 3)
        this.intervalDisplacements = new LazyFloatArray(this.buffer, this.offsets._intervalDisplacements, () => this.fabricEngine.getIntervalCount())
    }

    public get index(): number {
        return this.fabricIndex
    }

    public release(): void {
        this.releaseInstance(this.fabricIndex)
        this.engine.reset()
    }

    public clear(): void {
        this.faceMidpoints.clear()
        this.faceLocations.clear()
        this.faceNormals.clear()
        this.jointLocations.clear()
        this.lineLocations.clear()
        this.lineColors.clear()
        this.intervalUnits.clear()
        this.intervalDisplacements.clear()
    }

    public getDimensions(): IFabricDimensions {
        return this.dimensions
    }

    public extendBusyCountdown(factor: number): void {
        this.engine.extendBusyCountdown(factor)
    }

    public reset(): void {
        return this.engine.reset()
    }

    public getAge(): number {
        return this.engine.getAge()
    }

    public getLimit(limit: Limit): number {
        return this.engine.getLimit(limit)
    }

    public setSlackLimits(barLimit: number, cableLimit: number): void {
        this.engine.setSlackLimits(barLimit, cableLimit)
    }

    public centralize(): void {
        this.engine.centralize()
    }

    public createFace(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.engine.createFace(joint0Index, joint1Index, joint2Index)
    }

    public removeInterval(intervalIndex: number): void {
        this.engine.removeInterval(intervalIndex)
    }

    public createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number {
        return this.engine.createJoint(jointTag, laterality, x, y, z)
    }

    public getFaceCount(): number {
        return this.engine.getFaceCount()
    }

    public findOppositeFaceIndex(faceIndex: number): number {
        return this.engine.findOppositeFaceIndex(faceIndex)
    }

    public findOppositeIntervalIndex(intervalIndex: number): number {
        return this.engine.findOppositeIntervalIndex(intervalIndex)
    }

    public getCurrentState(): FabricState {
        return this.engine.getCurrentState()
    }

    public getFaceJointIndex(faceIndex: number, jointNumber: number): number {
        return this.engine.getFaceJointIndex(faceIndex, jointNumber)
    }

    public getJointLaterality(jointIndex: number): number {
        return this.engine.getJointLaterality(jointIndex)
    }

    public getJointTag(jointIndex: number): number {
        return this.engine.getJointTag(jointIndex)
    }

    public getIntervalCount(): number {
        return this.engine.getIntervalCount()
    }

    public iterate(ticks: number): boolean {
        return this.engine.iterate(ticks)
    }

    public getJointCount(): number {
        return this.engine.getJointCount()
    }

    public nextJointTag(): number {
        return this.engine.nextJointTag()
    }

    public removeFace(faceIndex: number): void {
        this.engine.removeFace(faceIndex)
    }

    public setAltitude(altitude: number): number {
        return this.engine.setAltitude(altitude)
    }

    public getNextState(): FabricState {
        return this.engine.getNextState()
    }

    public setNextState(state: FabricState): void {
        this.engine.setNextState(state)
    }

    public getIntervalStateLength(intervalIndex: number, state: FabricState): number {
        return this.engine.getIntervalStateLength(intervalIndex, state)
    }

    public setIntervalStateLength(intervalIndex: number, state: FabricState, length: number): void {
        this.engine.setIntervalStateLength(intervalIndex, state, length)
    }

    public setElasticFactor(intervalIndex: number, elasticFactor: number): void {
        this.engine.setElasticFactor(intervalIndex, elasticFactor)
    }

    public getElasticFactor(intervalIndex: number): number {
        return this.engine.getElasticFactor(intervalIndex)
    }

    public changeRestLength(intervalIndex: number, length: number): void {
        this.engine.changeRestLength(intervalIndex, length)
    }

    public multiplyRestLength(intervalIndex: number, factor: number): void {
        this.engine.multiplyRestLength(intervalIndex, factor)
    }

    public getJointLocation(jointIndex: number): Vector3 {
        return vectorFromFloatArray(this.jointLocations.floats, jointIndex * 3)
    }

    public getIntervalUnit(intervalIndex: number): Vector3 {
        return vectorFromFloatArray(this.intervalUnits.floats, intervalIndex * 3)
    }

    public getIntervalDisplacement(intervalIndex: number): number {
        return this.intervalDisplacements.floats[intervalIndex]
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

    public get engine(): IFabricEngine {
        this.fabricEngine.setInstance(this.index)
        return this.fabricEngine
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
