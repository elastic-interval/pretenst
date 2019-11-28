/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { BehaviorSubject } from "rxjs"

import { IStoredState } from "../storage/stored-state"

import { FabricFeature } from "./fabric-engine"

export enum FeatureMultiplier {
    OneThousand,
    One,
    Hundredths,
    Thousandths,
    Millionths,
    Billionths,
}

interface IFeatureConfig {
    feature: FabricFeature
    name: string
    defaultValue: number
    multiplier: FeatureMultiplier
    fixedDigits: number
    percents: number[]
}

function multiplierValue(multiplier: FeatureMultiplier): number {
    switch (multiplier) {
        case FeatureMultiplier.OneThousand:
            return 1 / 1000.0
        case FeatureMultiplier.One:
            return 1
        case FeatureMultiplier.Hundredths:
            return 100
        case FeatureMultiplier.Thousandths:
            return 1000
        case FeatureMultiplier.Millionths:
            return 1000000
        case FeatureMultiplier.Billionths:
            return 1000000000
        default:
            throw new Error("Bad multiplier:" + multiplier)
    }
}

function multiplierSymbol(multiplier: FeatureMultiplier): string {
    switch (multiplier) {
        case FeatureMultiplier.OneThousand:
            return "k"
        case FeatureMultiplier.One:
            return ""
        case FeatureMultiplier.Hundredths:
            return "%"
        case FeatureMultiplier.Thousandths:
            return "m"
        case FeatureMultiplier.Millionths:
            return "\u03BC"
        case FeatureMultiplier.Billionths:
            return "\u03BC"
        default:
            throw new Error("Bad multiplier")
    }
}

const FEATURE_PERCENTS = [
    50, 75, 90, 100, 125, 150, 200,
]

export const FEATURE_CONFIGS: IFeatureConfig[] = [
    {
        feature: FabricFeature.Gravity,
        name: "Gravity",
        defaultValue: 0.00000005,
        multiplier: FeatureMultiplier.Billionths,
        fixedDigits: 1,
        percents: [0, 10, 50, 100, 150, 200],
    },
    {
        feature: FabricFeature.Drag,
        name: "Drag",
        defaultValue: 0.0001,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PretenseFactor,
        name: "Pretense",
        defaultValue: 0.03,
        multiplier: FeatureMultiplier.Hundredths,
        fixedDigits: 2,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PushStrainFactor,
        name: "Push Over Pull",
        defaultValue: 1,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: [20, 50, 100, 200, 400],
    },
    {
        feature: FabricFeature.TicksPerFrame,
        name: "Ticks per Frame",
        defaultValue: 100.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 0,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.IntervalBusyTicks,
        name: "Busy Countdown",
        defaultValue: 500.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 1,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PretenseTicks,
        name: "Pretensing Countdown",
        defaultValue: 30000,
        multiplier: FeatureMultiplier.OneThousand,
        fixedDigits: 1,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PretenseIntensity,
        name: "Pretensing Intensity",
        defaultValue: 1,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 2,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.SlackThreshold,
        name: "Slack Threshold",
        defaultValue: 0.0001,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.RadiusFactor,
        name: "Radius Factor",
        defaultValue: 5,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 2,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.MaxStiffness,
        name: "Max Stiffness",
        defaultValue: 0.0005,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 0,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PushLength,
        name: "Push",
        defaultValue: Math.sqrt(2),
        multiplier: FeatureMultiplier.One,
        fixedDigits: 6,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.TriangleLength,
        name: "Triangle",
        defaultValue: 1,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 6,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.RingLength,
        name: "Ring",
        defaultValue: Math.sqrt(2 - 2 * Math.sqrt(2 / 3)),
        multiplier: FeatureMultiplier.One,
        fixedDigits: 6,
        percents: [10, 80, 90, 100, 110, 120, 130],
    },
    {
        feature: FabricFeature.CrossLength,
        name: "Cross",
        defaultValue: 1,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.BowMidLength,
        name: "BowMid",
        defaultValue: 0.4,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 6,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.BowEndLength,
        name: "BowEnd",
        defaultValue: 0.6,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 6,
        percents: FEATURE_PERCENTS,
    },
]

interface IFeatureValue {
    numeric: number
    percent: number,
}

export class FloatFeature {
    private value$: BehaviorSubject<IFeatureValue>

    constructor(public readonly config: IFeatureConfig, storedState$: BehaviorSubject<IStoredState>) {
        const features = storedState$.getValue().featureValues
        const initialValue = features[config.feature]
        this.value$ = new BehaviorSubject<IFeatureValue>(initialValue)
        this.value$.subscribe(value => {
            const storedState = storedState$.getValue()
            storedState.featureValues[config.feature] = value
            storedState$.next(storedState)
        })
    }

    public get title(): string {
        return this.config.name
    }

    public get percentChoices(): number[] {
        return this.config.percents
    }

    public get numeric(): number {
        return this.value$.getValue().numeric
    }

    public get percent(): number {
        return this.value$.getValue().percent
    }

    public set percent(percent: number) {
        this.value$.next({numeric: this.config.defaultValue * percent / 100, percent})
    }

    public get observable(): BehaviorSubject<IFeatureValue> {
        return this.value$
    }

    public get fabricFeature(): FabricFeature {
        return this.config.feature
    }

    public get isAtDefault(): boolean {
        const defaultValue = this.config.defaultValue
        const overDefault = Math.abs(this.numeric / defaultValue)
        const difference = Math.abs(overDefault - 1)
        return difference < 0.00001
    }
}

export function formatFeatureValue(config: IFeatureConfig, numeric: number): string {
    const scaledValue = numeric * multiplierValue(config.multiplier)
    const symbol = multiplierSymbol(config.multiplier)
    return `${scaledValue.toFixed(config.fixedDigits)}${symbol}`
}

export function createFloatFeatures(storedState$: BehaviorSubject<IStoredState>): FloatFeature[] {
    return FEATURE_CONFIGS.map(config => new FloatFeature(config, storedState$))
}
