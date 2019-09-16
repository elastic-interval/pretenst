/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { GlobalFeature, IFabricExports, IntervalRole } from "./fabric-exports"
import { InstanceExports } from "./fabric-kernel"

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
}

function getPhysicsFeature(label: string, defaultValue: number): number {
    const value = localStorage.getItem(label)
    return value ? parseFloat(value) : defaultValue
}

function setPhysicsFeature(label: string, factor: number): void {
    localStorage.setItem(label, factor.toFixed(10))
}

export class Physics {

    private readonly featuresArray: IPhysicsFeature[]

    constructor() {
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

    public applyGlobal(fabricExports: IFabricExports): object {
        const featureValues = {}
        this.featuresArray.forEach(feature => {
            const globalFeature = feature.name.globalFeature
            if (globalFeature === undefined) {
                return
            }
            const factor = feature.factor$.getValue()
            featureValues[feature.label] = fabricExports.setGlobalFeature(globalFeature, factor)
        })
        return featureValues
    }

    public acquireLocal(instanceExports: InstanceExports): void {
        this.featuresArray.forEach(feature => {
            const intervalRole = feature.name.intervalRole
            if (intervalRole === undefined) {
                return
            }
            feature.defaultValue = instanceExports.getRoleIdealSpan(intervalRole)
            const defaultValue = getPhysicsFeature(feature.label, feature.defaultValue)
            instanceExports.setRoleIdealSpan(intervalRole, defaultValue)
            if (feature.factor$.getValue() !== defaultValue) {
                feature.factor$.next(defaultValue)
            }
        })
    }

    public applyLocal(instanceExports: InstanceExports): void {
        this.featuresArray.forEach(feature => {
            const intervalRole = feature.name.intervalRole
            if (intervalRole === undefined) {
                return
            }
            const factor = feature.factor$.getValue()
            instanceExports.setRoleIdealSpan(intervalRole, factor)
        })
    }

    private createFeature(name: IFeatureName): IPhysicsFeature {
        const label = nameLabel(name)
        const isGlobal = name.globalFeature !== undefined
        const factor = new BehaviorSubject<number>(getPhysicsFeature(label, 1.0))
        return {
            label,
            name,
            isGlobal,
            setFactor: (newFactor: number) => {
                setPhysicsFeature(label, newFactor)
                factor.next(newFactor)
            },
            factor$: factor,
            defaultValue: isGlobal ? 1.0 : factor.getValue(),
        }
    }
}
