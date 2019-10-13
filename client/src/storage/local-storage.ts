/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, PhysicsFeature } from "../fabric/fabric-engine"
import { codeTreeToString, ICodeTree, IPercent, percentToFactor } from "../fabric/tensegrity-brick-types"

const PRETENST = 1.05
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

function getLocalCodeTrees(): ICodeTree[] {
    const localFabricCode = localStorage.getItem(FABRIC_CODE_KEY)
    return localFabricCode ? JSON.parse(localFabricCode) : []
}

export async function loadCodeTrees(): Promise<ICodeTree[]> {
    const bootstrapTrees = await getBootstrapCodeTrees()
    const localTrees = getLocalCodeTrees()
    return [...bootstrapTrees, ...localTrees]
}

export async function storeCodeTree(codeTree: ICodeTree): Promise<ICodeTree[]> {
    const code = codeTreeToString(codeTree)
    const fabricCode = await loadCodeTrees()
    const exists = fabricCode.map(codeTreeToString).some(localCode => localCode === code)
    if (exists) {
        return fabricCode
    }
    const localTrees = getLocalCodeTrees()
    const index = fabricCode.length
    localTrees.push(codeTree)
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(localTrees))
    fabricCode.push(codeTree)
    storeStorageIndex(index)
    return fabricCode
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

export function roleLength(intervalRole: IntervalRole, scale: IPercent, defaultValue?: boolean): number {
    const scaleFactor = percentToFactor(scale)
    if (defaultValue) {
        return scaleFactor * defaultRoleLength(intervalRole)
    }
    const value = localStorage.getItem(IntervalRole[intervalRole])
    const pretenst = intervalRole === IntervalRole.Bar ? PRETENST : 1
    return scaleFactor * (value ? parseFloat(value) : pretenst * defaultRoleLength(intervalRole))
}

function defaultPhysicsValue(physicsFeature: PhysicsFeature): number {
    switch (physicsFeature) {
        case PhysicsFeature.GravityAbove:
            return 0.00001
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
        default:
            throw new Error("Bad multiplier")
    }
}

export function featureMultiplier(physicsFeature: PhysicsFeature): PhysicsMultiplier {
    switch (physicsFeature) {
        case PhysicsFeature.GravityAbove:
            return PhysicsMultiplier.Millionths
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
