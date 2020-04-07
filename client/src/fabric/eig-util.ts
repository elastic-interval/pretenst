/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole, Stage } from "eig"

export function doNotClick(stage: Stage): boolean {
    return stage === Stage.Growing || stage === Stage.Slack
}

export const FABRIC_FEATURES: FabricFeature[] = Object.keys(FabricFeature)
    .filter(k => isNaN(parseInt(k, 10)))
    .map(k => FabricFeature[k])

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
        case IntervalRole.FaceConnector:
            return "FC"
        case IntervalRole.FaceDistancer:
            return "FD"
        default:
            return "?"
    }
}

export const ADJUSTABLE_INTERVAL_ROLES: IntervalRole[] = Object.keys(IntervalRole)
    .filter(role => IntervalRole[role] !== IntervalRole.FaceConnector && IntervalRole[role] !== IntervalRole.FaceDistancer)
    .map(role => IntervalRole[role])

export function isPushInterval(intervalRole: IntervalRole): boolean {
    return intervalRole === IntervalRole.ColumnPush || intervalRole === IntervalRole.NexusPush
}

export function fabricFeatureIntervalRole(fabricFeature: FabricFeature): IntervalRole | undefined {
    switch (fabricFeature) {
        case FabricFeature.NexusPushLength:
            return IntervalRole.NexusPush
        case FabricFeature.ColumnPushLength:
            return IntervalRole.ColumnPush
        case FabricFeature.TriangleLength:
            return IntervalRole.Triangle
        case FabricFeature.RingLength:
            return IntervalRole.Ring
        case FabricFeature.CrossLength:
            return IntervalRole.Cross
        case FabricFeature.BowMidLength:
            return IntervalRole.BowMid
        case FabricFeature.BowEndLength:
            return IntervalRole.BowEnd
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
            return "Mature"
    }
}
