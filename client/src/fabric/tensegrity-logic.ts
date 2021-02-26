import { Vector3 } from "three"

import { IntervalRole, isPushRole } from "./eig-util"
import { Tensegrity } from "./tensegrity"
import {
    acrossPush,
    filterRole,
    IInterval,
    IJoint,
    intervalToPair,
    IPercent,
    jointLocation,
    jointPulls,
    otherJoint,
    pairKey,
    twoJointKey,
} from "./tensegrity-types"

export interface IPair {
    alpha: IJoint
    omega: IJoint
    scale: IPercent
    intervalRole: IntervalRole
}

export function snelsonPairs(tensegrity: Tensegrity): IPair[] {
    const pairs: IPair[] = []
    const snelsonPair = (alpha: IJoint, pullB: IInterval): IPair|undefined => {
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
    tensegrity.withPulls(pairMap => {
        const other = (ourJoint: IJoint, interval: IInterval) => {
            const across = otherJoint(ourJoint, interval)
            const direction = new Vector3().subVectors(jointLocation(across), jointLocation(ourJoint)).normalize()
            const noPush = !across.push
            const joint = noPush ? ourJoint : across
            return {joint, direction, noPush}
        }
        const roleSwap = (role: IntervalRole, noPush: boolean) => {
            switch (role) {
                case IntervalRole.PullA:
                    return IntervalRole.PullAA
                case IntervalRole.PullB:
                    return noPush ? IntervalRole.PullB : IntervalRole.PullBB
                default:
                    throw new Error("bad role")
            }
        }
        tensegrity.intervals
            .filter(({intervalRole}) => !isPushRole(intervalRole))
            .map(intervalToPair)
            .forEach(({alpha, omega, scale, intervalRole}) => {
                jointPulls(alpha).forEach(alphaA => {
                    const alphaX = other(alpha, alphaA)
                    jointPulls(omega).forEach(omegaA => {
                        const omegaX = other(omega, omegaA)
                        const existing = pairMap[twoJointKey(alphaX.joint, omegaX.joint)]
                        if (!existing) {
                            const dot = alphaX.direction.dot(omegaX.direction)
                            if (dot > 0.8) {
                                const pair: IPair = {
                                    alpha: alphaX.joint,
                                    omega: omegaX.joint,
                                    scale,
                                    intervalRole: roleSwap(intervalRole, omegaX.noPush || alphaX.noPush),
                                }
                                pairs.push(pair)
                                pairMap[pairKey(pair)] = pair
                            }
                        }
                    })
                })
            })
    })
    return pairs
}
