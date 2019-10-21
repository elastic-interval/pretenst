/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export enum IntervalRole {
    Bar = 1,
    Triangle = 2,
    Ring = 3,
    Cross = 4,
    BowMid = 5,
    BowEndLow = 6,
    BowEndHigh = 7,
}

export function roleLength(intervalRole: IntervalRole, defaultValue?: boolean): number {
    if (defaultValue) {
        return defaultRoleLength(intervalRole)
    }
    const value = localStorage.getItem(IntervalRole[intervalRole])
    return (value ? parseFloat(value) : defaultRoleLength(intervalRole))
}

function defaultRoleLength(intervalRole: IntervalRole): number {
    switch (intervalRole) {
        case IntervalRole.Bar:
            return 2 * 1.618
        case IntervalRole.Triangle:
            return 2.123
        case IntervalRole.Ring:
            return 1.440
        case IntervalRole.Cross:
            return 1.583
        case IntervalRole.BowMid:
            return 0.8521
        case IntervalRole.BowEndLow:
            return 1.380
        case IntervalRole.BowEndHigh:
            return 1.571
        default:
            throw new Error("Bad interval role")
    }
}
