/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { BehaviorSubject, Subject, Subscription } from "rxjs"

import { FabricFeature, IntervalRole, roleToLengthFeature } from "./fabric-engine"
import { LifePhase } from "./life-phase"

export enum FeatureMultiplier {
    OneThousand,
    One,
    Thousandths,
    NegativeThousandths,
    Millionths,
    NegativeMillionths,
    Billionths,
    NegativeBillionths,
}

type FeatureAdjustment = (factor: number, up: boolean) => number

interface IFeatureConfig {
    feature: FabricFeature
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
        case FeatureMultiplier.Billionths:
            return 1000000000
        case FeatureMultiplier.NegativeBillionths:
            return -1000000000
        default:
            throw new Error("Bad multiplier")
    }
}

const byTenPercent: FeatureAdjustment = (factor: number, up: boolean) => factor * (up ? 1.1 : 1 / 1.1)
const byOnePercent: FeatureAdjustment = (factor: number, up: boolean) => factor * (up ? 1.01 : 1 / 1.01)
const plusOne: FeatureAdjustment = (factor: number, up: boolean) => up || factor > 1 ? factor + (up ? 1 : -1) : 1

const FEATURE_CONFIGS: IFeatureConfig[] = [
    {
        feature: FabricFeature.Gravity,
        name: "Gravity",
        defaultValue: 0.0000005,
        multiplier: FeatureMultiplier.Billionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Pretenst, LifePhase.Pretensing],
    },
    {
        feature: FabricFeature.Drag,
        name: "Drag",
        defaultValue: 0.0001,
        multiplier: FeatureMultiplier.Billionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Pretenst, LifePhase.Pretensing],
    },
    {
        feature: FabricFeature.PushOverPull,
        name: "PushOverPull",
        defaultValue: 4.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: FabricFeature.SlackThreshold,
        name: "SlackThreshold",
        defaultValue: 0.008,
        multiplier: FeatureMultiplier.Millionths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Shaping, LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: FabricFeature.BarMass,
        name: "BarMass",
        defaultValue: 10,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: FabricFeature.CableMass,
        name: "CableMass",
        defaultValue: 1,
        multiplier: FeatureMultiplier.Thousandths,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: FabricFeature.IntervalBusyTicks,
        name: "BusyCountdown",
        defaultValue: 500.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Growing, LifePhase.Shaping],
    },
    {
        feature: FabricFeature.PretensingTicks,
        name: "PretensingCountdown",
        defaultValue: 200000.0,
        multiplier: FeatureMultiplier.OneThousand,
        fixedDigits: 1,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack],
    },
    {
        feature: FabricFeature.PretensingIntensity,
        name: "PretensingIntensity",
        defaultValue: 1.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 2,
        adjustment: byTenPercent,
        lifePhases: [LifePhase.Slack],
    },
    {
        feature: FabricFeature.TicksPerFrame,
        name: "TicksPerFrame",
        defaultValue: 250.0,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 0,
        adjustment: plusOne,
        lifePhases: [LifePhase.Growing, LifePhase.Shaping, LifePhase.Slack, LifePhase.Pretensing, LifePhase.Pretenst],
    },
    {
        feature: FabricFeature.BarLength,
        name: "BarLength",
        defaultValue: 2 * 1.618,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: FabricFeature.TriangleLength,
        name: "TriangleCableLength",
        defaultValue: 2.123,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: FabricFeature.RingLength,
        name: "RingLength",
        defaultValue: 1.440,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: FabricFeature.CrossLength,
        name: "CrossLength",
        defaultValue: 1.583,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: FabricFeature.BowMidLength,
        name: "BowMidLength",
        defaultValue: 0.8521,
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
    {
        feature: FabricFeature.BowEndLength,
        name: "BowEndLength",
        defaultValue: (1.380 + 1.571) / 2, // todo: was high and low
        multiplier: FeatureMultiplier.One,
        fixedDigits: 3,
        adjustment: byOnePercent,
        lifePhases: [LifePhase.Shaping],
    },
]

export function fabricFeatureValue(fabricFeature: FabricFeature, defaultValue?: boolean): number {
    const config = FEATURE_CONFIGS[fabricFeature]
    if (defaultValue) {
        return config.defaultValue
    }
    const key = FabricFeature[fabricFeature]
    const value = localStorage.getItem(key)
    return value ? parseFloat(value) : config.defaultValue
}

export function roleDefaultLength(intervalRole: IntervalRole): number {
    return fabricFeatureValue(roleToLengthFeature(intervalRole))
}

export class FloatFeature {
    private factor$: BehaviorSubject<number>

    constructor(public readonly config: IFeatureConfig) {
        this.factor$ = new BehaviorSubject<number>(fabricFeatureValue(config.feature))
        this.factor$.subscribe(newFactor => {
            const key = FabricFeature[this.config.feature]
            if (this.isAtDefault) {
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

    public get fabricFeature(): FabricFeature {
        return this.config.feature
    }

    public get multiplierValue(): number {
        return multiplierValue(this.config.multiplier)
    }

    public adjustValue(up: boolean): void {
        this.factor$.next(this.config.adjustment(this.factor$.getValue(), up))
    }

    public reset(): void {
        this.factor$.next(this.config.defaultValue)
    }

    public get isAtDefault(): boolean {
        const defaultValue = this.config.defaultValue
        const overDefault = Math.abs(this.factor / defaultValue)
        const difference = Math.abs(overDefault - 1)
        return difference < 0.00001
    }

    public showDuring(lifePhase: LifePhase): boolean {
        return this.config.lifePhases.some(p => p === lifePhase)
    }
}

export function createFabricFeatures(): FloatFeature[] {
    return FEATURE_CONFIGS.map(config => new FloatFeature(config))
}
