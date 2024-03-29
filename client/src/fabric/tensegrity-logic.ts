import { Stage } from "eig"
import { Matrix4, Vector3 } from "three"

import { basisFromVector, midpoint, pointsToNormal } from "./eig-util"
import { AGE_POST_GROWTH, IJob, PairSelection, PostGrowthOp, Tensegrity, ToDo } from "./tensegrity"
import {
    acrossPush,
    areAdjacent,
    IInterval,
    IJoint,
    intervalJoins,
    IPair,
    IRole,
    jointPulls,
    otherJoint,
    pairKey,
    percentOrHundred,
} from "./tensegrity-types"
import { removeFace } from "./twist-logic"

export interface IConflict {
    jointA: IJoint
    jointB: IJoint
}

const PULL_AA: IRole = {
    tag: "(aa)",
    push: false,
    length: 0.5,
    stiffness: 0.4,
}

const PULL_CONFLICT: IRole = {
    tag: "conflict",
    push: false,
    length: 0.01,
    stiffness: 1,
}

const CONFLICT_MULTIPLE = 6

function filterRole(targetRole: IRole): (interval: IInterval) => boolean {
    return ({role}) => targetRole.tag === role.tag
}

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

export function snelsonPairs(tensegrity: Tensegrity, pullARole: IRole, pullBRole: IRole): IPair[] {
    const pairs: IPair[] = []
    const snelsonPair = (alpha: IJoint, pullB: IInterval): IPair | undefined => {
        const a = acrossPush(alpha)
        const b = otherJoint(alpha, pullB)
        if (!a.push || !b.push) {
            return undefined
        }
        const acrossA = jointPulls(a).filter(filterRole(pullARole)).map(pullA => otherJoint(a, pullA))
        const acrossB = jointPulls(b).filter(filterRole(pullARole)).map(pullA => otherJoint(b, pullA))
        const omega = acrossA.find(jointA => !!acrossB.find(jointB => jointA.index === jointB.index))
        if (!omega || !omega.push) {
            return undefined
        }
        const role = pullBRole
        const scale = pullB.scale
        return {alpha, omega, role, scale}
    }
    tensegrity.withPulls(pairMap => {
        const pullBs = tensegrity.intervals.filter(filterRole(pullBRole))
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

export function bowtiePairs(tensegrity: Tensegrity, pullARole: IRole, pullBRole: IRole): IPair[] {
    const pairs: IPair[] = []
    const onlyA = filterRole(pullARole)
    const onlyB = filterRole(pullBRole)
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
        const role = !commonNear.push || !commonFar.push ? pullBRole : pullARole
        return {alpha, omega, scale, role}
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
            .filter(filterRole(pullBRole))
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
                    const role = PULL_AA
                    const scale = found.scale
                    const pair: IPair = {alpha: a.end, omega: b.end, scale, role}
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
                const zeroFaces = tensegrity.faces.filter(({markNumbers}) => markNumbers.find((n) => n._ === 0))
                if (zeroFaces.length === 0) {
                    throw new Error("No faces marked zero")
                }
                const instance = tensegrity.instance
                const position = zeroFaces
                    .reduce((v, {ends}) =>
                        v.add(midpoint(ends.map(end => instance.jointLocation(end)))), new Vector3())
                    .multiplyScalar(1 / zeroFaces.length)
                const upwards = zeroFaces
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
                    tensegrity.createInterval(jointA, jointB, PULL_CONFLICT, percentOrHundred())
                })
            })
        case "pretensing":
            return job(tensegrity => {
                tensegrity.stage = Stage.Slack
                tensegrity.stage = Stage.Pretensing
            })
        case "remove-faces":
            return job(tensegrity => {
                tensegrity.faces.forEach(face => removeFace(face, tensegrity))
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
