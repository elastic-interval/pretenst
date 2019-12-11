/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { BehaviorSubject } from "rxjs"

import { IFeatureValue, IStoredState, transition } from "../storage/stored-state"

import { FABRIC_FEATURES, FabricFeature } from "./fabric-engine"

export interface IFeatureConfig {
    feature: FabricFeature
    name: string
    defaultValue: number
    percents: number[]
}

const FEATURE_PERCENTS = [50, 75, 90, 100, 125, 150, 200]

export function featureConfig(feature: FabricFeature): IFeatureConfig {
    switch (feature) {
        case FabricFeature.Gravity:
            return {
                feature,
                name: "Gravity",
                defaultValue: 0.0000001,
                percents: [0, 10, 50, 100, 200, 500],
            }
        case FabricFeature.Drag:
            return {
                feature,
                name: "Drag",
                defaultValue: 0.0001,
                percents: [0, 10, 50, 100, 150, 200],
            }
        case FabricFeature.PretenstFactor:
            return {
                feature,
                name: "Pretenst factor",
                defaultValue: 0.03,
                percents: [0, 50, 90, 100, 125, 150, 200],
            }
        case FabricFeature.IterationsPerFrame:
            return {
                feature,
                name: "Iterations per frame",
                defaultValue: 100,
                percents: [10, 25, 50, 100, 200, 300, 500],
            }
        case FabricFeature.IntervalCountdown:
            return {
                feature,
                name: "Interval Countdown",
                defaultValue: 300,
                percents: [20, 50, 100, 200, 300, 1000],
            }
        case FabricFeature.PretenstCountdown:
            return {
                feature,
                name: "Slack to Pretenst countdown",
                defaultValue: 30000,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.FacePullEndZone:
            return {
                feature,
                name: "Face Pull End Zone",
                defaultValue: 4,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.FacePullOrientationForce:
            return {
                feature,
                name: "Face Pull Orientation Force",
                defaultValue: 0.0001,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.SlackThreshold:
            return {
                feature,
                name: "Slack threshold",
                defaultValue: 0.0001,
                percents: [0.01, 0.1, 1, 10, 100, 1000],
            }
        case FabricFeature.ShapingPretenstFactor:
            return {
                feature,
                name: "Pretenst factor",
                defaultValue: 0.1,
                percents: [0, 1, 2, 3, 5, 10, 20, 50, 100],
            }
        case FabricFeature.ShapingStiffnessFactor:
            return {
                feature,
                name: "Stiffness factor",
                defaultValue: 10,
                percents: [100, 150, 200, 250, 300, 400, 500],
            }
        case FabricFeature.ShapingDrag:
            return {
                feature,
                name: "Drag",
                defaultValue: 0.1,
                percents: [0, 10, 50, 100, 200, 500],
            }
        case FabricFeature.MaxStrain:
            return {
                feature,
                name: "Maximum Strain",
                defaultValue: 0.1,
                percents: [1, 2, 3, 5, 8, 13, 21, 34, 55, 100],
            }
        case FabricFeature.VisualStrain:
            return {
                feature,
                name: "Visual Strain",
                defaultValue: 1,
                percents: [0, 10, 50, 100, 200, 300, 500, 1000, 10000, 100000],
            }
        case FabricFeature.PushOverPull:
            return {
                feature,
                name: "Push Over Pull",
                defaultValue: 1,
                percents: [20, 50, 100, 200, 400],
            }
        case FabricFeature.NexusPushLength:
            return {
                feature,
                name: "Nexus Push",
                defaultValue: (1 + Math.sqrt(5)) / 2,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.ColumnPushLength:
            return {
                feature,
                name: "Column Push",
                defaultValue: Math.sqrt(2),
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.TriangleLength:
            return {
                feature,
                name: "Triangle",
                defaultValue: 1,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.RingLength:
            return {
                feature,
                name: "Ring",
                defaultValue: Math.sqrt(2 - 2 * Math.sqrt(2 / 3)),
                percents: [10, 80, 90, 100, 110, 120, 130],
            }
        case FabricFeature.NexusCrossLength:
            return {
                feature,
                name: "Nexus Cross",
                defaultValue: 1, // TODO
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.ColumnCrossLength:
            return {
                feature,
                name: "Column Cross",
                defaultValue: 1,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.BowMidLength:
            return {
                feature,
                name: "Bow Mid",
                defaultValue: 0.4,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.BowEndLength:
            return {
                feature,
                name: "Bow End",
                defaultValue: 0.6,
                percents: FEATURE_PERCENTS,
            }
        case FabricFeature.PushRadiusFactor:
            return {
                feature,
                name: "Push Radius",
                defaultValue: 4,
                percents: [5, 25, 50, 100, 150, 200, 300],
            }
        case FabricFeature.PullRadiusFactor:
            return {
                feature,
                name: "Pull Radius",
                defaultValue: 2,
                percents: [5, 25, 50, 100, 150, 200, 300],
            }
        case FabricFeature.MaxStiffness:
            return {
                feature,
                name: "Maximum Stiffness",
                defaultValue: 0.0005,
                percents: [5, 25, 50, 100, 150, 200, 500],
            }
    }
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
            const featureValues = {...storedState.featureValues} as Record<FabricFeature, IFeatureValue>
            featureValues[config.feature] = value
            storedState$.next(transition(storedState, {featureValues}))
        })
    }

    public get value(): IFeatureValue {
        return this.value$.getValue()
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

    public get formatted(): string {
        const numeric = this.numeric
        const expo = numeric.toExponential(5)
        const zero = expo.indexOf("e+0")
        if (zero > 0) {
            return expo.substring(0, zero)
        }
        const minus = Math.max(expo.indexOf("e-1"), expo.indexOf("e-2"))
        if (minus > 0) {
            return numeric.toFixed(5)
        }
        const plus = Math.max(expo.indexOf("e+1"), expo.indexOf("e+2"))
        if (plus > 0) {
            return numeric.toFixed(1)
        }
        return expo
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
}

export function createFloatFeatures(storedState$: BehaviorSubject<IStoredState>): Record<FabricFeature, FloatFeature> {
    const features = {} as Record<FabricFeature, FloatFeature>
    FABRIC_FEATURES.map(featureConfig).forEach(config => features[config.feature] = new FloatFeature(config, storedState$))
    return features
}
