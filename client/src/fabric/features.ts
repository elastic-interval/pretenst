
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { IFabricEngine} from "./fabric-engine"
import { IntervalRole, roleLength } from "./interval-role"
import { PhysicsFeature, physicsValue } from "./physics-feature"

interface IFeatureName {
    physicsFeature?: PhysicsFeature
    intervalRole?: IntervalRole
}

function nameLabel(name: IFeatureName): string {
    if (name.physicsFeature !== undefined) {
        return PhysicsFeature[name.physicsFeature]
    }
    if (name.intervalRole !== undefined) {
        return IntervalRole[name.intervalRole]
    }
    return "?"
}

function featureAdjustmentFactor(name: IFeatureName): number {
    if (name.physicsFeature !== undefined) {
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
    if (name.physicsFeature !== undefined) {
        return physicsValue(name.physicsFeature, defaultValue)
    }
    return 1
}

export function applyPhysicsFeature(engine: IFabricEngine, feature: IFeature): void {
    const physicsFeature = feature.name.physicsFeature
    const factor = feature.factor$.getValue()
    if (physicsFeature === undefined) {
        return
    }
    engine.setPhysicsFeature(physicsFeature, factor)
}

export function enumToFeatureArray(enumObject: object, isPhysics: boolean): IFeature[] {
    return Object.keys(enumObject)
        .map(key => enumObject[key])
        .filter(value => typeof value === "number")
        .map(feature => createFeature(isPhysics ? {physicsFeature: feature} : {intervalRole: feature}))
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
