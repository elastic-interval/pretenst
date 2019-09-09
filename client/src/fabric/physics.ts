/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { IFabricExports, IntervalRole } from "./fabric-exports"
import { InstanceExports } from "./fabric-kernel"

export enum PhysicsFeature {
    GravityAbove = "Gravity Above",
    GravityBelowLand = "Gravity Below Land",
    GravityBelowWater = "Gravity Below Water",
    DragAbove = "Drag Above",
    DragBelowLand = "Drag Below Land",
    DragBelowWater = "Drag Below Water",
    MaxSpanVariation = "Maximum Span Variation",
    SpanVariationSpeed = "Span Variation Speed",
    GlobalElastic = "Global Elastic",
    MuscleElastic = "Muscle Elastic",
    BarElastic = "Bar Elastic",
    TriangleElastic = "Triangle Elastic",
    RingElastic = "Ring Elastic",
    CrossElastic = "Cross Elastic",
    BowMidElastic = "Bow Mid Elastic",
    BowEndElastic = "Bow End Elastic",
}

export interface IPhysicsFeature {
    name: PhysicsFeature
    setFactor: (factor: number) => void
    factor$: BehaviorSubject<number>
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
        this.featuresArray.forEach(feature => {
            const factor = feature.factor$.getValue()
            let currentValue = 0
            let ignore = false
            switch (feature.name) {
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
                case PhysicsFeature.GlobalElastic:
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
                featureValues[feature.name] = currentValue
            }
        })
        return featureValues
    }


    public applyLocal(instanceExports: InstanceExports): object {
        const featureValues = {}
        this.featuresArray.forEach(feature => {
            const factor = feature.factor$.getValue()
            let currentValue = 0
            let ignore = false
            switch (feature.name) {
                case PhysicsFeature.MuscleElastic:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.MUSCLE, factor)
                    break
                case PhysicsFeature.BarElastic:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.BAR, factor)
                    break
                case PhysicsFeature.TriangleElastic:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.TRIANGLE, factor)
                    break
                case PhysicsFeature.RingElastic:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.RING, factor)
                    break
                case PhysicsFeature.CrossElastic:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.CROSS, factor)
                    break
                case PhysicsFeature.BowMidElastic:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.BOW_MID, factor)
                    break
                case PhysicsFeature.BowEndElastic:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.BOW_END, factor)
                    break
                default:
                    ignore = true
            }
            if (!ignore) {
                featureValues[feature.name] = currentValue
            }
        })
        return featureValues
    }

    private createFeature(feature: PhysicsFeature): IPhysicsFeature {
        const factor = new BehaviorSubject<number>(getPhysicsFeature(feature))
        return {
            name: feature,
            setFactor: (newFactor: number) => {
                setPhysicsFeature(feature, newFactor)
                factor.next(newFactor)
            },
            factor$: factor,
        }
    }
}
