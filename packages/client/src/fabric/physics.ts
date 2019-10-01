/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { GlobalFeature, IFabricEngine, IntervalRole } from "./fabric-engine"
import { FabricInstance } from "./fabric-kernel"

export interface IFeatureName {
    globalFeature?: GlobalFeature
    intervalRole?: IntervalRole
}

function nameLabel(feature: IFeatureName): string {
    if (feature.globalFeature !== undefined) {
        return GlobalFeature[feature.globalFeature]
    }
    if (feature.intervalRole !== undefined) {
        return IntervalRole[feature.intervalRole]
    }
    return "?"
}

export interface IPhysicsFeature {
    label: string
    name: IFeatureName
    isGlobal: boolean
    setFactor: (factor: number) => void
    factor$: BehaviorSubject<number>
    defaultValue: number
    apply: (instance: FabricInstance) => void
}

function applyFeature(instance: FabricInstance, feature: IPhysicsFeature): void {
    const intervalRole = feature.name.intervalRole
    if (intervalRole === undefined) {
        return
    }
    const factor = feature.factor$.getValue()
    instance.setRoleLength(intervalRole, factor)
}

export interface IPhysicsFeatureStorage {
    getPhysicsFeature: (label: string, defaultValue: number) => number
    setPhysicsFeature: (label: string, factor: number) => void
}

export class Physics {

    private readonly featuresArray: IPhysicsFeature[]

    constructor(private storage?: IPhysicsFeatureStorage) {
        this.featuresArray = [
            ...Object.keys(GlobalFeature).filter(key => key.length > 1)
                .map(key => GlobalFeature[key])
                .map(globalFeature => this.createFeature({globalFeature})),
            ...Object.keys(IntervalRole).filter(key => key.length > 1)
                .map(key => IntervalRole[key])
                .map(intervalRole => this.createFeature({intervalRole})),
        ]
    }

    public get features(): IPhysicsFeature[] {
        return this.featuresArray
    }

    public applyGlobalFeatures(engine: IFabricEngine): object {
        const featureValues = {}
        this.featuresArray.forEach(feature => {
            const globalFeature = feature.name.globalFeature
            if (globalFeature === undefined) {
                return
            }
            const factor = feature.factor$.getValue()
            featureValues[feature.label] = engine.setGlobalFeature(globalFeature, factor)
        })
        return featureValues
    }

    public acquireLocalFeatures(instance: FabricInstance): void {
        this.featuresArray.forEach(feature => {
            const intervalRole = feature.name.intervalRole
            if (intervalRole === undefined) {
                return
            }
            feature.defaultValue = instance.getRoleLength(intervalRole)
            const defaultValue = this.storage ? this.storage.getPhysicsFeature(feature.label, feature.defaultValue) : feature.defaultValue
            if (feature.factor$.getValue() !== defaultValue) {
                feature.factor$.next(defaultValue)
            }
        })
    }

    public applyLocalFeatures(instance: FabricInstance): void {
        this.featuresArray
            .filter(feature => !!feature.name.intervalRole)
            .forEach(feature => applyFeature(instance, feature))
    }

    private createFeature(name: IFeatureName): IPhysicsFeature {
        const label = nameLabel(name)
        const isGlobal = name.globalFeature !== undefined
        const factor = new BehaviorSubject<number>(this.getFeature(label, 1.0))
        const feature = {
            label,
            name,
            isGlobal,
            setFactor: (newFactor: number) => {
                if (this.storage) {
                    this.storage.setPhysicsFeature(label, newFactor)
                }
                factor.next(newFactor)
            },
            factor$: factor,
            defaultValue: isGlobal ? 1.0 : factor.getValue(),
            apply: (instance: FabricInstance) => applyFeature(instance, feature),
        }
        return feature
    }

    private getFeature(label: string, defaultValue: number): number {
        return this.storage ? this.storage.getPhysicsFeature(label, defaultValue) : defaultValue
    }
}
