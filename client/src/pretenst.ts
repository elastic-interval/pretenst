/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
import { IntervalRole } from "eig"

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
