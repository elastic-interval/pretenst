/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"

export interface IFeatureMapping {
    name: string
    feature: WorldFeature
    nuanceToPercent: (nuance: number) => number
    percentToNuance: (value: number) => number
}

function linearMapping(feature: WorldFeature, name: string, low: number, high: number): IFeatureMapping {
    const nuanceToPercent = (nuance: number) => low * (1 - nuance) + high * nuance
    const percentToNuance = (value: number) => (value - low) / (high - low)
    return {feature, name, nuanceToPercent, percentToNuance}
}

export function featureMapping(feature: WorldFeature): IFeatureMapping {
    switch (feature) {
        case WorldFeature.Gravity:
            // percents: [0, 10, 25, 50, 100, 200, 500, 1000],
            return linearMapping(feature, "Gravity", 0, 10)
        case WorldFeature.Antigravity:
            // percents: [5, 25, 50, 100, 150, 200, 500],
            return linearMapping(feature, "Antigravity", 0.05, 5)
        case WorldFeature.ShapingDrag:
            // percents: [0, 10, 50, 100, 200, 500],
            return linearMapping(feature, "Shaping Drag", 0, 5)
        case WorldFeature.ShapingStiffnessFactor:
            // percents: [10, 50, 100, 200, 300, 500, 1000],
            return linearMapping(feature, "Shaping Stiffness", 0.1, 10)
        case WorldFeature.Drag:
            // percents: [0, 10, 50, 100, 150, 200, 500, 1000],
            return linearMapping(feature, "Drag", 0, 10)
        case WorldFeature.ShapingPretenstFactor:
            // percents: [0, 5,  25, 50, 100, 200, 500, 1000],
            return linearMapping(feature, "Shaping Pretenst", 0, 10)
        case WorldFeature.PretenstFactor:
            // percents: [0, 50, 90, 100, 125, 150, 200, 300, 500],
            return linearMapping(feature, "Pretenst Factor", 0, 5)
        case WorldFeature.StiffnessFactor:
            // percents: [1, 10, 50, 100, 150, 200, 300],
            return linearMapping(feature, "Stiffness", 0.01, 3)
        case WorldFeature.IterationsPerFrame:
            // percents: [2, 10, 25, 50, 100, 200, 300, 500],
            return linearMapping(feature, "Iterations per frame", 0.02, 5)
        case WorldFeature.IntervalCountdown:
            // percents: [10, 20, 30, 100, 150, 400, 1000],
            return linearMapping(feature, "Interval Countdown", 0.1, 10)
        case WorldFeature.PretensingCountdown:
            // percents: [50, 75, 90, 100, 125, 150, 200],
            return linearMapping(feature, "Slack to pretenst countdown", 0.5, 2)
        case WorldFeature.VisualStrain:
            // percents: [0, 10, 50, 100, 200, 300, 500, 1000],
            return linearMapping(feature, "Visual strain", 0, 10)
        case WorldFeature.PushOverPull:
            // percents: [10, 25, 50, 100, 200, 300, 400, 500, 600, 700],
            return linearMapping(feature, "Compression/Tension", 0.1, 7)
        default:
            throw new Error("Feature?")
    }
}
