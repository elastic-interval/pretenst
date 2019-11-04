/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricFeature, IFabricEngine } from "./fabric-engine"
import { FloatFeature } from "./fabric-features"
import { vectorFromFloatArray } from "./fabric-kernel"
import { LifePhase } from "./life-phase"

export class FabricInstance {
    private fabricFeatures: LazyFloatArray
    private midpoint: LazyFloatArray
    private lineColors: LazyFloatArray
    private lineLocations: LazyFloatArray
    private faceMidpoints: LazyFloatArray
    private faceNormals: LazyFloatArray
    private faceLocations: LazyFloatArray
    private jointLocations: LazyFloatArray
    private intervalUnits: LazyFloatArray
    private intervalStrains: LazyFloatArray
    private elasticFactors: LazyFloatArray

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
        this.fabricFeatures = new LazyFloatArray(b, offset + e._fabricFeatures(), () => Object.keys(FabricFeature).length)
        this.midpoint = new LazyFloatArray(b, offset + e._midpoint(), () => 3)
        this.lineColors = new LazyFloatArray(b, offset + e._lineColors(), () => e.getIntervalCount() * 3 * 2)
        this.lineLocations = new LazyFloatArray(b, offset + e._lineLocations(), () => e.getIntervalCount() * 3 * 2)
        this.faceMidpoints = new LazyFloatArray(b, offset + e._faceMidpoints(), () => e.getFaceCount() * 3)
        this.faceNormals = new LazyFloatArray(b, offset + e._faceNormals(), () => e.getFaceCount() * 3 * 3)
        this.faceLocations = new LazyFloatArray(b, offset + e._faceLocations(), () => e.getFaceCount() * 3 * 3)
        this.jointLocations = new LazyFloatArray(b, offset + e._jointLocations(), () => e.getJointCount() * 3)
        this.intervalUnits = new LazyFloatArray(b, offset + e._intervalUnits(), () => e.getIntervalCount() * 3)
        this.intervalStrains = new LazyFloatArray(b, offset + e._intervalStrains(), () => e.getIntervalCount())
        this.elasticFactors = new LazyFloatArray(b, offset + e._elasticFactors(), () => e.getIntervalCount())
    }

    public applyFeature(feature: FloatFeature): void {
        this.fabricFeatures.floats[feature.fabricFeature] = feature.factor
    }

    public getFeatureValue(fabricFeature: FabricFeature): number {
        return this.fabricFeatures.floats[fabricFeature]
    }

    public growing(): LifePhase {
        console.log("Growing")
        this.forgetDimensions()
        return this.engine.setLifePhase(LifePhase.Growing, this.initialPretenst)
    }

    public shaping(): LifePhase {
        console.log("Shaping")
        return this.engine.setLifePhase(LifePhase.Shaping, this.initialPretenst)
    }

    public slack(): LifePhase {
        console.log("Slack")
        return this.engine.setLifePhase(LifePhase.Slack, 0)
    }

    public pretensing(): LifePhase {
        console.log("Pretensing")
        return this.engine.setLifePhase(LifePhase.Pretensing, this.maturePretenst)
    }

    public  pretenst(): LifePhase {
        console.log("Pretenst")
        return this.engine.setLifePhase(LifePhase.Pretenst, this.maturePretenst)
    }

    public release(): void {
        this.releaseInstance(this.index)
    }

    public forgetDimensions(): void {
        this.faceMidpoints.clear()
        this.faceLocations.clear()
        this.faceNormals.clear()
        this.jointLocations.clear()
        this.lineLocations.clear()
        this.lineColors.clear()
        this.intervalUnits.clear()
        this.intervalStrains.clear()
        this.elasticFactors.clear()
    }

    public getJointLocation(jointIndex: number): Vector3 {
        return vectorFromFloatArray(this.jointLocations.floats, jointIndex * 3)
    }

    public getIntervalUnit(intervalIndex: number): Vector3 {
        return vectorFromFloatArray(this.intervalUnits.floats, intervalIndex * 3)
    }

    public get strains(): Float32Array {
        return this.intervalStrains.floats
    }

    public get elastics(): Float32Array {
        return this.elasticFactors.floats
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

    public getMidpoint(midpoint?: Vector3): Vector3 {
        return vectorFromFloatArray(this.midpoint.floats, 0, midpoint)
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
