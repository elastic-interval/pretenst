/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricFeature, IFabricEngine } from "./fabric-engine"
import { FloatFeature } from "./fabric-features"
import { faceVector, vectorFromArray, vectorToArray } from "./fabric-kernel"

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
    private _strainNuances: LazyFloatArray
    private _stiffnesses: LazyFloatArray
    private _linearDensities: LazyFloatArray

    constructor(
        public readonly index: number,
        private buffer: ArrayBuffer,
        private releaseInstance: (index: number) => void,
        private fabricEngine: IFabricEngine,
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
        this._strainNuances = new LazyFloatArray(b, offset + e._intervalStrainNuances(), () => e.getIntervalCount())
        this._stiffnesses = new LazyFloatArray(b, offset + e._stiffnesses(), () => e.getIntervalCount())
        this._linearDensities = new LazyFloatArray(b, offset + e._linearDensities(), () => e.getIntervalCount())
    }

    public applyFeature(feature: FloatFeature): void {
        this._fabricFeatures.floats[feature.fabricFeature] = feature.numeric
    }

    public setFeatureValue(fabricFeature: FabricFeature, value: number): void {
        this._fabricFeatures.floats[fabricFeature] = value
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
        this._strainNuances.clear()
        this._stiffnesses.clear()
        this._linearDensities.clear()
    }

    public location(jointIndex: number): Vector3 {
        return vectorFromArray(this._jointLocations.floats, jointIndex )
    }

    public moveLocation(jointIndex: number, move: Vector3): void {
        const newLocation = this.location(jointIndex).add(move)
        vectorToArray(newLocation, this._jointLocations.floats, jointIndex)
    }

    public unitVector(intervalIndex: number): Vector3 {
        return vectorFromArray(this._unitVectors.floats, intervalIndex)
    }

    public get strains(): Float32Array {
        return this._strains.floats
    }

    public get strainNuances(): Float32Array {
        return this._strainNuances.floats
    }

    public get stiffnesses(): Float32Array {
        return this._stiffnesses.floats
    }

    public get linearDensities(): Float32Array {
        return this._linearDensities.floats
    }

    public get faceLocations(): Float32Array {
        return this._faceLocations.floats
    }

    public faceMidpoint(faceIndex: number): Vector3 {
        return faceVector(faceIndex, this._faceLocations.floats)
    }

    public faceNormal(faceIndex: number): Vector3 {
        return faceVector(faceIndex, this._faceNormals.floats)
    }

    public intervalLocation(intervalIndex: number): Vector3 {
        return vectorFromArray(this._lineLocations.floats, intervalIndex)
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
        return vectorFromArray(this._midpoint.floats, 0, midpoint)
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
