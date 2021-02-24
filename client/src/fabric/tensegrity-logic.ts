import { Vector3 } from "three"

import { IntervalRole, isPushRole } from "./eig-util"
import {
    factorFromPercent,
    IInterval,
    IJoint,
    intervalLength,
    IPercent,
    ITip,
    jointLocation,
    otherJoint,
    percentFromFactor,
    percentOrHundred,
} from "./tensegrity-types"

export type PairFilter = (a: ITip, b: ITip) => boolean

export interface ITipPair {
    alpha: ITip
    omega: ITip
    scale: IPercent
    intervalRole: IntervalRole
}

export function proximityPairs(intervals: IInterval[], includePair: PairFilter): ITipPair[] {
    const {tips, pairMap} = addTips(intervals)
    const newPairs: ITipPair[] = []
    tips.forEach(tip => tips
        .filter(({joint, location, pushLength}) =>
            joint.index !== tip.joint.index && location.distanceTo(tip.location) < pushLength)
        .forEach(nearTip => {
            const existing = pairMap[tipKey(tip, nearTip)]
            if (!existing) {
                if (includePair(tip, nearTip)) {
                    const scale = percentOrHundred()
                    const intervalRole = IntervalRole.PullC
                    const pair: ITipPair = {alpha: tip, omega: nearTip, scale, intervalRole}
                    newPairs.push(pair)
                    recordPair(pair, pairMap)
                }
            }
        }))
    removeTips(intervals)
    return newPairs
}

export type TriangleFilter = (a: IInterval, b: IInterval, hasPush: boolean) => boolean

export function trianglePairs(intervals: IInterval[], includeTriangle: TriangleFilter): ITipPair[] {
    const {tips, pairMap} = addTips(intervals)
    const oppositeTips = (a: IInterval, b: IInterval): ITipPair | undefined => {
        const scale = percentFromFactor((factorFromPercent(a.scale) + factorFromPercent(b.scale)) / 2)
        const bAlpha = b.alpha.tip
        const aOmega = a.omega.tip
        const bOmega = b.omega.tip
        const aAlpha = a.alpha.tip
        if (!(aAlpha && aOmega && bAlpha && bOmega)) {
            return undefined
        }
        const intervalRole = IntervalRole.PullC
        if (aAlpha.joint.index === bAlpha.joint.index) {
            return {alpha: aOmega, omega: bOmega, scale, intervalRole}
        } else if (aAlpha.joint.index === bOmega.joint.index) {
            return {alpha: aOmega, omega: bAlpha, scale, intervalRole}
        } else if (aOmega.joint.index === bAlpha.joint.index) {
            return {alpha: aAlpha, omega: bOmega, scale, intervalRole}
        } else if (aOmega.joint.index === bOmega.joint.index) {
            return {alpha: aAlpha, omega: bAlpha, scale, intervalRole}
        } else {
            throw new Error("Bad pair")
        }
    }
    const newPairs: ITipPair[] = []
    tips.forEach(tip => {
        const pullsHere = tip.pulls
        if (pullsHere) {
            pullsHere.forEach((a, indexA) => {
                pullsHere.forEach((b, indexB) => {
                    if (indexB <= indexA || !includeTriangle(a, b, !!tip.joint.push)) {
                        return
                    }
                    const pair = oppositeTips(a, b)
                    if (!pair) {
                        return
                    }
                    const existing = pairMap[tipKey(pair.alpha, pair.omega)]
                    if (!existing) {
                        newPairs.push(pair)
                        recordPair(pair, pairMap)
                    }
                })
            })
        }
    })
    removeTips(intervals)
    return newPairs
}

export function squarePairs(intervals: IInterval[]): ITipPair[] {
    const {pairMap} = addTips(intervals)
    const newPairs: ITipPair[] = []
    const other = (ourJoint: IJoint, interval: IInterval) => {
        const across = otherJoint(ourJoint, interval)
        const direction = new Vector3().subVectors(jointLocation(across), jointLocation(ourJoint)).normalize()
        const joint = across.push ? across : ourJoint
        const tip = joint.tip
        if (!tip) {
            throw new Error("no tip")
        }
        return {tip, direction}
    }
    intervals
        .filter(({intervalRole}) => !isPushRole(intervalRole))
        .filter(okPair)
        .map(toPair)
        .forEach(({alpha, omega, scale, intervalRole}) => {
            alpha.pulls.forEach(alphaA => {
                const alphaX = other(alpha.joint, alphaA)
                omega.pulls.forEach(omegaA => {
                    const omegaX = other(omega.joint, omegaA)
                    const existing = pairMap[tipKey(alphaX.tip, omegaX.tip)]
                    if (!existing) {
                        const dot = alphaX.direction.dot(omegaX.direction)
                        if (dot > 0.7) {
                            const pair: ITipPair = {alpha: alphaX.tip, omega: omegaX.tip, scale, intervalRole}
                            newPairs.push(pair)
                            recordPair(pair, pairMap)
                        }
                    }
                })
            })
        })
    removeTips(intervals)
    return newPairs
}

function indexKey(a: number, b: number): string {
    return a < b ? `(${a},${b})` : `(${b},${a})`
}

function tipKey(a: ITip, b: ITip): string {
    return indexKey(a.joint.index, b.joint.index)
}

function addTip(joint: IJoint, push: IInterval): ITip {
    const location = jointLocation(joint)
    const outwards = new Vector3().subVectors(location, jointLocation(otherJoint(joint, push))).normalize()
    const pushLength = intervalLength(push)
    return joint.tip = {joint, location, outwards, pushLength, pulls: []}
}

function toPair(interval: IInterval): ITipPair {
    const {alpha, omega, scale, intervalRole} = interval
    const alphaTip = alpha.tip
    const omegaTip = omega.tip
    if (!alphaTip || !omegaTip) {
        throw new Error("bad tip")
    }
    return {alpha: alphaTip, omega: omegaTip, scale, intervalRole}
}

function okPair({alpha, omega}: IInterval): boolean {
    return alpha.tip !== undefined && omega.tip !== undefined
}

function addTips(intervals: IInterval[]): { tips: ITip[], pairMap: Record<string, ITipPair> } {
    const tips: ITip[] = []
    intervals
        .filter(({intervalRole}) => isPushRole(intervalRole))
        .forEach(push => {
            const {alpha, omega} = push
            tips.push(addTip(alpha, push), addTip(omega, push))
        })
    intervals
        .filter(({intervalRole}) => !isPushRole(intervalRole))
        .forEach(pull => {
            const addPull = (end: IJoint) => {
                const tip = end.tip
                if (tip) {
                    tip.pulls.push(pull)
                }
            }
            const {alpha, omega} = pull
            addPull(alpha)
            addPull(omega)
        })
    const pairMap: Record<string, ITipPair> = {}
    intervals.filter(okPair).forEach((interval) => recordPair(toPair(interval), pairMap))
    return {tips, pairMap}
}

function recordPair(pair: ITipPair, pairMap: Record<string, ITipPair>): void {
    const {alpha, omega} = pair
    pairMap[tipKey(alpha, omega)] = pair
}

function removeTips(intervals: IInterval[]): void {
    intervals.forEach(({alpha, omega}) => {
        alpha.tip = undefined
        omega.tip = undefined
    })
}

