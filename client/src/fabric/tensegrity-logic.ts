import { Stage } from "eig"
import { Matrix4, Vector3 } from "three"

import { basisFromVector, IntervalRole, midpoint, pointsToNormal } from "./eig-util"
import { AGE_POST_GROWTH, IJob, PairSelection, PostGrowthOp, Tensegrity, ToDo } from "./tensegrity"
import {
    acrossPush,
    areAdjacent,
    filterRole,
    IInterval,
    IJoint, intervalJoins,
    IPercent,
    jointPulls,
    otherJoint,
    pairKey,
    percentOrHundred,
} from "./tensegrity-types"

export interface IConflict {
    jointA: IJoint
    jointB: IJoint
}

const CONFLICT_MULTIPLE = 6

export function findConflicts(tensegrity: Tensegrity): IConflict[] {
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

export function namedJob(name: string, age: number): IJob {
    const job = (todo: ToDo): IJob => ({age, todo})
    switch (name) {
        case "orient-0":
            return job(tensegrity => {
                const faces = tensegrity.faces.filter(({markNumbers}) => markNumbers.find((n) => n._ === 0))
                if (faces.length === 0) {
                    throw new Error("No faces marked zero")
                }
                const instance = tensegrity.instance
                const position = faces
                    .reduce((v, {ends}) =>
                        v.add(midpoint(ends.map(end => instance.jointLocation(end)))), new Vector3())
                    .multiplyScalar(1 / faces.length)
                const upwards = faces
                    .reduce((v, {ends}) =>
                        v.sub(pointsToNormal(ends.map(end => instance.jointLocation(end)))), new Vector3())
                    .normalize()
                const {b1, up, b2} = basisFromVector(upwards)
                tensegrity.instance.apply(new Matrix4().makeBasis(b1, up, b2).setPosition(position).invert())
                tensegrity.fabric.set_altitude(5)
            })
        case "conflict":
            return job(tensegrity => {
                findConflicts(tensegrity).forEach(({jointA, jointB}) => {
                    tensegrity.createInterval(jointA, jointB, IntervalRole.Conflict, percentOrHundred())
                })
            })
        case "pretensing":
            return job(tensegrity => {
                tensegrity.stage = Stage.Slack
                tensegrity.stage = Stage.Pretensing
            })
        case "age":
            return job(t => {
                console.log(`age exceeds ${t.name} @ ${age}`, t.fabric.age)
            })
        default:
            throw new Error(`No job named ${name}`)
    }
}

export function postGrowthJob(postGrowthOp: PostGrowthOp): IJob {
    const age = AGE_POST_GROWTH
    const job = (todo: ToDo): IJob => ({age, todo})
    switch (postGrowthOp) {
        case PostGrowthOp.Faces:
            return job(tensegrity => {
                tensegrity.triangleFaces()
            })
        case PostGrowthOp.Snelson:
            return job(tensegrity => {
                tensegrity.createPulls(PairSelection.Snelson)
                tensegrity.triangleFaces()
            })
        case PostGrowthOp.Bowtie:
            return job(tensegrity => {
                tensegrity.createPulls(PairSelection.Bowtie)
            })
        case PostGrowthOp.BowtieFaces:
            return job(tensegrity => {
                tensegrity.createPulls(PairSelection.Bowtie)
                tensegrity.triangleFaces()
            })
        default:
            return job(() => {
            })
    }
}

export function isAdjacent(targetInterval: IInterval): (interval: IInterval) => boolean {
    return (interval: IInterval) => areAdjacent(targetInterval, interval)
}
