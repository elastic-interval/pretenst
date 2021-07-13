import { Vector3 } from "three"

import { IntervalRole } from "./eig-util"
import { Tensegrity } from "./tensegrity"
import {
    acrossPush,
    filterRole,
    IInterval,
    IJoint,
    intervalJoins,
    IPercent,
    jointPulls,
    otherJoint,
    pairKey,
} from "./tensegrity-types"

export interface IConflict {
    jointA: IJoint
    jointB: IJoint
}

const CONFLICT_MULTIPLE = 6

export function findConflict(tensegrity: Tensegrity): IConflict[] {
    const conflicts: IConflict[] = []
    const instance = tensegrity.instance
    const betweenDot = (joint: IJoint, interval: IInterval) => {
        const toAlpha = instance.jointLocation(joint).sub(instance.jointLocation(interval.alpha)).normalize()
        const toOmega = instance.jointLocation(joint).sub(instance.jointLocation(interval.omega)).normalize()
        return toAlpha.dot(toOmega) < 0
    }
    tensegrity.joints.forEach((jointA, a) => {
        const pushA = jointA.push
        if (pushA) {
            tensegrity.joints.forEach((jointB, b) => {
                if (b <= a) {
                    return
                }
                const pushB = jointB.push
                if (pushB) {
                    const otherA = otherJoint(jointA, pushA)
                    const otherB = otherJoint(jointB, pushB)
                    const distanceNear = instance.jointDistance(jointA, jointB)
                    const distanceFar = instance.jointDistance(otherA, otherB)
                    if (distanceNear * CONFLICT_MULTIPLE > distanceFar) {
                        return
                    }
                    if (betweenDot(jointA, pushB) && betweenDot(jointB, pushA)) {
                        conflicts.push({jointA, jointB})
                    }
                }
            })
        }
    })
    return conflicts
}

export interface IPair {
    alpha: IJoint
    omega: IJoint
    scale: IPercent
    intervalRole: IntervalRole
}

export function snelsonPairs(tensegrity: Tensegrity): IPair[] {
    const pairs: IPair[] = []
    const snelsonPair = (alpha: IJoint, pullB: IInterval): IPair | undefined => {
        const a = acrossPush(alpha)
        const b = otherJoint(alpha, pullB)
        if (!a.push || !b.push) {
            return undefined
        }
        const acrossA = jointPulls(a).filter(filterRole(IntervalRole.PullA)).map(pullA => otherJoint(a, pullA))
        const acrossB = jointPulls(b).filter(filterRole(IntervalRole.PullA)).map(pullA => otherJoint(b, pullA))
        const omega = acrossA.find(jointA => !!acrossB.find(jointB => jointA.index === jointB.index))
        if (!omega || !omega.push) {
            return undefined
        }
        const intervalRole = IntervalRole.PullB
        const scale = pullB.scale
        return {alpha, omega, intervalRole, scale}
    }
    tensegrity.withPulls(pairMap => {
        const pullBs = tensegrity.intervals.filter(filterRole(IntervalRole.PullB))
        pullBs.forEach(pullB => {
            const alpha = snelsonPair(pullB.alpha, pullB)
            if (alpha) {
                const existingAlpha = pairMap[pairKey(alpha)]
                if (!existingAlpha) {
                    pairs.push(alpha)
                }
            }
            const omega = snelsonPair(pullB.omega, pullB)
            if (omega) {
                const existingOmega = pairMap[pairKey(omega)]
                if (!existingOmega) {
                    pairs.push(omega)
                }
            }
        })
    })
    return pairs
}

export function bowtiePairs(tensegrity: Tensegrity): IPair[] {
    const pairs: IPair[] = []
    const onlyA = filterRole(IntervalRole.PullA)
    const onlyB = filterRole(IntervalRole.PullB)
    const intersection = (a: IJoint[], b: IJoint[]) => a.find(aj => b.find(bj => aj.index === bj.index))
    const common = (a: IJoint, b: IJoint) => intersection(
        jointPulls(a).filter(onlyA).map(pullA => otherJoint(a, pullA)),
        jointPulls(b).filter(onlyA).map(pullA => otherJoint(b, pullA)),
    )
    const nextPair = (near: IJoint): IPair | undefined => {
        const pullB = jointPulls(near).filter(onlyB)[0]
        const far = otherJoint(near, pullB)
        const otherFar = acrossPush(near)
        const otherB = jointPulls(otherFar).filter(onlyB)[0]
        const otherNear = otherJoint(otherFar, otherB)
        const commonNear = common(near, otherNear)
        const commonFar = common(far, otherFar)
        if (!commonNear || !commonFar) {
            return undefined
        }
        if (commonNear.push && !commonFar.push) {
            const acrossFar = acrossPush(far)
            if (!jointPulls(acrossFar).some(intervalJoins(commonNear, acrossFar))) {
                return undefined
            }
        } else if (commonFar.push && !commonNear.push) {
            const acrossNear = acrossPush(near)
            if (!jointPulls(acrossNear).some(intervalJoins(commonFar, acrossNear))) {
                return undefined
            }
        }
        const alpha = commonNear.push ? commonNear : near
        const omega = commonFar.push ? commonFar : far
        const scale = pullB.scale
        const intervalRole = !commonNear.push || !commonFar.push ? IntervalRole.PullB : IntervalRole.PullBB
        return {alpha, omega, scale, intervalRole}
    }
    const instance = tensegrity.instance
    tensegrity.withPulls(pairMap => {
        const addPair = (pair: IPair) => {
            const key = pairKey(pair)
            const exists = pairMap[key]
            if (!exists) {
                pairs.push(pair)
                pairMap[key] = pair
            }
        }
        const addPairFor = (joint: IJoint) => {
            const pair = nextPair(joint)
            if (pair) {
                addPair(pair)
            }
        }
        tensegrity.intervals
            .filter(filterRole(IntervalRole.PullB))
            .forEach(({alpha, omega}) => {
                addPairFor(alpha)
                addPairFor(omega)
            })
        tensegrity.joints
            .filter(joint => joint.push && jointPulls(joint).filter(onlyA).length === 3)
            .forEach(joint3APush => {
                const noPushAcross = (interval: IInterval) => !otherJoint(joint3APush, interval).push
                const found = jointPulls(joint3APush).filter(onlyA).find(noPushAcross)
                if (!found) {
                    throw new Error("no-push not found")
                }
                const faceJoint = otherJoint(joint3APush, found)
                const a3A = jointPulls(joint3APush).filter(onlyA).map(pullA => otherJoint(joint3APush, pullA))
                    .map(end => {
                        const outwards = new Vector3().subVectors(instance.jointLocation(end), instance.jointLocation(joint3APush)).normalize()
                        return {end, outwards}
                    })
                const fjA = jointPulls(faceJoint).filter(onlyA).map(pullA => otherJoint(faceJoint, pullA))
                    .map(end => {
                        const outwards = new Vector3().subVectors(instance.jointLocation(end), instance.jointLocation(joint3APush)).normalize()
                        return {end, outwards}
                    })
                a3A.map(a => {
                    const b = fjA.sort((f1, f2) =>
                        a.outwards.dot(f2.outwards) - a.outwards.dot(f1.outwards))[0]
                    const intervalRole = IntervalRole.PullAA
                    const scale = found.scale
                    const pair: IPair = {alpha: a.end, omega: b.end, scale, intervalRole}
                    addPair(pair)
                })
            })
    })
    return pairs
}
