/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { BehaviorSubject } from "rxjs"

import { IStoredState } from "../storage/stored-state"

import { FABRIC_FEATURES, FabricFeature } from "./fabric-engine"

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

function featureConfig(feature: FabricFeature): IFeatureConfig {
    switch (feature) {
        case FabricFeature.Gravity:
            return {
                feature,
                name: "Gravity",
                defaultValue: 0.0000001,
                multiplier: FeatureMultiplier.Billionths,
                fixedDigits: 1,
                percents: [0, 10, 50, 100, 200, 500],
            }
        case FabricFeature.Drag:
            return {
                feature,
                name: "Drag",
                defaultValue: 0.0001,
                multiplier: FeatureMultiplier.Millionths,
                fixedDigits: 1,
                percents: [0, 10, 50, 100, 150, 200],
            }
        case FabricFeature.PretenseFactor:
            return {
                feature,
                name: "Pretense",
                defaultValue: 0.03,
                multiplier: FeatureMultiplier.Hundredths,
                fixedDigits: 2,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.IterationsPerFrame:
            return {
                feature,
                name: "Iterations per frame",
                defaultValue: 100,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 0,
                percents: [10, 25, 50, 100, 200, 300, 500],
            }
        case FabricFeature.IntervalCountdown:
            return {
                feature,
                name: "Interval Countdown",
                defaultValue: 300,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 0,
                percents: [20, 50, 100, 200, 300, 1000],
            }
        case FabricFeature.PretenseCountdown:
            return {
                feature,
                name: "Pretense Countdown",
                defaultValue: 30000,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 0,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.FacePullEndZone:
            return {
                feature,
                name: "Face Pull End Zone",
                defaultValue: 4,
                multiplier: FeatureMultiplier.Hundredths,
                fixedDigits: 2,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.FacePullOrientationForce:
            return {
                feature,
                name: "Face Pull Orientation Force",
                defaultValue: 0.0001,
                multiplier: FeatureMultiplier.Millionths,
                fixedDigits: 0,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.PushStrainFactor:
            return {
                feature,
                name: "Push Over Pull",
                defaultValue: 1,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 3,
                percents: [20, 50, 100, 200, 400],
            }
        case FabricFeature.NexusPushLength:
            return {
                feature,
                name: "Nexus Push",
                defaultValue: Math.sqrt(2),
                // defaultValue: (1 + Math.sqrt(5)) / 2,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 6,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.ColumnPushLength:
            return {
                feature,
                name: "Column Push",
                defaultValue: Math.sqrt(2),
                multiplier: FeatureMultiplier.One,
                fixedDigits: 6,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.TriangleLength:
            return {
                feature,
                name: "Triangle",
                defaultValue: 1,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 6,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.RingLength:
            return {
                feature,
                name: "Ring",
                defaultValue: Math.sqrt(2 - 2 * Math.sqrt(2 / 3)),
                multiplier: FeatureMultiplier.One,
                fixedDigits: 6,
                percents: [10, 80, 90, 100, 110, 120, 130],
            }
        case FabricFeature.CrossLength:
            return {
                feature,
                name: "Cross",
                defaultValue: 1,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 6,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.BowMidLength:
            return {
                feature,
                name: "Bow Mid",
                defaultValue: 0.4,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 6,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.BowEndLength:
            return {
                feature,
                name: "Bow End",
                defaultValue: 0.6,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 6,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.PushRadiusFactor:
            return {
                feature,
                name: "Push Radius",
                defaultValue: 5,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 2,
                percents: [5, 25, 50, 100, 150, 200, 300],
            }
        case FabricFeature.PullRadiusFactor:
            return {
                feature,
                name: "Pull Radius",
                defaultValue: 2,
                multiplier: FeatureMultiplier.One,
                fixedDigits: 2,
                percents: [5, 25, 50, 100, 150, 200, 300],
            }
        case FabricFeature.MaxStiffness:
            return {
                feature,
                name: "Maximum Stiffness",
                defaultValue: 0.0005,
                multiplier: FeatureMultiplier.Millionths,
                fixedDigits: 0,
                percents: [5, 25, 50, 100, 150, 200, 500],
            }
    }
}

interface IFeatureValue {
    numeric: number
    percent: number,
}

export function defaultFeatureValues(): Record<FabricFeature, IFeatureValue> {
    return FABRIC_FEATURES
        .map(featureConfig)
        .reduce((record, config) => {
            record[config.feature] = ({percent: 100, numeric: config.defaultValue})
            return record
        }, {} as Record<FabricFeature, IFeatureValue>)
}

export class FloatFeature {
    private value$: BehaviorSubject<IFeatureValue>

    constructor(public readonly config: IFeatureConfig, storedState$: BehaviorSubject<IStoredState>) {
        const features = storedState$.getValue().featureValues
        const fromConfig = features[config.feature]
        const initialValue: IFeatureValue = fromConfig !== undefined ? fromConfig : {
            numeric: config.defaultValue,
            percent: 100,
        }
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

export function createFloatFeatures(storedState$: BehaviorSubject<IStoredState>): Record<FabricFeature, FloatFeature> {
    const features = {} as Record<FabricFeature, FloatFeature>
    FABRIC_FEATURES.map(featureConfig).forEach(config => features[config.feature] = new FloatFeature(config, storedState$))
    return features
}
