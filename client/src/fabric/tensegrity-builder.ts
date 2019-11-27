/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IntervalRole } from "./fabric-engine"
import { roleDefaultLength } from "./fabric-state"
import {
    averageLocation,
    averageScaleFactor,
    factorToPercent,
    getOrderedJoints,
    IBrick,
    IFace,
    IFacePull,
    IInterval,
    IJoint,
    initialBrick,
    IPercent,
    IPushDefinition,
    IRing,
    IRingJoint,
    opposite,
    percentToFactor,
    PUSH_ARRAY,
    PushEnd,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-brick-types"
import { TensegrityFabric } from "./tensegrity-fabric"

const COUNTDOWN = 300

export function scaleToFacePullLength(scaleFactor: number): number {
    return 0.6 * scaleFactor
}

export class TensegrityBuilder {

    private faceMarks: Record<number, IFace[]> = {}

    constructor(public readonly fabric: TensegrityFabric) {
    }

    public get markFace(): (mark: number, face: IFace) => void {
        return (mark: number, face: IFace) => {
            const found = this.faceMarks[mark]
            if (found) {
                found.push(face)
            } else {
                this.faceMarks[mark] = [face]
            }
        }
    }

    public createBrickAt(midpoint: Vector3, scale: IPercent): IBrick {
        const points = this.createBrickPointsAt(Triangle.PPP, scale, midpoint)
        return this.createBrick(points, Triangle.NNN, scale)
    }

    public createConnectedBrick(brickA: IBrick, triangle: Triangle, scale: IPercent): IBrick {
        const faceA = brickA.faces[triangle]
        const scaleA = percentToFactor(brickA.scale)
        const scaleB = scaleA * percentToFactor(scale)
        const brickB = this.createBrickOnFace(faceA, factorToPercent(scaleB))
        const faceB = brickB.faces[brickB.base]
        const connector = this.connectFaces(faceA, faceB, factorToPercent((scaleA + scaleB) / 2), COUNTDOWN)
        if (!connector) {
            console.error("Cannot connect!")
        }
        return brickB
    }

    public turnUpright(): void {
        const markedFace = this.faceMarkLists.find(list => list.length === 1)
        if (!markedFace) {
            return
        }
        this.uprightAtOrigin(markedFace[0])
    }

    public checkFacePulls(facePulls: IFacePull[]): IFacePull[] | undefined {
        if (facePulls.length === 0) {
            return
        }
        const instance = this.fabric.instance
        const newPairs = facePulls.filter(facePull => {
            const {alpha, omega, scaleFactor} = facePull
            const distance = instance.faceMidpoint(alpha.index).distanceTo(instance.faceMidpoint(omega.index))
            if (distance > scaleToFacePullLength(scaleFactor) * 10) {
                return true
            }
            this.fabric.removeFacePull(facePull)
            if (!this.connectFaces(alpha, omega, factorToPercent(scaleFactor), COUNTDOWN)) {
                console.log("Unable to connect")
            }
            return false
        })
        return newPairs.length === facePulls.length ? undefined : newPairs
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
        pairs.forEach(({scale, a, x, b, y}: IPair) => {
            fabric.createInterval(x, y, IntervalRole.BowMid, scale, COUNTDOWN)
            const ax = fabric.findInterval(a, x)
            const ay = fabric.findInterval(a, y)
            const bx = fabric.findInterval(b, x)
            const by = fabric.findInterval(b, y)
            if (!(ax && bx && ay && by)) {
                throw new Error("Cannot find intervals during optimize")
            }
            fabric.removeInterval(ax)
            fabric.removeInterval(by)
            const role = IntervalRole.BowEnd
            engine.setIntervalRole(ay.index, ay.intervalRole = role)
            engine.changeRestLength(ay.index, percentToFactor(ay.scale) * roleDefaultLength(fabric.featureValues, role), COUNTDOWN)
            engine.setIntervalRole(bx.index, bx.intervalRole = role)
            engine.changeRestLength(bx.index, percentToFactor(bx.scale) * roleDefaultLength(fabric.featureValues, role), COUNTDOWN)
        })
        instance.forgetDimensions()
    }

    public uprightAtOrigin(face: IFace): void {
        const matrix = this.faceToOrigin(face)
        this.fabric.instance.apply(matrix)
    }

    public get initialFacePulls(): IFacePull[] {
        return this.faceMarkLists
            .filter(list => list.length === 2 || list.length === 3)
            .reduce((list: IFacePull[], faceList: IFace[]) => [...list, ...this.createFacePulls(faceList)], [])
    }

    public createFacePulls(faces: IFace[]): IFacePull[] {
        const instance = this.fabric.instance
        const centerBrickFacePulls = () => {
            const brick = this.createBrickAt(
                averageLocation(faces.map(face => instance.faceMidpoint(face.index))),
                factorToPercent(averageScaleFactor(faces)),
            )
            this.fabric.iterate(0)
            const closestTo = (face: IFace) => {
                const faceLocation = instance.faceMidpoint(face.index)
                const opposingFaces = brick.faces.filter(({negative}) => negative !== face.negative)
                return opposingFaces.reduce((a, b) => {
                    const aa = instance.faceMidpoint(a.index).distanceTo(faceLocation)
                    const bb = instance.faceMidpoint(b.index).distanceTo(faceLocation)
                    return aa < bb ? a : b
                })
            }
            return faces.map(face => this.fabric.createFacePull(closestTo(face), face))
        }
        switch (faces.length) {
            case 2:
                if (faces[0].negative === faces[1].negative) {
                    return centerBrickFacePulls()
                }
                return [this.fabric.createFacePull(faces[0], faces[1])]
            case 3:
                return centerBrickFacePulls()
            default:
                return []
        }
    }

    private get faceMarkLists(): IFace[][] {
        return Object.keys(this.faceMarks).map(key => this.faceMarks[key])
    }

    private createBrickOnFace(face: IFace, scale: IPercent): IBrick {
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
        const points = this.createBrickPointsAt(base, scale, new Vector3()) // todo: maybe raise it
        const movedToFace = points.map(p => p.applyMatrix4(xform))
        const baseTriangle = negativeFace ? Triangle.PPP : Triangle.NNN
        return this.createBrick(movedToFace, baseTriangle, scale)
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
            brick.pushes.push(this.fabric.createInterval(alpha, omega, role, scale, COUNTDOWN))
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
                const interval = this.fabric.createInterval(alpha, omega, role, scale, COUNTDOWN)
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

    private createBrickPointsAt(base: Triangle, scale: IPercent, position: Vector3): Vector3 [] {
        const pushesToPoints = (vectors: Vector3[], push: IPushDefinition): Vector3[] => {
            vectors.push(new Vector3().add(push.alpha))
            vectors.push(new Vector3().add(push.omega))
            return vectors
        }
        const points = PUSH_ARRAY.reduce(pushesToPoints, [])
        const newBase = opposite(base)
        const trianglePoints = TRIANGLE_DEFINITIONS[newBase].pushEnds.map((end: PushEnd) => points[end]).reverse()
        const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
        const x = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
        const y = new Vector3().sub(midpoint).normalize()
        const z = new Vector3().crossVectors(y, x).normalize()
        const basis = new Matrix4().makeBasis(x, y, z)
        const scaleFactor = percentToFactor(scale)
        const fromBasis = new Matrix4()
            .getInverse(basis)
            .setPosition(position)
            .scale(new Vector3(scaleFactor, scaleFactor, scaleFactor))
        return points.map(p => p.applyMatrix4(fromBasis))
    }

    private faceToOrigin(face: IFace): Matrix4 {
        this.fabric.iterate(0)
        const trianglePoints = face.joints.map(joint => this.fabric.instance.location(joint.index))
        const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
        const x = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
        const z = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
        const y = new Vector3().crossVectors(z, x).normalize()
        z.crossVectors(x, y).normalize()
        const basis = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
        return new Matrix4().getInverse(basis)
    }

    private connectFaces(faceA: IFace, faceB: IFace, connectorScale: IPercent, countdown: number): boolean {
        if (faceA.negative === faceB.negative) {
            throw new Error("Same polarity!")
        }
        const ring = this.facesToRing(faceA, faceB)
        if (!ring) {
            return false
        }
        const joints = ring.joints
        const ringLength = joints.length
        const createRingPull = (index: number) => {
            const role = IntervalRole.Ring
            const joint = joints[index]
            const nextJoint = joints[(index + 1) % ringLength]
            this.fabric.createInterval(joint, nextJoint, role, connectorScale, countdown)
        }
        const createCrossPull = (index: number) => {
            const role = IntervalRole.Cross
            const current = joints[index]
            if (!ring.matchesA) {
                const next = joints[(index + 1) % ringLength]
                const partnerJoint = this.fabric.joints[next.oppositeIndex]
                this.fabric.createInterval(current, partnerJoint, role, connectorScale, countdown)
            } else {
                const prev = joints[(index + ringLength - 1) % joints.length]
                const partnerJoint = this.fabric.joints[prev.oppositeIndex]
                this.fabric.createInterval(current, partnerJoint, role, connectorScale, countdown)
            }
        }
        for (let walk = 0; walk < ringLength; walk++) {
            createRingPull(walk)
            createCrossPull(walk)
        }
        const handleFace = (faceToRemove: IFace): void => {
            const triangle = faceToRemove.triangle
            const brick = faceToRemove.brick
            TRIANGLE_DEFINITIONS.filter(t => t.opposite !== triangle && t.negative !== TRIANGLE_DEFINITIONS[triangle].negative).forEach(t => {
                brick.faces[t.name].canGrow = false
            })
            const triangleRing = TRIANGLE_DEFINITIONS[triangle].ring
            const engine = this.fabric.instance.engine
            const scaleFactor = percentToFactor(connectorScale)
            brick.rings[triangleRing].filter(interval => !interval.removed).forEach(interval => {
                engine.setIntervalRole(interval.index, interval.intervalRole = IntervalRole.Ring)
                const length = scaleFactor * roleDefaultLength(this.fabric.featureValues, interval.intervalRole)
                engine.changeRestLength(interval.index, length, countdown)
            })
            this.fabric.removeFace(faceToRemove, true)
        }
        handleFace(faceA)
        handleFace(faceB)
        this.fabric.instance.forgetDimensions()
        return true
    }

    private nineJointPairsByProximity(faceA: IFace, faceB: IFace): IJointPair[] {
        const ninePairs: IJointPair[] = []
        const instance = this.fabric.instance
        faceA.joints.forEach(jointA => {
            faceB.joints.forEach(jointB => {
                const locationA = instance.location(jointA.index)
                const locationB = instance.location(jointB.index)
                const distance = locationA.distanceTo(locationB)
                ninePairs.push({jointA, jointB, distance})
            })
        })
        return ninePairs.sort((a, b) => a.distance - b.distance)
    }

    private sameOrientation(ring: IRingJoint[], face: IFace): boolean {
        const firstIndex = ring.findIndex(ringJoint => face.joints.some(fj => fj.index === ringJoint.joint.index))
        if (firstIndex < 0) {
            throw new Error()
        }
        const first = ring[firstIndex]
        const next = ring[firstIndex + 2]
        const faceJoints = getOrderedJoints(face)
        const faceFirst = faceJoints.findIndex(j => j.index === first.joint.index)
        const faceNext = faceJoints.findIndex(j => j.index === next.joint.index)
        return (faceFirst + 1) % 3 === faceNext
    }

    private facesToRing(faceA: IFace, faceB: IFace): IRing | undefined {
        const ninePairs = this.nineJointPairsByProximity(faceA, faceB)
        const closest = ninePairs.shift()
        if (!closest) {
            throw new Error()
        }
        let ring: IRingJoint[] = [
            {joint: closest.jointA, fromA: true},
            {joint: closest.jointB, fromA: false},
        ]
        let beforeMatchA = true
        let afterMatchB = true
        while (ring.length < 6) {
            const findClose = (joint: IJoint, findA: boolean): { index: number, jointToAdd: IJoint } | undefined => {
                const index = ninePairs.findIndex(p => {
                    const goingToAdd = findA ? p.jointB : p.jointA
                    if (ring.some(ringJoint => ringJoint.joint.index === goingToAdd.index)) {
                        return false
                    }
                    return joint.index === (findA ? p.jointA.index : p.jointB.index)
                })
                if (index < 0) {
                    return undefined
                }
                const closePair = ninePairs[index]
                const jointToAdd = findA ? closePair.jointB : closePair.jointA
                return {index, jointToAdd}
            }
            const beforeEnd = ring[0]
            const foundBefore = findClose(beforeEnd.joint, beforeMatchA)
            const afterEnd = ring[ring.length - 1]
            const foundAfter = findClose(afterEnd.joint, !afterMatchB)
            if (!foundBefore || !foundAfter) {
                console.log("Unable to form a ring", ring.length, ninePairs.length)
                return undefined
            }
            const before = ninePairs[foundBefore.index]
            const after = ninePairs[foundAfter.index]
            if (before.distance < after.distance) {
                const ringJoint = {joint: foundBefore.jointToAdd, fromA: !beforeMatchA}
                ring = [ringJoint, ...ring]
                ninePairs.splice(foundBefore.index, 1)
                beforeMatchA = !beforeMatchA
            } else {
                const ringJoint = {joint: foundAfter.jointToAdd, fromA: afterMatchB}
                ring = [...ring, ringJoint]
                ninePairs.splice(foundAfter.index, 1)
                afterMatchB = !afterMatchB
            }
        }
        const matchesA = this.sameOrientation(ring, faceA)
        const matchesB = this.sameOrientation(ring, faceB)
        const joints = ring.map(rj => rj.joint)
        return {faceA, matchesA, faceB, matchesB, joints}
    }
}

interface IJointPair {
    jointA: IJoint
    jointB: IJoint
    distance: number
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
