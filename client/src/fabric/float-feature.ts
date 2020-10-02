/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 * something extra so it can compile
 */

import { WorldFeature } from "eig"
import { BehaviorSubject } from "rxjs"

import { IFeatureValue, IStoredState, transition } from "../storage/stored-state"

import { FABRIC_FEATURES, floatString } from "./eig-util"

export interface IFeatureConfig {
    feature: WorldFeature
    name: string
    percents: number[]
}

export function featureConfig(feature: WorldFeature): IFeatureConfig {
    switch (feature) {
        case WorldFeature.Gravity:
            return {
                feature,
                name: "Gravity",
                percents: [0, 10, 25, 50, 100, 200, 500, 1000],
            }
        case WorldFeature.Antigravity:
            return {
                feature,
                name: "Antigravity",
                percents: [5, 25, 50, 100, 150, 200, 500],
            }
        case WorldFeature.ShapingDrag:
            return {
                feature,
                name: "Shaping Drag",
                percents: [0, 10, 50, 100, 200, 500],
            }
        case WorldFeature.ShapingStiffnessFactor:
            return {
                feature,
                name: "Shaping Stiffness",
                percents: [10, 50, 100, 200, 300, 500, 1000],
            }
        case WorldFeature.Drag:
            return {
                feature,
                name: "Drag",
                percents: [0, 10, 50, 100, 150, 200, 500, 1000],
            }
        case WorldFeature.ShapingPretenstFactor:
            return {
                feature,
                name: "Shaping Pretenst factor",
                percents: [0, 1, 2, 3, 5, 10, 20, 50, 100],
            }
        case WorldFeature.PretenstFactor:
            return {
                feature,
                name: "Pretenst",
                percents: [0, 50, 90, 100, 125, 150, 200, 300, 500],
            }
        case WorldFeature.StiffnessFactor:
            return {
                feature,
                name: "Stiffness",
                percents: [10, 50, 90, 100, 125, 150, 250, 500, 1000],
            }
        case WorldFeature.IterationsPerFrame:
            return {
                feature,
                name: "Iterations per frame",
                percents: [2, 10, 25, 50, 100, 200, 300, 500],
            }
        case WorldFeature.IntervalCountdown:
            return {
                feature,
                name: "Interval Countdown",
                percents: [10, 20, 30, 100, 150, 400, 1000, 10000],
            }
        case WorldFeature.PretensingCountdown:
            return {
                feature,
                name: "Slack to Pretenst countdown",
                percents: [50, 75, 90, 100, 125, 150, 200],
            }
        case WorldFeature.VisualStrain:
            return {
                feature,
                name: "Visual Strain",
                percents: [0, 10, 50, 100, 200, 300, 500, 1000, 2000, 3000],
            }
        case WorldFeature.PushOverPull:
            return {
                feature,
                name: "Compression/Tension",
                percents: [10, 25, 50, 100, 200, 300, 400, 500, 600, 700],
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
            const featureValues = {...storedState.featureValues} as Record<WorldFeature, IFeatureValue>
            featureValues[config.feature] = value
            transition(storedState$, {featureValues})
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
        return floatString(this.numeric)
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

    public get worldFeature(): WorldFeature {
        return this.config.feature
    }
}

export function createFloatFeatures(storedState$: BehaviorSubject<IStoredState>, defaultValue: (feature: WorldFeature) => number):
    Record<WorldFeature, FloatFeature> {
    const features = {} as Record<WorldFeature, FloatFeature>
    FABRIC_FEATURES.map(featureConfig).forEach(config => {
        features[config.feature] = new FloatFeature(config, defaultValue(config.feature), storedState$)
    })
    return features
}
