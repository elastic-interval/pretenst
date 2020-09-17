/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import { Vector3 } from "three"

export const FORWARD = new Vector3(1, 0, 0)
export const RIGHT = new Vector3(0, 0, 1)
export const UP = new Vector3(0, 1, 0)

export enum IntervalRole {
    Push,
    Pull,
    PhiPush,
    RootPush,
    PhiTriangle,
    Twist,
    InterTwist,
    Ring,
    Cross,
    BowMid,
    BowEnd,
    FaceConnector,
    FaceDistancer,
}

const ROOT2 = 1.414213562373095
const ROOT3 = 1.732050807568877
const ROOT5 = 2.23606797749979
const PHI = (1 + ROOT5) / 2
const CROSS1 = 0.5
const CROSS2 = (PHI / 3 - 1 / 6) * ROOT3
const CROSS3 = PHI / 3 * ROOT3 - 1 + ROOT2 / ROOT3

export function roleDefaultLength(intervalRole: IntervalRole): number {
    switch (intervalRole) {
        case IntervalRole.Push:
            return 1
        case IntervalRole.Pull:
            return 1
        case IntervalRole.PhiPush:
            return PHI
        case IntervalRole.RootPush:
            return ROOT2
        case IntervalRole.PhiTriangle:
        case IntervalRole.Twist:
        case IntervalRole.InterTwist:
            return 1
        case IntervalRole.Ring:
            return Math.sqrt(2 - 2 * Math.sqrt(2 / 3))
        case IntervalRole.Cross:
            return Math.sqrt(CROSS1 * CROSS1 + CROSS2 * CROSS2 + CROSS3 * CROSS3)
        case IntervalRole.BowMid:
            return 0.4
        case IntervalRole.BowEnd:
            return 0.6
        default:
            throw new Error("role?")
    }
}

export const PUSH_RADIUS = 0.012
export const PULL_RADIUS = 0.005
export const JOINT_RADIUS = 0.015

export const SPACE_RADIUS = 10000
export const SPACE_SCALE = 1

export function doNotClick(stage: Stage): boolean {
    return stage === Stage.Growing || stage === Stage.Slack
}

export const FABRIC_FEATURES: WorldFeature[] = Object.keys(WorldFeature)
    .filter(k => isNaN(parseInt(k, 10)))
    .map(k => WorldFeature[k])

export function intervalRoleName(intervalRole: IntervalRole, long?: boolean): string {
    switch (intervalRole) {
        case IntervalRole.Push:
            return long ? "Push" : "P+"
        case IntervalRole.Pull:
            return long ? "Pull" : "P-"
        case IntervalRole.PhiPush:
            return long ? "Phi Push" : "PP"
        case IntervalRole.RootPush:
            return long ? "Root Push" : "RP"
        case IntervalRole.PhiTriangle:
            return long ? "Phi Triangle" : "PT"
        case IntervalRole.Ring:
            return long ? "Ring" : "RI"
        case IntervalRole.Twist:
            return long ? "Twist" : "TW"
        case IntervalRole.InterTwist:
            return long ? "Intertwist" : "IT"
        case IntervalRole.Cross:
            return long ? "Cross" : "CR"
        case IntervalRole.BowMid:
            return long ? "Bow-mid" : "BM"
        case IntervalRole.BowEnd:
            return long ? "Bow-end" : "BE"
        default:
            return "?"
    }
}

export const ADJUSTABLE_INTERVAL_ROLES: IntervalRole[] = Object.keys(IntervalRole)
    .filter(role => {
        switch (IntervalRole[role]) {
            case IntervalRole.PhiPush:
            case IntervalRole.RootPush:
            case IntervalRole.PhiTriangle:
            case IntervalRole.Twist:
            case IntervalRole.InterTwist:
            case IntervalRole.Ring:
            case IntervalRole.Cross:
            case IntervalRole.BowMid:
            case IntervalRole.BowEnd:
                return true
            default:
                return false
        }
    })
    .map(role => IntervalRole[role])

export function isPushRole(intervalRole: IntervalRole): boolean {
    switch (intervalRole) {
        case IntervalRole.PhiPush:
        case IntervalRole.RootPush:
        case IntervalRole.Push:
            return true
    }
    return false
}

export function isFaceRole(intervalRole: IntervalRole): boolean {
    switch (intervalRole) {
        case IntervalRole.FaceDistancer:
        case IntervalRole.FaceConnector:
            return true
    }
    return false
}

export function isConnectorRole(intervalRole: IntervalRole): boolean {
    return intervalRole === IntervalRole.FaceConnector
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

export enum Version {Design = "design", Gotchi = "gotchi", Bridge = "bridge", Sphere = "sphere"}

export function versionFromUrl(): Version {
    const hash = location.hash
    if (hash === "#bridge") {
        return Version.Bridge
    }
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
        norm.add(new Vector3().crossVectors(next, current).normalize())
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

