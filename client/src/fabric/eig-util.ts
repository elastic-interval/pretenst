/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import { Vector3 } from "three"

export const FORWARD = new Vector3(1, 0, 0)
export const RIGHT = new Vector3(0, 0, 1)
export const UP = new Vector3(0, 1, 0)

export const CONNECTOR_LENGTH = 0.05

export enum IntervalRole {
    PushA,
    PushB,
    PullA,
    PullB,
    PullC,
    Radial,
    Connector,
    Distancer,
}

const ROOT3 = 1.732050807568877
const ROOT5 = 2.23606797749979
const PHI = (1 + ROOT5) / 2
const ROOT6 = 2.44948974278

export function roleDefaultLength(intervalRole: IntervalRole): number {
    switch (intervalRole) {
        case IntervalRole.PushA:
            return ROOT6
        case IntervalRole.PushB:
            return PHI * ROOT3
        case IntervalRole.PullA:
            return 1
        case IntervalRole.PullB:
            return ROOT3
        case IntervalRole.PullC:
            return 3 // TODO
        default:
            throw new Error(`Length for Role ${IntervalRole[intervalRole]}?`)
    }
}

export const PUSH_RADIUS = 0.012
export const PULL_RADIUS = 0.005
export const JOINT_RADIUS = 0.015

export function doNotClick(stage: Stage): boolean {
    return stage === Stage.Growing || stage === Stage.Slack
}

export const WORLD_FEATURES: WorldFeature[] = Object.keys(WorldFeature)
    .filter(k => isNaN(parseInt(k, 10)))
    .map(k => WorldFeature[k])

export function intervalRoleName(intervalRole: IntervalRole): string {
    switch (intervalRole) {
        case IntervalRole.PushA:
            return "[A])"
        case IntervalRole.PushB:
            return "[B]"
        case IntervalRole.PullA:
            return "(a)"
        case IntervalRole.PullB:
            return "(b)"
        case IntervalRole.PullC:
            return "(c)"
        default:
            return "?"
    }
}

export const ADJUSTABLE_INTERVAL_ROLES: IntervalRole[] = Object.keys(IntervalRole)
    .filter(role => {
        switch (IntervalRole[role]) {
            case IntervalRole.PushA:
            case IntervalRole.PushB:
            case IntervalRole.PullA:
            case IntervalRole.PullB:
            case IntervalRole.PullC:
                return true
            default:
                return false
        }
    })
    .map(role => IntervalRole[role])

export function isPushRole(intervalRole: IntervalRole): boolean {
    switch (intervalRole) {
        case IntervalRole.PushA:
        case IntervalRole.PushB:
            return true
    }
    return false
}

export function stageName(stage: Stage): string {
    switch (stage) {
        case Stage.Growing:
            return "Growing"
        case Stage.Shaping:
            return "Shaping"
        case Stage.Slack:
            return "Slack"
        case Stage.Pretensing:
            return "Pretensing"
        default:
            return "Pretenst"
    }
}

export enum Version {Design = "design", Gotchi = "gotchi", Sphere = "sphere"}

export function versionFromUrl(): Version {
    const hash = location.hash
    if (hash === "#gotchi") {
        return Version.Gotchi
    }
    if (hash.startsWith("#sphere")) {
        return Version.Sphere
    }
    return Version.Design
}

export function switchToVersion(version: Version): void {
    location.hash = version
    location.reload()
}

export function floatString(numeric: number): string {
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

export function vectorString({x, y, z}: Vector3): string {
    const digits = 2
    return `(${x.toFixed(digits)}, ${y.toFixed(digits)}, ${z.toFixed(digits)})`
}

export function sub(a: Vector3, b: Vector3): Vector3 {
    return new Vector3().subVectors(a, b).normalize()
}

export function avg(a: Vector3, b: Vector3): Vector3 {
    return new Vector3().addVectors(a, b).normalize()
}

export function midpoint(points: Vector3[]): Vector3 {
    const mid = new Vector3()
    points.forEach(point => mid.add(point))
    return mid.multiplyScalar(1 / points.length)
}

export function normal(points: Vector3 []): Vector3 {
    const mid = midpoint(points)
    const radials = points.map(point => new Vector3().copy(point).sub(mid))
    const norm = new Vector3()
    for (let index = 0; index < radials.length; index++) {
        const current = radials[index]
        const next = radials[(index + 1) % radials.length]
        norm.add(new Vector3().crossVectors(current, next).normalize())
    }
    return norm.normalize()
}

export function vectorFromArray(array: Float32Array, index: number, vector?: Vector3): Vector3 {
    const offset = index * 3
    if (vector) {
        vector.set(array[offset], array[offset + 1], array[offset + 2])
        return vector
    } else {
        return new Vector3(array[offset], array[offset + 1], array[offset + 2])
    }
}

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
                percents: [0, 5,  25, 50, 100, 200, 500, 1000],
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
                percents: [1, 10, 50, 100, 150, 200, 300],
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
                percents: [10, 20, 30, 100, 150, 400, 1000],
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
                percents: [0, 10, 50, 100, 200, 300, 500, 1000],
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

