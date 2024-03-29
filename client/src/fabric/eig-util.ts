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

export const ROOT3 = 1.732050807568877
export const ROOT5 = 2.23606797749979
export const PHI = (1 + ROOT5) / 2
export const ROOT6 = 2.44948974278

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
    Mobius = "mobius",
    Klein = "klein",
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
