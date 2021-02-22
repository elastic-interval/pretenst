import { Vector3 } from "three"

import { IntervalRole, isPushRole } from "./eig-util"
import { IInterval, ITip, jointDistance, jointLocation } from "./tensegrity-types"

export interface ITipPair {
    alpha: ITip
    omega: ITip
}

export type IntervalRoleFilter = (a: IntervalRole, b: IntervalRole, hasPush: boolean) => boolean

export type TipPairInclude = (pair: ITipPair) => boolean

export function pullCandidates(intervals: IInterval[], include: TipPairInclude): ITipPair[] {
    const intervalKey = (a: ITip, b: ITip) => {
        const aa = a.joint.index
        const bb = b.joint.index
        return aa < bb ? `(${aa},${bb})` : `(${bb},${aa})`
    }
    const tipPairs: Record<string, ITipPair> = {}
    const recordPair = (pair: ITipPair): void => {
        const {alpha, omega} = pair
        tipPairs[intervalKey(alpha, omega)] = pair
    }
    const tips: ITip[] = []
    intervals
        .filter(({intervalRole}) => isPushRole(intervalRole))
        .forEach(push => {
            const {alpha, omega} = push
            const locAlpha = jointLocation(alpha)
            const locOmega = jointLocation(omega)
            const pushLength = jointDistance(alpha, omega)
            alpha.tip = {
                joint: alpha,
                location: locAlpha,
                outwards: new Vector3().subVectors(locAlpha, locOmega).normalize(),
                pushLength,
            }
            omega.tip = {
                joint: omega,
                location: locOmega,
                outwards: new Vector3().subVectors(locOmega, locAlpha).normalize(),
                pushLength,
            }
            tips.push(alpha.tip, omega.tip)
        })
    intervals.forEach(interval => {
        const alpha = interval.alpha.tip
        const omega = interval.omega.tip
        if (!alpha || !omega) {
            return
        }
        recordPair({alpha, omega})
    })
    const newPairs: ITipPair[] = []
    tips.forEach(tip => {
        tips
            .filter(({joint, location, pushLength}) =>
                joint.index !== tip.joint.index && location.distanceTo(tip.location) < pushLength)
            .forEach(nearTip => {
                const existing = tipPairs[intervalKey(tip, nearTip)]
                if (!existing) {
                    const pair: ITipPair = {alpha: tip, omega: nearTip}
                    if (include(pair)) {
                        newPairs.push(pair)
                        recordPair(pair)
                    }
                }
            })
    })
    intervals.forEach(({alpha, omega}) => {
        alpha.tip = undefined
        omega.tip = undefined
    })
    return newPairs
}
