/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, PhysicsFeature } from "../fabric/fabric-engine"
import { codeTreeToString, ICodeTree } from "../fabric/tensegrity-brick-types"

const FABRIC_CODE_KEY = "FabricCode"
const STORAGE_INDEX_KEY = "StorageIndex"

async function getBootstrapCodeTrees(): Promise<ICodeTree[]> {
    const response = await fetch("/bootstrap.json")
    const body = await response.json()
    if (!body) {
        return [{_: 0}, {_: 9}]
    }
    return body.pretenst
}

export function getLocalCodeTrees(): ICodeTree[] {
    const localFabricCode = localStorage.getItem(FABRIC_CODE_KEY)
    return localFabricCode ? JSON.parse(localFabricCode) : []
}

export async function loadCodeTrees(): Promise<ICodeTree[]> {
    const bootstrapTrees = await getBootstrapCodeTrees()
    const localTrees = getLocalCodeTrees()
    return [...bootstrapTrees, ...localTrees]
}

export async function storeCodeTree(codeTree: ICodeTree): Promise<{ trees: ICodeTree[], index: number }> {
    const code = codeTreeToString(codeTree)
    const trees = await loadCodeTrees()
    const index = trees.map(codeTreeToString).findIndex(localCode => localCode === code)
    if (index >= 0) {
        storeStorageIndex(index)
        return {trees, index}
    }
    trees.push(codeTree)
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(trees))
    storeStorageIndex(trees.length + 1)
    return {trees, index: trees.length - 1}
}

export function loadStorageIndex(): number {
    const item = localStorage.getItem(STORAGE_INDEX_KEY)
    if (!item) {
        return 0
    }
    return parseInt(item, 10)
}

export function storeStorageIndex(index: number): void {
    localStorage.setItem(STORAGE_INDEX_KEY, index.toString(10))
}

function defaultRoleLength(intervalRole: IntervalRole): number {
    switch (intervalRole) {
        case IntervalRole.Bar:
            return 2 * 1.618
        case IntervalRole.Triangle:
            return 2.123
        case IntervalRole.Ring:
            return 1.775
        case IntervalRole.Cross:
            return 1.583
        case IntervalRole.BowMid:
            return 0.8521
        case IntervalRole.BowEndLow:
            return 1.380
        case IntervalRole.BowEndHigh:
            return 1.571
        default:
            throw new Error("Bad interval role")
    }
}

export function roleLength(intervalRole: IntervalRole, defaultValue?: boolean): number {
    if (defaultValue) {
        return defaultRoleLength(intervalRole)
    }
    const value = localStorage.getItem(IntervalRole[intervalRole])
    return (value ? parseFloat(value) : defaultRoleLength(intervalRole))
}

function defaultPhysicsValue(physicsFeature: PhysicsFeature): number {
    switch (physicsFeature) {
        case PhysicsFeature.GravityAbove:
            return 0.000005
        case PhysicsFeature.AntigravityBelow:
            return -0.03
        case PhysicsFeature.AntigravityBelowWater:
            return -0.00001
        case PhysicsFeature.DragAbove:
            return 0.001
        case PhysicsFeature.DragBelow:
            return 0.6
        case PhysicsFeature.DragBelowWater:
            return 0.001
        case PhysicsFeature.PushElastic:
            return 1.2
        case PhysicsFeature.PullElastic:
            return 0.3
        case PhysicsFeature.BusyCountdown:
            return 300.0
        case PhysicsFeature.PretensingCountdown:
            return 15000.0
        case PhysicsFeature.PretensingIntensity:
            return 5.0
        default:
            throw new Error("Bad physics feature")
    }
}

export enum PhysicsMultiplier {
    One,
    Thousandths,
    NegativeThousandths,
    Millionths,
    NegativeMillionths,
    Billionths,
}

export function multiplierValue(multiplier: PhysicsMultiplier): number {
    switch (multiplier) {
        case PhysicsMultiplier.One:
            return 1
        case PhysicsMultiplier.Thousandths:
            return 1000
        case PhysicsMultiplier.NegativeThousandths:
            return -1000
        case PhysicsMultiplier.Millionths:
            return 1000000
        case PhysicsMultiplier.NegativeMillionths:
            return -1000000
        case PhysicsMultiplier.Billionths:
            return 1000000000
        default:
            throw new Error("Bad multiplier")
    }
}

export function multiplierSymbol(multiplier: PhysicsMultiplier): string {
    switch (multiplier) {
        case PhysicsMultiplier.One:
            return ""
        case PhysicsMultiplier.NegativeThousandths:
        case PhysicsMultiplier.Thousandths:
            return "m"
        case PhysicsMultiplier.Millionths:
        case PhysicsMultiplier.NegativeMillionths:
            return "\u03BC"
        case PhysicsMultiplier.Billionths:
            return "n"
        default:
            throw new Error("Bad multiplier")
    }
}

export function featureMultiplier(physicsFeature: PhysicsFeature): PhysicsMultiplier {
    switch (physicsFeature) {
        case PhysicsFeature.GravityAbove:
            return PhysicsMultiplier.Billionths
        case PhysicsFeature.AntigravityBelow:
            return PhysicsMultiplier.NegativeMillionths
        case PhysicsFeature.AntigravityBelowWater:
            return PhysicsMultiplier.NegativeMillionths
        case PhysicsFeature.DragAbove:
            return PhysicsMultiplier.Millionths
        case PhysicsFeature.DragBelow:
            return PhysicsMultiplier.Thousandths
        case PhysicsFeature.DragBelowWater:
            return PhysicsMultiplier.Thousandths
        case PhysicsFeature.PushElastic:
            return PhysicsMultiplier.Thousandths
        case PhysicsFeature.PullElastic:
            return PhysicsMultiplier.Thousandths
        case PhysicsFeature.BusyCountdown:
            return PhysicsMultiplier.One
        case PhysicsFeature.PretensingCountdown:
            return PhysicsMultiplier.One
        case PhysicsFeature.PretensingIntensity:
            return PhysicsMultiplier.Thousandths
        default:
            throw new Error("Bad physics feature")
    }
}

export function physicsValue(physicsFeature: PhysicsFeature, defaultValue?: boolean): number {
    if (defaultValue) {
        return defaultPhysicsValue(physicsFeature)
    }
    const value = localStorage.getItem(PhysicsFeature[physicsFeature])
    return value ? parseFloat(value) : defaultPhysicsValue(physicsFeature)
}

export function setFeature(label: string, factor: number): void {
    localStorage.setItem(label, factor.toFixed(10))
}
