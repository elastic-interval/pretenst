/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { BehaviorSubject } from "rxjs"

import { FabricFeature, IntervalRole, roleToLengthFeature } from "./fabric-engine"

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
            throw new Error("Bad multiplier")
    }
}

const FEATURE_PERCENTS = [
    50, 75, 90, 100, 125, 150, 200,
]

const FEATURE_CONFIGS: IFeatureConfig[] = [
    {
        feature: FabricFeature.Gravity,
        name: "Gravity",
        defaultValue: 0.0000005,
        multiplier: FeatureMultiplier.Billionths,
        fixedDigits: 1,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.Drag,
        name: "Drag",
        defaultValue: 0.0001,
        multiplier: FeatureMultiplier.Billionths,
        fixedDigits: 1,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PretenseFactor,
        name: "Pretense Factor",
        defaultValue: 0.01,
        multiplier: FeatureMultiplier.Hundredths,
        fixedDigits: 2,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PushStrainFactor,
        name: "Push Strain Factor",
        defaultValue: 1,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.PushPullDifferential,
        name: "Push/Pull Differential",
        defaultValue: 1,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
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
        defaultValue: 50,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 1,
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
        defaultValue: 2 * 1.618,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.TriangleLength,
        name: "Triangle",
        defaultValue: 2.123,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.RingLength,
        name: "Ring",
        defaultValue: 1.440,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.CrossLength,
        name: "Cross",
        defaultValue: 2.123,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.BowMidLength,
        name: "BowMid",
        defaultValue: 0.8521,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
    {
        feature: FabricFeature.BowEndLength,
        name: "BowEnd",
        defaultValue: 1.2,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        percents: FEATURE_PERCENTS,
    },
]

function featureKey(fabricFeature: FabricFeature): string {
    return `${FabricFeature[fabricFeature]}Value`
}

interface IFeatureValue {
    numeric: number
    percent: number,
}

export function fabricFeatureValue(fabricFeature: FabricFeature): IFeatureValue {
    const config = FEATURE_CONFIGS[fabricFeature]
    const value = localStorage.getItem(featureKey(fabricFeature))
    return value ? JSON.parse(value) as IFeatureValue : {numeric: config.defaultValue, percent: 100}
}

export function roleDefaultLength(intervalRole: IntervalRole): number {
    return fabricFeatureValue(roleToLengthFeature(intervalRole)).numeric
}

export class FloatFeature {
    private factor$: BehaviorSubject<IFeatureValue>

    constructor(public readonly config: IFeatureConfig) {
        const initialValue = fabricFeatureValue(config.feature)
        this.factor$ = new BehaviorSubject<IFeatureValue>(initialValue)
        this.factor$.subscribe(newFactor => {
            const key = featureKey(config.feature)
            if (this.isAtDefault) {
                localStorage.removeItem(key)
            } else {
                localStorage.setItem(key, JSON.stringify(newFactor))
            }
        })
    }

    public get title(): string {
        return this.config.name
    }

    public get percentChoices(): number[] {
        return this.config.percents
    }

    public get numeric(): number {
        return this.factor$.getValue().numeric
    }

    public set numeric(numeric: number) {
        console.warn("set numeric")
        this.factor$.next({numeric, percent: -666})
    }

    public get percent(): number {
        return this.factor$.getValue().percent
    }

    public set percent(percent: number) {
        this.factor$.next({numeric: this.config.defaultValue * percent / 100, percent})
    }

    public get observable(): BehaviorSubject<IFeatureValue> {
        return this.factor$
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
    return scaledValue.toFixed(config.fixedDigits)
}

export function createFabricFeatures(): FloatFeature[] {
    return FEATURE_CONFIGS.map(config => new FloatFeature(config))
}
