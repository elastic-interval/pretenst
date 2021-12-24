/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import { Vector3 } from "three"

export const FORWARD = new Vector3(1, 0, 0)
export const RIGHT = new Vector3(0, 0, 1)
export const UP = new Vector3(0, 1, 0)
export const DOWN = new Vector3(0, -1, 0)

export const CONNECTOR_LENGTH = 0.05

export enum IntervalRole {
    PushA,
    PushB,
    PushC,
    PullA,
    PullB,
    PullAA,
    PullBB,
    Conflict,
    Radial,
    Connector,
    ShapingDistancer,
    PretenstDistancer,
}

export interface IRole {
    intervalRole: IntervalRole
    name: string
    push: boolean
    length: number
    stiffness: number
}

const ROOT3 = 1.732050807568877
const ROOT5 = 2.23606797749979
const PHI = (1 + ROOT5) / 2
const ROOT6 = 2.44948974278
const SHORTENING = 0.5

const ROLES: IRole[] = [
    {
        intervalRole: IntervalRole.PushA,
        name: "[A]",
        push: true,
        length: ROOT6,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.PushB,
        name: "[B]",
        push: true,
        length: PHI * ROOT3,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.PushC,
        name: "",
        push: true,
        length: 1,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.PullA,
        name: "(a)",
        push: false,
        length: 1,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.PullB,
        name: "(b)",
        push: false,
        length: ROOT3,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.PullAA,
        name: "(aa)",
        push: false,
        length: SHORTENING,
        stiffness: 0.4,
    },
    {
        intervalRole: IntervalRole.PullBB,
        name: "(bb)",
        push: false,
        length: ROOT3 * SHORTENING,
        stiffness: 0.4,
    },
    {
        intervalRole: IntervalRole.Conflict,
        name: "",
        push: false,
        length: 0.01,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.Radial,
        name: "",
        push: false,
        length: 1,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.Connector,
        name: "",
        push: false,
        length: 1,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.ShapingDistancer,
        name: "",
        push: false,
        length: 1,
        stiffness: 1,
    },
    {
        intervalRole: IntervalRole.PretenstDistancer,
        name: "",
        push: false,
        length: 1,
        stiffness: 1,
    },
]

export const PUSH_A = ROLES[IntervalRole.PushA]
export const PUSH_B = ROLES[IntervalRole.PushB]
export const PUSH_C = ROLES[IntervalRole.PushC]
export const PULL_A = ROLES[IntervalRole.PullA]
export const PULL_B = ROLES[IntervalRole.PullB]
export const PULL_AA = ROLES[IntervalRole.PullAA]
export const PULL_BB = ROLES[IntervalRole.PullBB]
export const PULL_CONFLICT = ROLES[IntervalRole.Conflict]
export const PULL_RADIAL = ROLES[IntervalRole.Radial]
export const PULL_CONNECTOR = ROLES[IntervalRole.Connector]
export const PULL_SHAPING_DISTANCER = ROLES[IntervalRole.ShapingDistancer]
export const PULL_PRETENST_DISTANCER = ROLES[IntervalRole.PretenstDistancer]

export const ADJUSTABLE = ROLES.filter(({name}) => name.length > 0)

export const PUSH_RADIUS = 0.012
export const PULL_RADIUS = 0.005
export const JOINT_RADIUS = 0.015

export function doNotClick(stage: Stage): boolean {
    return stage === Stage.Growing || stage === Stage.Slack
}

export const WORLD_FEATURES: string[] = Object.keys(WorldFeature)

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

export enum GlobalMode {
    Choice = "choice",
    Design = "design",
    Sphere = "sphere",
    Construction = "construction",
    Evolution = "evolution",
}

export const GLOBAL_MODES: GlobalMode[] = Object.keys(GlobalMode).map(k => GlobalMode[k])

export interface IGlobalMode {
    mode: GlobalMode,
    param?: string
}

export function nameToUrl(name: string): string {
    return name.replace(/ /g, "-")
}

export function globalModeFromUrl(): IGlobalMode {
    const hash = location.hash.substring(1)
    const split = hash.split(";")
    const mode = GLOBAL_MODES.find(m => m === split[0])
    if (mode) {
        const param = split.length > 1 ? split[1] : ""
        return {mode, param}
    }
    return reloadGlobalMode(GlobalMode.Choice)
}

export function reloadGlobalMode(mode: GlobalMode, param?: string): IGlobalMode {
    location.hash = param && param.length > 0 ? `${mode};${param}` : mode
    location.reload()
    return {mode, param}
}

export function floatString(numeric: number): string {
    const expo = numeric.toExponential(3)
    const zero = expo.indexOf("e+0")
    if (zero > 0) {
        return expo.substring(0, zero)
    }
    const minus = Math.max(expo.indexOf("e-1"), expo.indexOf("e-2"))
    if (minus > 0) {
        return numeric.toFixed(3)
    }
    const plus = Math.max(expo.indexOf("e+1"), expo.indexOf("e+2"), expo.indexOf("e+3"))
    if (plus > 0) {
        return numeric.toFixed(1)
    }
    return expo
}

export function percentString(percent: number): string {
    if (percent <= 100) {
        return `${percent.toFixed(0)}%`
    } else {
        return `${(percent / 100).toFixed(1)}x`
    }
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

export function pointsToNormal(points: Vector3 []): Vector3 {
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

export function basisFromVector(up: Vector3): { b1: Vector3, up: Vector3, b2: Vector3 } {
    const {x, y, z} = up
    const xy = x * x + y * y
    const yz = y * y + z * z
    const zx = z * z + x * x
    const b1 = new Vector3()
    if (xy > yz && xy > zx) {
        b1.set(-y, x, 0).normalize()
    } else if (yz > xy && yz > zx) {
        b1.set(0, -z, y).normalize()
    } else {
        b1.set(-z, 0, x).normalize()
    }
    const b2 = new Vector3().crossVectors(up, b1).normalize()
    return {b1, up, b2}
}
