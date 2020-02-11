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
            return "Nex Push"
        case IntervalRole.ColumnPush:
            return "Col Push"
        case IntervalRole.Triangle:
            return "Tri"
        case IntervalRole.Ring:
            return "Ring"
        case IntervalRole.NexusCross:
            return "Nex Cross"
        case IntervalRole.ColumnCross:
            return "Col Cross"
        case IntervalRole.BowMid:
            return "Bow Mid"
        case IntervalRole.BowEnd:
            return "Bow End"
        case IntervalRole.FacePull:
            return "Face Pull"
        default:
            return "?"
    }
}

export const INTERVAL_ROLES: IntervalRole[] = Object.keys(IntervalRole)
    .filter(role => role.length > 1 && IntervalRole[role] !== IntervalRole.FacePull)
    .map(role => IntervalRole[role])

export function isPush(intervalRole: IntervalRole): boolean {
    return intervalRole === IntervalRole.ColumnPush || intervalRole === IntervalRole.NexusPush
}

export function fabricFeatureIntervalRole(fabricFeature: FabricFeature): IntervalRole | undefined {
    const firstLengthFeature = FabricFeature.NexusPushLength
    if (fabricFeature < firstLengthFeature || fabricFeature > FabricFeature.BowEndLength) {
        return undefined
    }
    return IntervalRole[IntervalRole[fabricFeature - firstLengthFeature]]
}


