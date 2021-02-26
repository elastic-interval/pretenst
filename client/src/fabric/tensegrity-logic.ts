import { IntervalRole } from "./eig-util"
import { Tensegrity } from "./tensegrity"
import {
    acrossPush,
    filterRole,
    IInterval,
    IJoint, intervalKey,
    IPercent,
    jointPulls,
    otherJoint,
    pairKey,
} from "./tensegrity-types"

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
    const roleSwap = (role: IntervalRole) => {
        switch (role) {
            case IntervalRole.PullA:
                return IntervalRole.PullAA
            case IntervalRole.PullB:
                return IntervalRole.PullBB
            default:
                throw new Error("bad role")
        }
    }
    const nextPair = (near: IJoint): IPair | undefined => {
        const pullB = jointPulls(near).filter(onlyB)[0]
        const far = otherJoint(near, pullB)
        const otherFar = acrossPush(near)
        const otherB = jointPulls(otherFar).filter(onlyB)[0]
        const otherNear = otherJoint(otherFar, otherB)
        const newNear = common(near, otherNear)
        const newFar = common(far, otherFar)
        if (!newNear || !newFar) {
            return undefined
        }
        const alpha = newNear.push ? newNear : near
        const omega = newFar.push ? newFar : far
        const scale = pullB.scale
        const intervalRole = roleSwap(pullB.intervalRole)
        return {alpha, omega, scale, intervalRole}
    }
    tensegrity.withPulls(pairMap => {
        const addPair = (joint: IJoint) => {
            const pair = nextPair(joint)
            if (pair) {
                const key = pairKey(pair)
                const exists = pairMap[key]
                if (!exists) {
                    pairs.push(pair)
                    pairMap[key] = pair
                }
            }
        }
        tensegrity.intervals
            .filter(filterRole(IntervalRole.PullB))
            .forEach(({alpha, omega}) => {
                addPair(alpha)
                addPair(omega)
            })
        const a3 = tensegrity.joints
            .filter(joint => joint.push && jointPulls(joint).filter(onlyA).length === 3)
            .map(joint => {
                const found = jointPulls(joint).filter(onlyA)
                    .find(interval => !otherJoint(joint, interval).push)
                if (!found) {
                    throw new Error("no 3-0 PullA found")
                }
                return found
            })
        console.log("a3", a3.map(intervalKey))
    })
    return pairs
}
