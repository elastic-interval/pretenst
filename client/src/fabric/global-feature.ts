/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { BehaviorSubject, Subject, Subscription } from "rxjs"

import { GlobalFeature, IntervalRole, roleToLengthFeature } from "./fabric-engine"
import { LifePhase } from "./life-phase"

enum FeatureMultiplier {
    OneThousand,
    One,
    Thousandths,
    NegativeThousandths,
    Millionths,
    NegativeMillionths,
}

type FeatureAdjustment = (factor: number, up: boolean) => number

interface IFeatureConfig {
    feature: GlobalFeature
    name: string
    defaultValue: number
    multiplier: FeatureMultiplier
    fixedDigits: number
    adjustment: FeatureAdjustment
    lifePhases: LifePhase[]
}

function multiplierValue(multiplier: FeatureMultiplier): number {
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

function multiplierSymbol(multiplier: FeatureMultiplier): string {
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

const byTenPercent: FeatureAdjustment = (factor: number, up: boolean) => factor * (up ? 1.1 : 1 / 1.1)
const byOnePercent: FeatureAdjustment = (factor: number, up: boolean) => factor * (up ? 1.01 : 1 / 1.01)
const plusFive: FeatureAdjustment = (factor: number, up: boolean) => factor + (up ? 5 : -5)

const GLOBAL_FEATURE: IFeatureConfig[] = [
    {
        feature: GlobalFeature.GravityAbove,
        name: "GravityAbove",
        defaultValue: 0.000005,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 3,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Pretenst, LifePhase.Pretensing],
    },
    {
        feature: GlobalFeature.DragAbove,
        name: "DragAbove",
        defaultValue: 0.0001,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Pretenst, LifePhase.Pretensing],
    },
    {
        feature: GlobalFeature.GravityBelow,
        name: "AntigravityBelow",
        defaultValue: -0.03,
        multiplier: FeatureMultiplier.NegativeMillionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Pretenst],
    },
    {
        feature: GlobalFeature.DragBelow,
        name: "DragBelow",
        defaultValue: 0.6,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Pretenst],
    },
    {
        feature: GlobalFeature.GravityBelowWater,
        name: "AntigravityBelowWater",
        defaultValue: -0.00001,
        multiplier: FeatureMultiplier.NegativeMillionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [],
    },
    {
        feature: GlobalFeature.DragBelowWater,
        name: "DragBelowWater",
        defaultValue: 0.001,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [],
    },
    {
        feature: GlobalFeature.PushOverPull,
        name: "PushOverPull",
        defaultValue: 1.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: GlobalFeature.SlackThreshold,
        name: "SlackThreshold",
        defaultValue: 0.01,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Shaping, LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: GlobalFeature.BarMass,
        name: "BarMass",
        defaultValue: 1,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: GlobalFeature.CableMass,
        name: "CableMass",
        defaultValue: 0.01,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: GlobalFeature.IntervalBusyTicks,
        name: "BusyCountdown",
        defaultValue: 300.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Growing, LifePhase.Shaping],
    },
    {
        feature: GlobalFeature.PretensingTicks,
        name: "PretensingCountdown",
        defaultValue: 50000.0,
        multiplier: FeatureMultiplier.OneThousand,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack],
    },
    {
        feature: GlobalFeature.PretensingIntensity,
        name: "PretensingIntensity",
        defaultValue: 5.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 2,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack],
    },
    {
        feature: GlobalFeature.TicksPerFrame,
        name: "TicksPerFrame",
        defaultValue: 50.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 0,
        adjustment: plusFive,
        lifePhases: [LifePhase.Growing, LifePhase.Shaping, LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: GlobalFeature.BarLength,
        name: "BarLength",
        defaultValue: 2 * 1.618,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: GlobalFeature.TriangleCableLength,
        name: "TriangleCableLength",
        defaultValue: 2.123,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: GlobalFeature.RingCableLength,
        name: "RingLength",
        defaultValue: 1.440,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: GlobalFeature.CrossCableLength,
        name: "CrossLength",
        defaultValue: 1.583,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: GlobalFeature.BowMidLength,
        name: "BowMidLength",
        defaultValue: 0.8521,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: GlobalFeature.BowEndLength,
        name: "BowEndLength",
        defaultValue: (1.380 + 1.571) / 2, // todo: was high and low
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
]

export function getFeatureValue(feature: GlobalFeature, defaultValue?: boolean): number {
    const globalFeature = GLOBAL_FEATURE[feature]
    if (defaultValue) {
        return globalFeature.defaultValue
    }
    const value = localStorage.getItem(globalFeature.name)
    return value ? parseFloat(value) : globalFeature.defaultValue
}

export function roleDefaultLength(intervalRole: IntervalRole): number {
    return getFeatureValue(roleToLengthFeature(intervalRole))
}

export class FloatFeature {
    private factor$: BehaviorSubject<number>

    constructor(public readonly config: IFeatureConfig) {
        this.factor$ = new BehaviorSubject<number>(getFeatureValue(config.feature, true))
        this.factor$.subscribe(newFactor => {
            const key = GlobalFeature[this.config.feature]
            if (newFactor / this.config.defaultValue - 1 < 0.0001) {
                localStorage.removeItem(key)
            } else {
                localStorage.setItem(key, newFactor.toFixed(18))
            }
        })
    }

    public get title(): string {
        return this.config.name
    }

    public get factor(): number {
        return this.factor$.getValue()
    }

    public get formatted(): string {
        const scaledValue = this.factor * multiplierValue(this.config.multiplier)
        return scaledValue.toFixed(this.config.fixedDigits)
    }

    public onChange(change: () => void): Subscription {
        return this.factor$.subscribe(() => change())
    }

    public get subject(): Subject<number> {
        return this.factor$
    }

    public get globalFeature(): GlobalFeature {
        return this.config.feature
    }

    public get multiplierValue(): number {
        return multiplierValue(this.config.multiplier)
    }

    public get multiplierSymbol(): string {
        return multiplierSymbol(this.config.multiplier)
    }

    public adjustValue(up: boolean): void {
        this.factor$.next(this.config.adjustment(this.factor$.getValue(), up))
    }

    public reset(): void {
        this.factor$.next(this.config.defaultValue)
    }

    public atDefault(): boolean {
        const defaultValue = this.config.defaultValue
        const difference = Math.abs(this.factor - defaultValue)
        return difference < 0.00001 * Math.abs(defaultValue)
    }

    public showDuring(lifePhase: LifePhase): boolean {
        return this.config.lifePhases.some(p => p === lifePhase)
    }
}

export function createFeatures(): FloatFeature[] {
    return GLOBAL_FEATURE.map(config => new FloatFeature(config))
}