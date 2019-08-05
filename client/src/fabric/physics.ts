/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IFabricExports, IFabricInstanceExports, IntervalRole } from "./fabric-exports"

export enum PhysicsFeature {
    GravityAbove = "Gravity Above",
    GravityBelowLand = "Gravity Below Land",
    GravityBelowWater = "Gravity Below Water",
    DragAbove = "Drag Above",
    DragBelowLand = "Drag Below Land",
    DragBelowWater = "Drag Below Water",
    GlobalElasticFactor = "Global Elastic Factor",
    MaxSpanVariation = "Maximum Span Variation",
    SpanVariationSpeed = "Span Variation Speed",
    MuscleElasticFactor = "Muscle Elastic Factor",
    BarElasticFactor = "Bar Elastic Factor",
    TriangleElasticFactor = "Triangle Elastic Factor",
    RingElasticFactor = "Ring Elastic Factor",
    CrossElasticFactor = "Cross Elastic Factor",
}

export interface IPhysicsFeature {
    feature: PhysicsFeature
    getFactor: () => number
    setFactor: (factor: number) => void
}

function getPhysicsFeature(feature: PhysicsFeature): number {
    const value = localStorage.getItem(feature)
    return value ? parseFloat(value) : 1.0
}

function setPhysicsFeature(feature: PhysicsFeature, factor: number): void {
    localStorage.setItem(feature, factor.toFixed(3))
}

export class Physics {

    private readonly featuresArray: IPhysicsFeature[]

    constructor() {
        this.featuresArray = Object.keys(PhysicsFeature).map(f => this.createFeature(PhysicsFeature[f]))
    }

    public get features(): IPhysicsFeature[] {
        return this.featuresArray
    }

    public applyGlobal(fabricExports: IFabricExports): object {
        const featureValues = {}
        this.featuresArray.forEach(physicsFeature => {
            const factor = physicsFeature.getFactor()
            let currentValue = 0
            let ignore = false
            switch (physicsFeature.feature) {
                case PhysicsFeature.GravityAbove:
                    currentValue = fabricExports.setGravityAbove(factor)
                    break
                case PhysicsFeature.GravityBelowLand:
                    currentValue = fabricExports.setGravityBelowLand(factor)
                    break
                case PhysicsFeature.GravityBelowWater:
                    currentValue = fabricExports.setGravityBelowWater(factor)
                    break
                case PhysicsFeature.DragAbove:
                    currentValue = fabricExports.setDragAbove(factor)
                    break
                case PhysicsFeature.DragBelowLand:
                    currentValue = fabricExports.setDragBelowLand(factor)
                    break
                case PhysicsFeature.DragBelowWater:
                    currentValue = fabricExports.setDragBelowWater(factor)
                    break
                case PhysicsFeature.GlobalElasticFactor:
                    currentValue = fabricExports.setGlobalElasticFactor(factor)
                    break
                case PhysicsFeature.MaxSpanVariation:
                    currentValue = fabricExports.setMaxSpanVariation(factor)
                    break
                case PhysicsFeature.SpanVariationSpeed:
                    currentValue = fabricExports.setSpanVariationSpeed(factor)
                    break
                default:
                    ignore = true
            }
            if (!ignore) {
                featureValues[physicsFeature.feature] = currentValue
            }
        })
        return featureValues
    }


    public applyLocal(fabricExports: IFabricInstanceExports): object {
        const featureValues = {}
        this.featuresArray.forEach(physicsFeature => {
            const factor = physicsFeature.getFactor()
            let currentValue = 0
            let ignore = false
            switch (physicsFeature.feature) {
                case PhysicsFeature.MuscleElasticFactor:
                    currentValue = fabricExports.setElasticFactor(IntervalRole.MUSCLE, factor)
                    break
                case PhysicsFeature.BarElasticFactor:
                    currentValue = fabricExports.setElasticFactor(IntervalRole.BAR, factor)
                    break
                case PhysicsFeature.TriangleElasticFactor:
                    currentValue = fabricExports.setElasticFactor(IntervalRole.TRI_CABLE, factor)
                    break
                case PhysicsFeature.RingElasticFactor:
                    currentValue = fabricExports.setElasticFactor(IntervalRole.RING_CABLE, factor)
                    break
                case PhysicsFeature.CrossElasticFactor:
                    currentValue = fabricExports.setElasticFactor(IntervalRole.CROSS_CABLE, factor)
                    break
                default:
                    ignore = true
            }
            if (!ignore) {
                featureValues[physicsFeature.feature] = currentValue
            }
        })
        return featureValues
    }

    private createFeature(feature: PhysicsFeature): IPhysicsFeature {
        return {
            feature,
            getFactor: () => getPhysicsFeature(feature),
            setFactor: (factor: number) => setPhysicsFeature(feature, factor),
        }
    }
}
