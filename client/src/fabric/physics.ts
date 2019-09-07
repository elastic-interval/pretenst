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
    GlobalElasticFactor = "Global Elastic Factor",
    MaxSpanVariation = "Maximum Span Variation",
    SpanVariationSpeed = "Span Variation Speed",
    MuscleElasticFactor = "Muscle Elastic Factor",
    BarElasticFactor = "Bar Elastic Factor",
    TriangleElasticFactor = "Triangle Elastic Factor",
    RingElasticFactor = "Ring Elastic Factor",
    CrossElasticFactor = "Cross Elastic Factor",
    BowCrossElasticFactor = "Bow Cross Elastic Factor",
    BowMidElasticFactor = "Bow Mid Elastic Factor",
    BowEndElasticFactor = "Bow End Elastic Factor",
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
                case PhysicsFeature.MuscleElasticFactor:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.MUSCLE, factor)
                    break
                case PhysicsFeature.BarElasticFactor:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.BAR, factor)
                    break
                case PhysicsFeature.TriangleElasticFactor:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.TRI_CABLE, factor)
                    break
                case PhysicsFeature.RingElasticFactor:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.RING_CABLE, factor)
                    break
                case PhysicsFeature.CrossElasticFactor:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.CROSS_CABLE, factor)
                    break
                case PhysicsFeature.BowCrossElasticFactor:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.BOW_CROSS, factor)
                    break
                case PhysicsFeature.BowMidElasticFactor:
                    currentValue = instanceExports.setElasticFactor(IntervalRole.BOW_MID, factor)
                    break
                case PhysicsFeature.BowEndElasticFactor:
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
