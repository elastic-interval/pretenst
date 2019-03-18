import {AppStorage} from "../storage/app-storage"

import {IFabricExports} from "./fabric-exports"

export enum PhysicsFeature {
    GravityAbove = "Gravity Above",
    GravityBelowLand = "Gravity Below Land",
    GravityBelowWater = "Gravity Below Water",
    DragAbove = "Drag Above",
    DragBelowLand = "Drag Below Land",
    DragBelowWater = "Drag Below Water",
    ElasticFactor = "Elastic Factor",
    MaxSpanVariation = "Maximum Span Variation",
    SpanVariationSpeed = "Span Variation Speed",
}

export interface IPhysicsFeature {
    feature: PhysicsFeature
    getFactor: () => number
    setFactor: (factor: number) => void
}

export class Physics {

    private readonly featuresArray: IPhysicsFeature[]

    constructor(private storage: AppStorage) {
        this.featuresArray = Object.keys(PhysicsFeature).map(f => this.createFeature(PhysicsFeature[f]))
    }

    public get features(): IPhysicsFeature[] {
        return this.featuresArray
    }

    public applyToFabric(fabricExports: IFabricExports): object {
        const featureValues = {}
        this.featuresArray.forEach(physicsFeature => {
            const factor = physicsFeature.getFactor()
            let currentValue = 0
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
                case PhysicsFeature.ElasticFactor:
                    currentValue = fabricExports.setElasticFactor(factor)
                    break
                case PhysicsFeature.MaxSpanVariation:
                    currentValue = fabricExports.setMaxSpanVariation(factor)
                    break
                case PhysicsFeature.SpanVariationSpeed:
                    currentValue = fabricExports.setSpanVariationSpeed(factor)
                    break
                default:
                    throw new Error()
            }
            featureValues[physicsFeature.feature] = currentValue
        })
        return featureValues
    }

    private createFeature(feature: PhysicsFeature): IPhysicsFeature {
        return {
            feature,
            getFactor: () => this.storage.getPhysicsFeature(feature),
            setFactor: (factor: number) => this.storage.setPhysicsFeature(feature, factor),
        }
    }
}
