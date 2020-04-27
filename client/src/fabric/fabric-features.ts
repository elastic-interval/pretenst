/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { FabricFeature } from "eig"
import { BehaviorSubject } from "rxjs"

import { IFeatureValue, IStoredState, transition } from "../storage/stored-state"

import { FABRIC_FEATURES } from "./eig-util"

export interface IFeatureConfig {
    feature: FabricFeature
    name: string
    percents: number[]
}

export function featureConfig(feature: FabricFeature): IFeatureConfig {
    switch (feature) {
        case FabricFeature.Gravity:
            return {
                feature,
                name: "Gravity",
                percents: [0, 10, 50, 100, 200, 500],
            }
        case FabricFeature.Drag:
            return {
                feature,
                name: "Drag",
                percents: [0, 10, 50, 100, 150, 200],
            }
        case FabricFeature.PretenstFactor:
            return {
                feature,
                name: "Pretenst factor",
                percents: [0, 50, 90, 100, 125, 150, 200],
            }
        case FabricFeature.IterationsPerFrame:
            return {
                feature,
                name: "Iterations per frame",
                percents: [10, 25, 50, 100, 200, 300, 500],
            }
        case FabricFeature.IntervalCountdown:
            return {
                feature,
                name: "Interval Countdown",
                percents: [10, 20, 30, 100, 150, 400, 1000],
            }
        case FabricFeature.RealizingCountdown:
            return {
                feature,
                name: "Slack to Pretenst countdown",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.SlackThreshold:
            return {
                feature,
                name: "Slack threshold",
                percents: [0.01, 0.1, 1, 10, 100, 1000],
            }
        case FabricFeature.ShapingPretenstFactor:
            return {
                feature,
                name: "Pretenst factor",
                percents: [0, 1, 2, 3, 5, 10, 20, 50, 100],
            }
        case FabricFeature.ShapingStiffnessFactor:
            return {
                feature,
                name: "Stiffness factor",
                percents: [100, 150, 200, 250, 300, 400, 500],
            }
        case FabricFeature.ShapingDrag:
            return {
                feature,
                name: "Drag",
                percents: [0, 10, 50, 100, 200, 500],
            }
        case FabricFeature.MaxStrain:
            return {
                feature,
                name: "Maximum Strain",
                percents: [1, 2, 3, 5, 8, 13, 21, 34, 55, 100],
            }
        case FabricFeature.VisualStrain:
            return {
                feature,
                name: "Visual Strain",
                percents: [0, 10, 50, 100, 200, 300, 500, 1000, 2000, 3000],
            }
        case FabricFeature.PushOverPull:
            return {
                feature,
                name: "Compression/Tension",
                percents: [10, 20, 30, 50, 100, 200, 300, 500, 1000],
            }
        case FabricFeature.NexusPushLength:
            return {
                feature,
                name: "Nexus Push",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.ColumnPushLength:
            return {
                feature,
                name: "Column Push",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.TriangleLength:
            return {
                feature,
                name: "Triangle",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.RingLength:
            return {
                feature,
                name: "Ring",
                percents: [10, 80, 90, 100, 110, 120, 130],
            }
        case FabricFeature.CrossLength:
            return {
                feature,
                name: "Cross",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.BowMidLength:
            return {
                feature,
                name: "Bow Mid",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.BowEndLength:
            return {
                feature,
                name: "Bow End",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.RibbonPushLength:
            return {
                feature,
                name: "Rib Push",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.RibbonShortLength:
            return {
                feature,
                name: "Rib Short",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.RibbonLongLength:
            return {
                feature,
                name: "Rib Long",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.RibbonHangerLength:
            return {
                feature,
                name: "Rib Hanger",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case FabricFeature.PushRadius:
            return {
                feature,
                name: "Push Radius",
                percents: [5, 25, 50, 100, 150, 200, 300],
            }
        case FabricFeature.PullRadius:
            return {
                feature,
                name: "Pull Radius",
                percents: [5, 25, 50, 100, 150, 200, 300],
            }
        case FabricFeature.JointRadius:
            return {
                feature,
                name: "Joint Radius",
                percents: [5, 25, 50, 100, 150, 200, 300],
            }
        case FabricFeature.MaxStiffness:
            return {
                feature,
                name: "Maximum Stiffness",
                percents: [5, 25, 50, 100, 150, 200, 500],
            }
        case FabricFeature.StiffnessFactor:
            return {
                feature,
                name: "Stiffness Factor",
                percents: [5, 25, 50, 100, 150, 200, 500],
            }
        case FabricFeature.Antigravity:
            return {
                feature,
                name: "Antigravity",
                percents: [5, 25, 50, 100, 150, 200, 500],
            }
        default:
            throw new Error("Feature?")
    }
}

export class FloatFeature {
    private value$: BehaviorSubject<IFeatureValue>

    constructor(public readonly config: IFeatureConfig, private defaultValue: number, storedState$: BehaviorSubject<IStoredState>) {
        const features = storedState$.getValue().featureValues
        const storedFeature = features[config.feature]
        const initialValue: IFeatureValue = storedFeature !== undefined ? storedFeature : {
            numeric: this.defaultValue,
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
        this.value$.next({numeric: this.defaultValue * percent / 100, percent})
    }

    public get observable(): BehaviorSubject<IFeatureValue> {
        return this.value$
    }

    public get fabricFeature(): FabricFeature {
        return this.config.feature
    }
}

export function createFloatFeatures(storedState$: BehaviorSubject<IStoredState>, defaultValue: (feature: FabricFeature) => number):
    Record<FabricFeature, FloatFeature> {
    const features = {} as Record<FabricFeature, FloatFeature>
    FABRIC_FEATURES.map(featureConfig).forEach(config => {
        features[config.feature] = new FloatFeature(config, defaultValue(config.feature), storedState$)
    })
    return features
}
