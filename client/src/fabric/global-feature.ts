
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { GlobalFeature } from "./fabric-engine"

export enum FeatureMultiplier {
    OneThousand,
    One,
    Thousandths,
    NegativeThousandths,
    Millionths,
    NegativeMillionths,
}

interface IGlobalFeature {
    feature: GlobalFeature
    name: string
    defaultValue: number
    multiplier: FeatureMultiplier
    fixedDigits: number
}

export function multiplierValue(multiplier: FeatureMultiplier): number {
    switch (multiplier) {
        case FeatureMultiplier.OneThousand:
            return 1 / 1000.0
        case FeatureMultiplier.One:
            return 1
        case FeatureMultiplier.Thousandths:
            return 1000
        case FeatureMultiplier.NegativeThousandths:
            return -1000
        case FeatureMultiplier.Millionths:
            return 1000000
        case FeatureMultiplier.NegativeMillionths:
            return -1000000
        default:
            throw new Error("Bad multiplier")
    }
}

export function multiplierSymbol(multiplier: FeatureMultiplier): string {
    switch (multiplier) {
        case FeatureMultiplier.OneThousand:
            return "k"
        case FeatureMultiplier.One:
            return ""
        case FeatureMultiplier.NegativeThousandths:
        case FeatureMultiplier.Thousandths:
            return "m"
        case FeatureMultiplier.Millionths:
        case FeatureMultiplier.NegativeMillionths:
            return "\u03BC"
        default:
            throw new Error("Bad multiplier")
    }
}

export function globalFeatureValue(feature: GlobalFeature, defaultValue?: boolean): number {
    const globalFeature = GLOBAL_FEATURE[feature]
    if (defaultValue) {
        return globalFeature.defaultValue
    }
    const value = localStorage.getItem(globalFeature.name)
    return value ? parseFloat(value) : globalFeature.defaultValue
}

export const GLOBAL_FEATURE: IGlobalFeature[] = [
    {
        feature: GlobalFeature.GravityAbove,
        name: "GravityAbove",
        defaultValue: 0.000005,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 3,
    },
    {
        feature: GlobalFeature.DragAbove,
        name: "DragAbove",
        defaultValue: 0.0001,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.GravityBelow,
        name: "AntigravityBelow",
        defaultValue: -0.03,
        multiplier: FeatureMultiplier.NegativeMillionths,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.DragBelow,
        name: "DragBelow",
        defaultValue: 0.6,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.GravityBelowWater,
        name: "AntigravityBelowWater",
        defaultValue: -0.00001,
        multiplier: FeatureMultiplier.NegativeMillionths,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.DragBelowWater,
        name: "DragBelowWater",
        defaultValue: 0.001,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.PushOverPull,
        name: "PushOverPull",
        defaultValue: 1.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
    },
    {
        feature: GlobalFeature.IntervalBusyTicks,
        name: "BusyCountdown",
        defaultValue: 300.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.PretensingTicks,
        name: "PretensingCountdown",
        defaultValue: 50000.0,
        multiplier: FeatureMultiplier.OneThousand,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.PretensingIntensity,
        name: "PretensingIntensity",
        defaultValue: 5.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 2,
    },
    {
        feature: GlobalFeature.TicksPerFrame,
        name: "TicksPerFrame",
        defaultValue: 50.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 0,
    },
    {
        feature: GlobalFeature.SlackThreshold,
        name: "SlackThreshold",
        defaultValue: 0.01,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.BarMass,
        name: "BarMass",
        defaultValue: 1,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
    },
    {
        feature: GlobalFeature.CableMass,
        name: "CableMass",
        defaultValue: 0.01,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
    },
]
