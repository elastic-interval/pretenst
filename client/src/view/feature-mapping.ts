/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default_world_feature, WorldFeature } from "eig"

export enum FeatureStage {
    Preslack,
    Postslack,
    All,
}

export interface IFeatureMapping {
    feature: WorldFeature
    name: string
    featureStage: FeatureStage
    nuanceToPercent: (nuance: number) => number
    percentToNuance: (percent: number) => number
    percentToValue: (percent: number) => number
    valueToPercent: (value: number) => number
}

function linearMapping(feature: WorldFeature, name: string, featureStage: FeatureStage, low: number, high: number): IFeatureMapping {
    const nuanceToPercent = (nuance: number) => (low * (1 - nuance) + high * nuance)
    const percentToNuance = (percent: number) => (percent - low) / (high - low)
    const percentToValue = (percent: number) => default_world_feature(feature) * percent / 100
    const valueToPercent = (value: number) => value / default_world_feature(feature) * 100
    return {feature, name, featureStage, nuanceToPercent, percentToNuance, percentToValue, valueToPercent}
}

export function featureMapping(feature: WorldFeature): IFeatureMapping {
    switch (feature) {
        case WorldFeature.Gravity:
            // percents: [0, 10, 25, 50, 100, 200, 500, 1000],
            return linearMapping(feature, "Gravity", FeatureStage.All, 0, 1000)
        case WorldFeature.Antigravity:
            // percents: [5, 25, 50, 100, 150, 200, 500],
            return linearMapping(feature, "-Antigravity", FeatureStage.All, 5, 500)
        case WorldFeature.ShapingDrag:
            // percents: [0, 10, 50, 100, 200, 500],
            return linearMapping(feature, "Shaping Drag", FeatureStage.Preslack, 0, 500)
        case WorldFeature.ShapingStiffnessFactor:
            // percents: [10, 50, 100, 200, 300, 500, 1000],
            return linearMapping(feature, "Shaping Stiffness", FeatureStage.Preslack, 10, 1000)
        case WorldFeature.Drag:
            // percents: [0, 10, 50, 100, 150, 200, 500, 1000],
            return linearMapping(feature, "Drag", FeatureStage.Postslack, 0, 1000)
        case WorldFeature.ShapingPretenstFactor:
            // percents: [0, 5,  25, 50, 100, 200, 500, 1000],
            return linearMapping(feature, "Shaping Pretenst", FeatureStage.Preslack, 0, 1000)
        case WorldFeature.PretenstFactor:
            // percents: [0, 50, 90, 100, 125, 150, 200, 300, 500],
            return linearMapping(feature, "Pretenst Factor", FeatureStage.Postslack, 0, 500)
        case WorldFeature.StiffnessFactor:
            // percents: [1, 10, 50, 100, 150, 200, 300],
            return linearMapping(feature, "Stiffness", FeatureStage.Postslack, 1, 300)
        case WorldFeature.IterationsPerFrame:
            // percents: [2, 10, 25, 50, 100, 200, 300, 500],
            return linearMapping(feature, "Iterations/frame", FeatureStage.All, 2, 500)
        case WorldFeature.IntervalCountdown:
            // percents: [10, 20, 30, 100, 150, 400, 1000],
            return linearMapping(feature, "-Interval Countdown", FeatureStage.Preslack, 10, 1000)
        case WorldFeature.PretensingCountdown:
            // percents: [50, 75, 90, 100, 125, 150, 200],
            return linearMapping(feature, "-Pretenst countdown", FeatureStage.All, 50, 200)
        case WorldFeature.VisualStrain:
            // percents: [0, 10, 50, 100, 200, 300, 500, 1000],
            return linearMapping(feature, "Visual strain", FeatureStage.All, 0, 300)
        case WorldFeature.PushOverPull:
            // percents: [10, 25, 50, 100, 200, 300, 400, 500, 600, 700],
            return linearMapping(feature, "Push/Pull", FeatureStage.All, 10, 700)
        default:
            throw new Error("Feature?")
    }
}
