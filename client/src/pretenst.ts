/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
import { IntervalRole } from "eig"

const ROOT2 = 1.414213562373095
const ROOT3 = 1.732050807568877
const ROOT5 = 2.23606797749979
const PHI = (1 + ROOT5) / 2
const RIBBON_WIDTH = 6
const RIBBON_STEP_LENGTH = 6
const CROSS1 = 0.5
const CROSS2 = (PHI / 3 - 1 / 6) * ROOT3
const CROSS3 = PHI / 3 * ROOT3 - 1 + ROOT2 / ROOT3

export function roleDefaultLength(intervalRole: IntervalRole): number {
    switch (intervalRole) {
        case IntervalRole.NexusPush:
            return PHI
        case IntervalRole.ColumnPush:
            return ROOT2
        case IntervalRole.Triangle:
            return 1
        case IntervalRole.Ring:
            return Math.sqrt(2 - 2 * Math.sqrt(2 / 3))
        case IntervalRole.Cross:
            return Math.sqrt(CROSS1 * CROSS1 + CROSS2 * CROSS2 + CROSS3 * CROSS3)
        case IntervalRole.BowMid:
            return 0.4
        case IntervalRole.BowEnd:
            return 0.6
        case IntervalRole.RibbonPush:
            return Math.sqrt(RIBBON_WIDTH * RIBBON_WIDTH + RIBBON_STEP_LENGTH * RIBBON_STEP_LENGTH)
        case IntervalRole.RibbonShort:
            return RIBBON_STEP_LENGTH / 2
        case IntervalRole.RibbonLong:
            return RIBBON_WIDTH
        case IntervalRole.RibbonHanger:
            return 1
        default:
            throw new Error("role?")
    }
}

export const PUSH_RADIUS = 0.02
export const PULL_RADIUS = 0.004
export const JOINT_RADIUS = 0.04

export const SPACE_RADIUS = 10000
export const SPACE_SCALE = 1
