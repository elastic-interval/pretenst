/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IntervalRole } from "./fabric-engine"
import { roleDefaultLength } from "./fabric-features"
import {
    factorToPercent,
    IBrick,
    IConnector,
    IFace,
    IInterval,
    IJoint, initialBrick,
    IPercent,
    IPushDefinition,
    percentToFactor,
    PUSH_ARRAY,
    PushEnd,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-brick-types"
import { TensegrityFabric } from "./tensegrity-fabric"

const SNUGGLE_BRICKS = 0.9

export class TensegrityBuilder {
    constructor(public readonly fabric: TensegrityFabric) {
    }

    public createBrickOnOrigin(scale: IPercent): IBrick {
        const points = this.createBrickPointsOnOrigin(Triangle.PPP, scale)
        return this.createBrick(points, Triangle.NNN, scale)
    }

    public createConnectedBrick(brick: IBrick, triangle: Triangle, scale: IPercent): IBrick {
        const face = brick.faces[triangle]
        const scaleFactor = percentToFactor(scale)
        const existingScale = percentToFactor(brick.scale)
        const brickScale = factorToPercent(scaleFactor * existingScale)
        const next = this.createBrickOnFace(face, brickScale)
        const connector = this.connectBricks(face, next.faces[next.base], brickScale)
        connector.facesToRemove.forEach(faceToRemove => this.fabric.removeFace(faceToRemove, true))
        return next
    }

    public createBrickOnFace(face: IFace, scale: IPercent): IBrick {
        const negativeFace = TRIANGLE_DEFINITIONS[face.triangle].negative
        const brick = face.brick
        const triangle = face.triangle
        const trianglePoints = brick.faces[triangle].joints.map(joint => this.fabric.instance.location(joint.index))
        const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
        const midSide = new Vector3().addVectors(trianglePoints[0], trianglePoints[1]).multiplyScalar(0.5)
        const x = new Vector3().subVectors(midSide, midpoint).normalize()
        const u = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
        const proj = new Vector3().add(x).multiplyScalar(x.dot(u))
        const z = u.sub(proj).normalize()
        const y = new Vector3().crossVectors(z, x).normalize()
        const xform = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
        const base = negativeFace ? Triangle.NNN : Triangle.PPP
        const points = this.createBrickPointsOnOrigin(base, scale)
        const movedToFace = points.map(p => p.applyMatrix4(xform))
        const baseTriangle = negativeFace ? Triangle.PPP : Triangle.NNN
        return this.createBrick(movedToFace, baseTriangle, scale)
    }

    public optimize(): void {
        const fabric = this.fabric
        const instance = fabric.instance
        const pairs: IPair[] = []
        const findPush = (jointIndex: number): IPush => {
            const interval = fabric.intervals
                .filter(i => i.isPush)
                .find(i => i.alpha.index === jointIndex || i.omega.index === jointIndex)
            if (!interval) {
                throw new Error(`Cannot find ${jointIndex}`)
            }
            const joint: IJoint = interval.alpha.index === jointIndex ? interval.alpha : interval.omega
            return {interval, joint}
        }
        const crossPulls = fabric.intervals.filter(interval => interval.intervalRole === IntervalRole.Cross)
        crossPulls.forEach((intervalA, indexA) => {
            const aAlpha = intervalA.alpha.index
            const aOmega = intervalA.omega.index
            const aAlphaPush = findPush(aAlpha)
            const aOmegaPush = findPush(aOmega)
            const aAlphaLoc = instance.location(aAlpha)
            const aOmegaLoc = instance.location(aOmega)
            const aLength = aAlphaLoc.distanceTo(aOmegaLoc)
            const aMid = new Vector3().addVectors(aAlphaLoc, aOmegaLoc).multiplyScalar(0.5)
            crossPulls.forEach((intervalB, indexB) => {
                const bAlpha = intervalB.alpha.index
                const bOmega = intervalB.omega.index
                if (indexA >= indexB || aAlpha === bAlpha || aAlpha === bOmega || aOmega === bAlpha || aOmega === bOmega) {
                    return
                }
                const bAlphaPush = findPush(bAlpha)
                const bOmegaPush = findPush(bOmega)
                let push: IInterval | undefined
                let a: IJoint | undefined
                let x: IJoint | undefined
                let b: IJoint | undefined
                let y: IJoint | undefined
                const samePush = (pushA: IPush, pushB: IPush) => pushA.interval.index === pushB.interval.index
                if (samePush(aAlphaPush, bAlphaPush)) {
                    push = aAlphaPush.interval
                    a = intervalA.alpha
                    x = intervalA.omega
                    b = intervalB.alpha
                    y = intervalB.omega
                } else if (samePush(aAlphaPush, bOmegaPush)) {
                    push = aAlphaPush.interval
                    a = intervalA.alpha
                    x = intervalA.omega
                    b = intervalB.omega
                    y = intervalB.alpha
                } else if (samePush(aOmegaPush, bAlphaPush)) {
                    push = aOmegaPush.interval
                    a = intervalA.omega
                    x = intervalA.alpha
                    b = intervalB.alpha
                    y = intervalB.omega
                } else if (samePush(aOmegaPush, bOmegaPush)) {
                    push = aOmegaPush.interval
                    a = intervalA.omega
                    x = intervalA.alpha
                    b = intervalB.omega
                    y = intervalB.alpha
                } else {
                    return
                }
                const bAlphaLoc = instance.location(bAlpha)
                const bOmegaLoc = instance.location(bOmega)
                const bLength = bAlphaLoc.distanceTo(bOmegaLoc)
                const bMid = new Vector3().addVectors(bAlphaLoc, bOmegaLoc).multiplyScalar(0.5)
                const aAlphaMidB = aAlphaLoc.distanceTo(bMid) / bLength
                const aOmegaMidB = aOmegaLoc.distanceTo(bMid) / bLength
                const bAlphaMidA = bAlphaLoc.distanceTo(aMid) / aLength
                const bOmegaMidA = bOmegaLoc.distanceTo(aMid) / aLength
                let closeCount = 0
                const close = (dist: number) => {
                    if (dist < 0.5) {
                        closeCount++
                    }
                }
                close(aAlphaMidB)
                close(aOmegaMidB)
                close(bAlphaMidA)
                close(bOmegaMidA)
                if (closeCount < 2) {
                    return
                }
                const scale = push.scale
                pairs.push({scale, a, x, b, y})
            })
        })
        const engine = instance.engine
        const role = IntervalRole.BowEnd
        pairs.forEach(({scale, a, x, b, y}: IPair) => {
            fabric.createInterval(x, y, IntervalRole.BowMid, scale)
            const ax = fabric.findInterval(a, x)
            const ay = fabric.findInterval(a, y)
            const bx = fabric.findInterval(b, x)
            const by = fabric.findInterval(b, y)
            if (!(ax && bx && ay && by)) {
                throw new Error("Cannot find intervals during optimize")
            }
            fabric.removeInterval(ax)
            fabric.removeInterval(by)
            engine.setIntervalRole(ay.index, ay.intervalRole = role)
            engine.changeRestLength(ay.index, percentToFactor(ay.scale) * roleDefaultLength(role))
            engine.setIntervalRole(bx.index, bx.intervalRole = role)
            engine.changeRestLength(bx.index, percentToFactor(bx.scale) * roleDefaultLength(role))
        })
        instance.forgetDimensions()
    }

    private createBrick(points: Vector3[], base: Triangle, scale: IPercent): IBrick {
        const brick = initialBrick(this.fabric.bricks.length, base, scale)
        this.fabric.bricks.push(brick)
        const jointIndexes = points.map((p, idx) => this.fabric.createJointIndex(idx, p))
        PUSH_ARRAY.forEach(({}: IPushDefinition, idx: number) => {
            const role = IntervalRole.Push
            const alphaIndex = jointIndexes[idx * 2]
            const omegaIndex = jointIndexes[idx * 2 + 1]
            const alpha: IJoint = {index: alphaIndex, oppositeIndex: omegaIndex}
            const omega: IJoint = {index: omegaIndex, oppositeIndex: alphaIndex}
            brick.pushes.push(this.fabric.createInterval(alpha, omega, role, scale))
        })
        brick.pushes.forEach(push => brick.joints.push(push.alpha, push.omega))
        const joints = brick.pushes.reduce((arr: IJoint[], push) => {
            arr.push(push.alpha, push.omega)
            return arr
        }, [])
        this.fabric.joints.push(...joints)
        TRIANGLE_DEFINITIONS.forEach(triangle => {
            const tJoints = triangle.pushEnds.map(end => joints[end])
            for (let walk = 0; walk < 3; walk++) {
                const role = IntervalRole.Triangle
                const alpha = tJoints[walk]
                const omega = tJoints[(walk + 1) % 3]
                const interval = this.fabric.createInterval(alpha, omega, role, scale)
                brick.pulls.push(interval)
                brick.rings[triangle.ringMember[walk]].push(interval)
            }
        })
        TRIANGLE_DEFINITIONS.forEach(triangle => {
            const face = this.fabric.createFace(brick, triangle.name)
            brick.faces.push(face)
        })
        this.fabric.instance.forgetDimensions()
        return brick
    }

    private createBrickPointsOnOrigin(base: Triangle, scale: IPercent): Vector3 [] {
        const pushesToPoints = (vectors: Vector3[], push: IPushDefinition): Vector3[] => {
            vectors.push(new Vector3().add(push.alpha))
            vectors.push(new Vector3().add(push.omega))
            return vectors
        }
        const points = PUSH_ARRAY.reduce(pushesToPoints, [])
        const newBase = TRIANGLE_DEFINITIONS[base].opposite
        const trianglePoints = TRIANGLE_DEFINITIONS[newBase].pushEnds.map((end: PushEnd) => points[end]).reverse()
        const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
        const x = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
        const y = new Vector3().sub(midpoint).normalize()
        const z = new Vector3().crossVectors(y, x).normalize()
        const basis = new Matrix4().makeBasis(x, y, z)
        const scaleFactor = percentToFactor(scale)
        const fromBasis = new Matrix4()
            .getInverse(basis)
            .setPosition(new Vector3(0, midpoint.length() * scaleFactor * SNUGGLE_BRICKS, 0))
            .scale(new Vector3(scaleFactor, scaleFactor, scaleFactor))
        return points.map(p => p.applyMatrix4(fromBasis))
    }

    private connectBricks(faceA: IFace, faceB: IFace, scale: IPercent): IConnector {
        const ring = facesToRing(this.fabric, faceA, faceB)
        const pulls: IInterval[] = []
        const createRingPull = (index: number) => {
            const role = IntervalRole.Ring
            const joint = ring[index]
            const nextJoint = ring[(index + 1) % ring.length]
            const ringPull = this.fabric.createInterval(joint, nextJoint, role, scale)
            pulls.push(ringPull)
        }
        const createCrossPull = (index: number) => {
            const role = IntervalRole.Cross
            const joint = ring[index]
            const nextJoint = ring[(index + 1) % ring.length]
            const prevJoint = ring[(index + ring.length - 1) % ring.length]
            const prevJointOppositeLocation = this.fabric.instance.location(prevJoint.oppositeIndex)
            const jointLocation = this.fabric.instance.location(joint.index)
            const nextJointOppositeLocation = this.fabric.instance.location(nextJoint.oppositeIndex)
            const prevOpposite = jointLocation.distanceTo(prevJointOppositeLocation)
            const nextOpposite = jointLocation.distanceTo(nextJointOppositeLocation)
            const partnerJoint = this.fabric.joints[(prevOpposite < nextOpposite) ? prevJoint.oppositeIndex : nextJoint.oppositeIndex]
            const crossPull = this.fabric.createInterval(joint, partnerJoint, role, scale)
            pulls.push(crossPull)
        }
        for (let walk = 0; walk < ring.length; walk++) {
            createRingPull(walk)
            createCrossPull(walk)
        }
        const handleFace = (faceToRemove: IFace): IFace => {
            const triangle = faceToRemove.triangle
            const brick = faceToRemove.brick
            const face = brick.faces[triangle]
            TRIANGLE_DEFINITIONS.filter(t => t.opposite !== triangle && t.negative !== TRIANGLE_DEFINITIONS[triangle].negative).forEach(t => {
                brick.faces[t.name].canGrow = false
            })
            const triangleRing = TRIANGLE_DEFINITIONS[triangle].ring
            const engine = this.fabric.instance.engine
            const scaleFactor = percentToFactor(scale)
            brick.rings[triangleRing].filter(interval => !interval.removed).forEach(interval => {
                engine.setIntervalRole(interval.index, interval.intervalRole = IntervalRole.Ring)
                const length = scaleFactor * roleDefaultLength(interval.intervalRole)
                engine.changeRestLength(interval.index, length)
            })
            return face
        }
        this.fabric.instance.forgetDimensions()
        return {
            pulls,
            facesToRemove: [
                handleFace(faceA),
                handleFace(faceB),
            ],
        }
    }
}

interface IJointPair {
    jointA: IJoint
    locationA: Vector3
    jointB: IJoint
    locationB: Vector3
    distance: number
}

function facesToRing(fabric: TensegrityFabric, faceA: IFace, faceB: IFace): IJoint[] {
    const jointsA: IJoint[] = TRIANGLE_DEFINITIONS[faceA.triangle].pushEnds.map(end => faceA.brick.joints[end])
    const jointsB: IJoint[] = TRIANGLE_DEFINITIONS[faceB.triangle].pushEnds.map(end => faceB.brick.joints[end])
    const jointPairs: IJointPair[] = []
    jointsA.forEach(jointA => {
        jointsB.forEach(jointB => {
            const locationA = fabric.instance.location(jointA.index)
            const locationB = fabric.instance.location(jointB.index)
            const distance = locationA.distanceTo(locationB)
            jointPairs.push({jointA, locationA, jointB, locationB, distance})
        })
    })
    jointPairs.sort((a, b) => a.distance - b.distance)
    // console.log("jointPairs", jointPairs.map(p => `${p.jointA.index}:${p.jointB.index}=${p.distance}`))
    const ring: IJoint[] = []
    let takeA = true
    let pairIndex = 0
    while (ring.length < 6) {
        const jointPair = jointPairs[pairIndex]
        if (!jointPair) {
            throw new Error()
        }
        jointPairs.splice(pairIndex, 1)
        if (takeA) {
            ring.push(jointPair.jointA)
            pairIndex = jointPairs.findIndex(p => p.jointB === jointPair.jointB)
            takeA = false
        } else {
            ring.push(jointPair.jointB)
            pairIndex = jointPairs.findIndex(p => p.jointA === jointPair.jointA)
            takeA = true
        }
    }
    if (TRIANGLE_DEFINITIONS[faceA.triangle].negative) {
        ring.reverse()
    }
    return ring
}


interface IPair {
    scale: IPercent
    a: IJoint
    x: IJoint
    b: IJoint
    y: IJoint
}

interface IPush {
    interval: IInterval
    joint: IJoint
}


// export interface IFacePair {
//     faceA: IFace
//     locationA: Vector3
//     normalA: Vector3
//     faceB: IFace
//     locationB: Vector3
//     normalB: Vector3
//     distance: number
//     dot: number
// }
//
// export function closestFacePairs(fabric: TensegrityFabric, maxDistance: number): IFacePair[] {
//     const faces = fabric.growthFaces
//     const facePairs: IFacePair[] = []
//     faces.forEach((faceA, indexA) => {
//         faces.forEach((faceB, indexB) => {
//             if (indexB >= indexA) {
//                 return
//             }
//             const locationA = fabric.instance.faceMidpoint(faceA.index)
//             const locationB = fabric.instance.faceMidpoint(faceB.index)
//             const distance = locationA.distanceTo(locationB)
//             if (distance >= maxDistance) {
//                 return
//             }
//             const normalA = fabric.instance.faceNormal(faceA.index)
//             const normalB = fabric.instance.faceNormal(faceB.index)
//             const dot = normalA.dot(normalB)
//             if (dot > -0.2) {
//                 return
//             }
//             facePairs.push({faceA, locationA, normalA, faceB, locationB, normalB, distance, dot})
//         })
//     })
//     facePairs.sort((a, b) => a.distance - b.distance)
//     return facePairs
// }
//
// export function connectClosestFacePair(fabric: TensegrityFabric): void {
//     const closestPairs = closestFacePairs(fabric, 5)
//     const facePair = closestPairs[0]
//     const scale = percentOrHundred() // TODO: figure this out
//     const connector = connectBricks(facePair.faceA, facePair.faceB, scale)
//     connector.facesToRemove.forEach(faceToRemove => fabric.removeFace(faceToRemove, true))
// }

// function createBrickPointsUpright(): Vector3[] {
//     const points = PUSH_ARRAY.reduce(pushesToPoints, [])
//     points.forEach(p => {
//         const xx = p.x
//         p.x = p.z
//         p.y += PHI
//         p.z = xx
//     })
//     return points
// }
