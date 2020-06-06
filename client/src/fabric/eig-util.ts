/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, Stage, WorldFeature } from "eig"

export function doNotClick(stage: Stage): boolean {
    return stage === Stage.Growing || stage === Stage.Slack
}

export const FABRIC_FEATURES: WorldFeature[] = Object.keys(WorldFeature)
    .filter(k => isNaN(parseInt(k, 10)))
    .map(k => WorldFeature[k])

export function intervalRoleName(intervalRole: IntervalRole): string {
    switch (intervalRole) {
        case IntervalRole.NexusPush:
            return "NP"
        case IntervalRole.ColumnPush:
            return "CP"
        case IntervalRole.Triangle:
            return "TR"
        case IntervalRole.Ring:
            return "RI"
        case IntervalRole.Cross:
            return "CR"
        case IntervalRole.BowMid:
            return "BM"
        case IntervalRole.BowEnd:
            return "BE"
        case IntervalRole.RibbonPush:
            return "RP"
        case IntervalRole.RibbonShort:
            return "RS"
        case IntervalRole.RibbonLong:
            return "RL"
        case IntervalRole.RibbonHanger:
            return "RH"
        case IntervalRole.FaceConnector:
            return "FC"
        case IntervalRole.FaceDistancer:
            return "FD"
        case IntervalRole.FaceAnchor:
            return "FA"
        case IntervalRole.SpherePush:
            return "SB"
        case IntervalRole.SpherePull:
            return "SC"
        default:
            return "?"
    }
}

export const ADJUSTABLE_INTERVAL_ROLES: IntervalRole[] = Object.keys(IntervalRole)
    .filter(role => {
        switch (IntervalRole[role]) {
            case IntervalRole.NexusPush:
            case IntervalRole.ColumnPush:
            case IntervalRole.Triangle:
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

export function isPushInterval(intervalRole: IntervalRole): boolean {
    switch (intervalRole) {
        case IntervalRole.NexusPush:
        case IntervalRole.ColumnPush:
        case IntervalRole.RibbonPush:
        case IntervalRole.SpherePush:
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

export function floatString(numeric: number):string {
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
