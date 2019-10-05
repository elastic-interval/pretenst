/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { physicsValue, roleLength, setFeature } from "../storage/local-storage"

import { IFabricEngine, IntervalRole, PhysicsFeature } from "./fabric-engine"

interface IFeatureName {
    physicsFeature?: PhysicsFeature
    intervalRole?: IntervalRole
}

export function nameLabel(name: IFeatureName): string {
    if (name.physicsFeature !== undefined) {
        return PhysicsFeature[name.physicsFeature]
    }
    if (name.intervalRole !== undefined) {
        return IntervalRole[name.intervalRole]
    }
    return "?"
}

export interface IFeature {
    label: string
    name: IFeatureName
    setFactor: (factor: number) => void
    factor$: BehaviorSubject<number>
    defaultValue: number
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
    return {
        label, name, defaultValue, factor$,
        setFactor: (newFactor: number) => {
            setFeature(label, newFactor)
            factor$.next(newFactor)
        },
    }
}
