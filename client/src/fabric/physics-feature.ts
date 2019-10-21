/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export enum PhysicsFeature {
    GravityAbove = 0,
    DragAbove = 1,
    AntigravityBelow = 2,
    DragBelow = 3,
    AntigravityBelowWater = 4,
    DragBelowWater = 5,
    PushElastic = 6,
    PullElastic = 7,
    BusyCountdown = 8,
    PretensingCountdown = 9,
    PretensingIntensity = 10,
}

export function notWater(feature?: PhysicsFeature): boolean {
    if (feature === undefined) {
        return false
    }
    return feature !== PhysicsFeature.AntigravityBelowWater && feature !== PhysicsFeature.DragBelowWater
}

export enum PhysicsMultiplier {
    OneThousand,
    One,
    Thousandths,
    NegativeThousandths,
    Millionths,
    NegativeMillionths,
    Billionths,
}

export function multiplierValue(multiplier: PhysicsMultiplier): number {
    switch (multiplier) {
        case PhysicsMultiplier.OneThousand:
            return 1/1000.0
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
        case PhysicsMultiplier.OneThousand:
            return "k"
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
            return PhysicsMultiplier.OneThousand
        case PhysicsFeature.PretensingIntensity:
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
            return 1
        case PhysicsFeature.PullElastic:
            return 1
        case PhysicsFeature.BusyCountdown:
            return 300.0
        case PhysicsFeature.PretensingCountdown:
            return 50000.0
        case PhysicsFeature.PretensingIntensity:
            return 5.0
        default:
            throw new Error("Bad physics feature")
    }
}

