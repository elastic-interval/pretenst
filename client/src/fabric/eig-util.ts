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
            return "NexPush"
        case IntervalRole.ColumnPush:
            return "ColPush"
        case IntervalRole.Triangle:
            return "Tri"
        case IntervalRole.Ring:
            return "Ring"
        case IntervalRole.NexusCross:
            return "NexCross"
        case IntervalRole.ColumnCross:
            return "ColCross"
        case IntervalRole.BowMid:
            return "BowMid"
        case IntervalRole.BowEnd:
            return "BowEnd"
        case IntervalRole.FacePull:
            return "FacePull"
        default:
            return "?"
    }
}

export const ADJUSTABLE_INTERVAL_ROLES: IntervalRole[] = Object.keys(IntervalRole)
    .filter(role => IntervalRole[role] !== IntervalRole.FacePull)
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
        case FabricFeature.NexusCrossLength:
            return IntervalRole.NexusCross
        case FabricFeature.ColumnCrossLength:
            return IntervalRole.ColumnCross
        case FabricFeature.BowMidLength:
            return IntervalRole.BowMid
        case FabricFeature.BowEndLength:
            return IntervalRole.BowEnd
        default:
            return undefined
    }
}


