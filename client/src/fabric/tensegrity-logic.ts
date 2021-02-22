import { Vector3 } from "three"

import { IntervalRole, isPushRole } from "./eig-util"
import { IInterval, IJoint, ITip, jointDistance, jointLocation } from "./tensegrity-types"

export interface ITipPair {
    alpha: ITip
    omega: ITip
}

export type IntervalRoleFilter = (a: IntervalRole, b: IntervalRole, hasPush: boolean) => boolean

export type TipPairInclude = (pair: ITipPair) => boolean

export function tipCandidates(intervals: IInterval[], include: TipPairInclude): ITipPair[] {
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

export interface IJointPair {
    alpha: IJoint
    omega: IJoint
}

export function triangulationCandidates(intervals: IInterval[], joints: IJoint[], include: IntervalRoleFilter): IJointPair[] {
    const pulls = intervals.filter(({intervalRole}) => !isPushRole(intervalRole))
    const pullMap: Record<string, IJointPair> = {}

    function intervalKey(a: IJoint, b: IJoint): string {
        return `(${a.index},${b.index})`
    }

    function record(pair: IJointPair): void {
        const {alpha, omega} = pair
        pullMap[intervalKey(alpha, omega)] = pair
        pullMap[intervalKey(omega, alpha)] = pair
    }

    pulls.forEach(pull => {
        function add(joint: IJoint): void {
            if (joint.pulls) {
                joint.pulls.push(pull)
            } else {
                joint.pulls = [pull]
            }
        }

        add(pull.alpha)
        add(pull.omega)
    })
    intervals.forEach(interval => record(interval))
    const newPairs: IJointPair[] = []

    function oppositeJoints(a: IInterval, b: IInterval): { pair: IJointPair, common: IJoint } {
        if (a.alpha.index === b.alpha.index) {
            return {pair: {alpha: a.omega, omega: b.omega}, common: a.alpha}
        } else if (a.alpha.index === b.omega.index) {
            return {pair: {alpha: a.omega, omega: b.alpha}, common: a.alpha}
        } else if (a.omega.index === b.alpha.index) {
            return {pair: {alpha: a.alpha, omega: b.omega}, common: a.omega}
        } else if (a.omega.index === b.omega.index) {
            return {pair: {alpha: a.alpha, omega: b.alpha}, common: a.omega}
        } else {
            throw new Error("Bad pair")
        }
    }

    joints.forEach(joint => {
        const pullsHere = joint.pulls
        if (pullsHere) {
            pullsHere.forEach((a, indexA) => {
                pullsHere.forEach((b, indexB) => {
                    if (indexB <= indexA) {
                        return
                    }
                    const {pair, common} = oppositeJoints(a, b)
                    if (!include(a.intervalRole, b.intervalRole, !!common.push)) {
                        return
                    }
                    const existing = pullMap[intervalKey(pair.alpha, pair.omega)]
                    if (!existing) {
                        newPairs.push(pair)
                        record(pair)
                    }
                })
            })
        }
    })
    pulls.forEach(({alpha, omega}) => {
        alpha.pulls = undefined
        omega.pulls = undefined
    })
    return newPairs
}
