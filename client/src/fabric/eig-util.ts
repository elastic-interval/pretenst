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
    .filter(
        role => IntervalRole[role] !== IntervalRole.FaceConnector &&
            IntervalRole[role] !== IntervalRole.FaceDistancer &&
            IntervalRole[role] !== IntervalRole.FaceAnchor)
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

export function fabricFeatureIntervalRole(worldFeature: WorldFeature): IntervalRole | undefined {
    switch (worldFeature) {
        case WorldFeature.NexusPushLength:
            return IntervalRole.NexusPush
        case WorldFeature.ColumnPushLength:
            return IntervalRole.ColumnPush
        case WorldFeature.TriangleLength:
            return IntervalRole.Triangle
        case WorldFeature.RingLength:
            return IntervalRole.Ring
        case WorldFeature.CrossLength:
            return IntervalRole.Cross
        case WorldFeature.BowMidLength:
            return IntervalRole.BowMid
        case WorldFeature.BowEndLength:
            return IntervalRole.BowEnd
        case WorldFeature.RibbonPushLength:
            return IntervalRole.RibbonPush
        case WorldFeature.RibbonShortLength:
            return IntervalRole.RibbonShort
        case WorldFeature.RibbonLongLength:
            return IntervalRole.RibbonLong
        case WorldFeature.RibbonHangerLength:
            return IntervalRole.RibbonHanger
        default:
            return undefined
    }
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
