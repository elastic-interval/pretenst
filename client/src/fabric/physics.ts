/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { GlobalFeature, IFabricExports, IntervalRole } from "./fabric-exports"
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
            const handle = (globalFeature: GlobalFeature) => {
                currentValue = fabricExports.setGlobalFeature(globalFeature, factor)
            }
            switch (feature.name) {
                case PhysicsFeature.GravityAbove:
                    handle(GlobalFeature.GravityAbove)
                    break
                case PhysicsFeature.GravityBelowLand:
                    handle(GlobalFeature.GravityBelowLand)
                    break
                case PhysicsFeature.GravityBelowWater:
                    handle(GlobalFeature.GravityBelowWater)
                    break
                case PhysicsFeature.DragAbove:
                    handle(GlobalFeature.DragAbove)
                    break
                case PhysicsFeature.DragBelowLand:
                    handle(GlobalFeature.DragBelowLand)
                    break
                case PhysicsFeature.DragBelowWater:
                    handle(GlobalFeature.DragBelowWater)
                    break
                case PhysicsFeature.GlobalElastic:
                    handle(GlobalFeature.GlobalElastic)
                    break
                case PhysicsFeature.MaxSpanVariation:
                    handle(GlobalFeature.MaxSpanVariation)
                    break
                case PhysicsFeature.SpanVariationSpeed:
                    handle(GlobalFeature.SpanVariationSpeed)
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
            const handle = (intervalRole: IntervalRole) => {
                currentValue = instanceExports.setElasticFactor(intervalRole, factor)
            }
            switch (feature.name) {
                case PhysicsFeature.MuscleElastic:
                    handle(IntervalRole.MUSCLE)
                    break
                case PhysicsFeature.BarElastic:
                    handle(IntervalRole.BAR)
                    break
                case PhysicsFeature.TriangleElastic:
                    handle(IntervalRole.TRIANGLE)
                    break
                case PhysicsFeature.RingElastic:
                    handle(IntervalRole.RING)
                    break
                case PhysicsFeature.CrossElastic:
                    handle(IntervalRole.CROSS)
                    break
                case PhysicsFeature.BowMidElastic:
                    handle(IntervalRole.BOW_MID)
                    break
                case PhysicsFeature.BowEndElastic:
                    handle(IntervalRole.BOW_END)
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
