/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { IFabricEngine, IntervalRole, PhysicsFeature } from "./fabric-engine"
import { FabricInstance } from "./fabric-kernel"

export interface IFeatureName {
    physicsFeature?: PhysicsFeature
    intervalRole?: IntervalRole
}

function nameLabel(feature: IFeatureName): string {
    if (feature.physicsFeature !== undefined) {
        return PhysicsFeature[feature.physicsFeature]
    }
    if (feature.intervalRole !== undefined) {
        return IntervalRole[feature.intervalRole]
    }
    return "?"
}

export interface IFeature {
    label: string
    name: IFeatureName
    isPhysics: boolean
    setFactor: (factor: number) => void
    factor$: BehaviorSubject<number>
    defaultValue: number
}

export function applyFeatureToInstance(instance: FabricInstance): (feature: IFeature) => void {
    return feature => {
        const intervalRole = feature.name.intervalRole
        if (intervalRole === undefined) {
            throw new Error("Expected Role feature")
        }
        const factor = feature.factor$.getValue()
        instance.setRoleLength(intervalRole, factor)
    }
}

export function applyFeatureToEngine(engine: IFabricEngine): (feature: IFeature) => void {
    return feature => {
        const physicsFeature = feature.name.physicsFeature
        if (physicsFeature === undefined) {
            throw new Error("Expected Physics feature")
        }
        const factor = feature.factor$.getValue()
        engine.setPhysicsFeature(physicsFeature, factor)
    }
}

export interface IFeatureStorage {
    getFeature: (label: string, defaultValue: number) => number
    setFeature: (label: string, factor: number) => void
}

export function enumToFeatureArray(enumObject: object, isPhysics: boolean, storage: IFeatureStorage): IFeature[] {
    return Object.keys(enumObject)
        .map(key => enumObject[key])
        .filter(value => typeof value === "number")
        .map(feature => createFeature(isPhysics ? {physicsFeature: feature} : {intervalRole: feature}, storage))
}

function createFeature(name: IFeatureName, storage: IFeatureStorage): IFeature {
    const label = nameLabel(name)
    const isPhysics = name.physicsFeature !== undefined
    const factor = new BehaviorSubject<number>(storage.getFeature(label, 1.0))
    return {
        label, name, isPhysics,
        setFactor: (newFactor: number) => {
            storage.setFeature(label, newFactor)
            factor.next(newFactor)
        },
        factor$: factor,
        defaultValue: isPhysics ? 1.0 : factor.getValue(),
    }
}

export function acquireRoleFeature(instance: FabricInstance, feature: IFeature, storage: IFeatureStorage): void {
    const intervalRole = feature.name.intervalRole
    if (intervalRole === undefined) {
        return
    }
    feature.defaultValue = instance.getRoleLength(intervalRole)
    const defaultValue = storage.getFeature(feature.label, feature.defaultValue)
    if (feature.factor$.getValue() !== defaultValue) {
        feature.factor$.next(defaultValue)
    }
}
