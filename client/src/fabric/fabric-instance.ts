/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricFeature, IFabricEngine } from "./fabric-engine"
import { FloatFeature } from "./fabric-features"
import { vectorFromFloatArray } from "./fabric-kernel"
import { LifePhase } from "./fabric-state"

export class FabricInstance {
    private _fabricFeatures: LazyFloatArray
    private _midpoint: LazyFloatArray
    private _lineColors: LazyFloatArray
    private _lineLocations: LazyFloatArray
    private _faceMidpoints: LazyFloatArray
    private _faceNormals: LazyFloatArray
    private _faceLocations: LazyFloatArray
    private _jointLocations: LazyFloatArray
    private _unitVectors: LazyFloatArray
    private _strains: LazyFloatArray
    private _elasticities: LazyFloatArray
    private _linearDensities: LazyFloatArray

    constructor(
        public readonly index: number,
        private buffer: ArrayBuffer,
        private releaseInstance: (index: number) => void,
        private fabricEngine: IFabricEngine,
        private initialPretenst: number,
        private maturePretenst: number,
    ) {
        const e = this.engine
        const offset = e._fabricOffset()
        const b = this.buffer
        this._fabricFeatures = new LazyFloatArray(b, offset + e._fabricFeatures(), () => Object.keys(FabricFeature).length)
        this._midpoint = new LazyFloatArray(b, offset + e._midpoint(), () => 3)
        this._lineColors = new LazyFloatArray(b, offset + e._lineColors(), () => e.getIntervalCount() * 3 * 2)
        this._lineLocations = new LazyFloatArray(b, offset + e._lineLocations(), () => e.getIntervalCount() * 3 * 2)
        this._faceMidpoints = new LazyFloatArray(b, offset + e._faceMidpoints(), () => e.getFaceCount() * 3)
        this._faceNormals = new LazyFloatArray(b, offset + e._faceNormals(), () => e.getFaceCount() * 3 * 3)
        this._faceLocations = new LazyFloatArray(b, offset + e._faceLocations(), () => e.getFaceCount() * 3 * 3)
        this._jointLocations = new LazyFloatArray(b, offset + e._jointLocations(), () => e.getJointCount() * 3)
        this._unitVectors = new LazyFloatArray(b, offset + e._intervalUnits(), () => e.getIntervalCount() * 3)
        this._strains = new LazyFloatArray(b, offset + e._intervalStrains(), () => e.getIntervalCount())
        this._elasticities = new LazyFloatArray(b, offset + e._elasticities(), () => e.getIntervalCount())
        this._linearDensities = new LazyFloatArray(b, offset + e._linearDensities(), () => e.getIntervalCount())
    }

    public applyFeature(feature: FloatFeature): void {
        this._fabricFeatures.floats[feature.fabricFeature] = feature.factor
    }

    public setFeatureValue(fabricFeature: FabricFeature, value: number): void {
        this._fabricFeatures.floats[fabricFeature] = value
    }

    public growing(): LifePhase {
        this.forgetDimensions()
        return this.engine.setLifePhase(LifePhase.Growing, this.initialPretenst)
    }

    public shaping(): LifePhase {
        return this.engine.setLifePhase(LifePhase.Shaping, this.initialPretenst)
    }

    public slack(): LifePhase {
        return this.engine.setLifePhase(LifePhase.Slack, 0)
    }

    public pretensing(): LifePhase {
        return this.engine.setLifePhase(LifePhase.Pretensing, this.maturePretenst)
    }

    public pretenst(): LifePhase {
        return this.engine.setLifePhase(LifePhase.Pretenst, this.maturePretenst)
    }

    public release(): void {
        this.releaseInstance(this.index)
    }

    public forgetDimensions(): void {
        this._faceMidpoints.clear()
        this._faceLocations.clear()
        this._faceNormals.clear()
        this._jointLocations.clear()
        this._lineLocations.clear()
        this._lineColors.clear()
        this._unitVectors.clear()
        this._strains.clear()
        this._elasticities.clear()
        this._linearDensities.clear()
    }

    public location(jointIndex: number): Vector3 {
        return vectorFromFloatArray(this._jointLocations.floats, jointIndex * 3)
    }

    public unitVector(intervalIndex: number): Vector3 {
        return vectorFromFloatArray(this._unitVectors.floats, intervalIndex * 3)
    }

    public get strains(): Float32Array {
        return this._strains.floats
    }

    public get elasticities(): Float32Array {
        return this._elasticities.floats
    }

    public get linearDensities(): Float32Array {
        return this._linearDensities.floats
    }

    public get faceLocations(): Float32Array {
        return this._faceLocations.floats
    }

    public faceMidpoint(faceIndex: number): Vector3 {
        return this.faceVector(faceIndex, this._faceLocations.floats)
    }

    public faceNormal(faceIndex: number): Vector3 {
        return this.faceVector(faceIndex, this._faceNormals.floats)
    }

    public intervalLocation(intervalIndex: number): Vector3 {
        return vectorFromFloatArray(this._lineLocations.floats, intervalIndex * 3)
    }

    public get faceNormals(): Float32Array {
        return this._faceNormals.floats
    }

    public get lineLocations(): Float32Array {
        return this._lineLocations.floats
    }

    public get lineColors(): Float32Array {
        return this._lineColors.floats
    }

    public getIntervalMidpoint(intervalIndex: number): Vector3 {
        const a = this.intervalLocation(intervalIndex * 2)
        const b = this.intervalLocation(intervalIndex * 2 + 1)
        return new Vector3().add(a).add(b).multiplyScalar(0.5)
    }

    public getMidpoint(midpoint?: Vector3): Vector3 {
        return vectorFromFloatArray(this._midpoint.floats, 0, midpoint)
    }

    public get engine(): IFabricEngine {
        this.fabricEngine.setInstance(this.index)
        return this.fabricEngine
    }

    public cloneTo(instance: FabricInstance): void {
        this.fabricEngine.cloneInstance(this.index, instance.index)
    }

    public cloneFrom(instance: FabricInstance): void {
        this.fabricEngine.cloneInstance(instance.index, this.index)
    }

    private faceVector(faceIndex: number, array: Float32Array): Vector3 {
        const index = faceIndex * 3
        const a = vectorFromFloatArray(array, 3 * index)
        const b = vectorFromFloatArray(array, 3 * (index + 1))
        const c = vectorFromFloatArray(array, 3 * (index + 2))
        return new Vector3().add(a).add(b).add(c).multiplyScalar(1.0 / 3.0)
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
