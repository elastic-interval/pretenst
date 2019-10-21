
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { GlobalFeature, IFabricEngine} from "./fabric-engine"
import { GLOBAL_FEATURE, globalFeatureValue } from "./global-feature"
import { IntervalRole, roleLength } from "./interval-role"

interface IFeatureName {
    globalFeature?: GlobalFeature
    intervalRole?: IntervalRole
}

function nameLabel(name: IFeatureName): string {
    if (name.globalFeature !== undefined) {
        return GLOBAL_FEATURE[name.globalFeature].name
    }
    if (name.intervalRole !== undefined) {
        return IntervalRole[name.intervalRole]
    }
    return "?"
}

function featureAdjustmentFactor(name: IFeatureName): number {
    if (name.globalFeature !== undefined) {
        return 1.1
    }
    if (name.intervalRole !== undefined) {
        return 1.01
    }
    return 1
}

export interface IFeature {
    label: string
    name: IFeatureName
    setFactor: (factor: number) => void
    factor$: BehaviorSubject<number>
    defaultValue: number
    adjustmentFactor: number
}

export function getFeatureValue(name: IFeatureName, defaultValue?: boolean): number {
    if (name.intervalRole !== undefined) {
        return roleLength(name.intervalRole, defaultValue)
    }
    if (name.globalFeature !== undefined) {
        return globalFeatureValue(name.globalFeature, defaultValue)
    }
    return 1
}

export function applyPhysicsFeature(engine: IFabricEngine, feature: IFeature): void {
    const physicsFeature = feature.name.globalFeature
    const factor = feature.factor$.getValue()
    if (physicsFeature === undefined) {
        return
    }
    engine.setGlobalFeature(physicsFeature, factor)
}

export function enumToFeatureArray(enumObject: object, isPhysics: boolean): IFeature[] {
    return Object.keys(enumObject)
        .map(key => enumObject[key])
        .filter(value => typeof value === "number")
        .map(feature => createFeature(isPhysics ? {globalFeature: feature} : {intervalRole: feature}))
}

function createFeature(name: IFeatureName): IFeature {
    const label = nameLabel(name)
    const factor$ = new BehaviorSubject<number>(getFeatureValue(name))
    const defaultValue = getFeatureValue(name, true)
    const adjustmentFactor = featureAdjustmentFactor(name)
    return {
        label, name, defaultValue, factor$, adjustmentFactor,
        setFactor: (newFactor: number) => {
            localStorage.setItem(label, newFactor.toFixed(10))
            factor$.next(newFactor)
        },
    }
}
