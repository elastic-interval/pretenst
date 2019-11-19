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
    IFace,
    IFacePair,
    IInterval,
    IJoint,
    initialBrick,
    IPercent,
    IPushDefinition,
    opposite,
    percentToFactor,
    PUSH_ARRAY,
    PushEnd,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-brick-types"
import { TensegrityFabric } from "./tensegrity-fabric"

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
        const connector = this.connectBricks(faceA, faceB, factorToPercent((scaleA + scaleB) / 2))
        if (!connector) {
            console.error("Cannot connect!")
        }
        return brickB
    }

    public connect(faces: IFace[]): IFacePair[] {
        if (faces.length === 2) {
            return [this.addFacePair(faces[0], faces[1])]
        } else {
            const instance = this.fabric.instance
            const scale = faces.reduce((sum, face) => sum + percentToFactor(face.brick.scale), 0) / 3
            const midpoint = faces.reduce((sum, face) => sum.add(instance.faceMidpoint(face.index)), new Vector3()).multiplyScalar(1 / 3.0)
            const brick = this.createBrickAt(midpoint, factorToPercent(scale))
            this.fabric.iterate(0)
            const top = true
            const closestTo = (face: IFace) => {
                const faceLocation = instance.faceMidpoint(face.index)
                const brickFaces = brick.faces
                const facesToCheck = top ? brickFaces.slice(Triangle.PNN, Triangle.NNP + 1) : brickFaces.slice(Triangle.NPP, Triangle.PPN + 1)
                return facesToCheck.reduce((a, b) => {
                    const aa = instance.faceMidpoint(a.index).distanceTo(faceLocation)
                    const bb = instance.faceMidpoint(b.index).distanceTo(faceLocation)
                    return aa < bb ? a : b
                })
            }
            return faces.map(face => this.addFacePair(closestTo(face), face))
        }
    }

    public get initialPairs(): IFacePair[] {
        return Object.keys(this.faceMarks)
            .map(key => this.faceMarks[key])
            .reduce((pairs: IFacePair[], faceList: IFace[]) => {
                pairs.push(...this.connect(faceList))
                return pairs
            }, [])
            .map((pair: IFacePair) => {
                const findByJoints = (face: IFace): IFace => {
                    this.fabric.faces.find(({index, joints}) => (
                        joints[0].index === face.joints[0].index
                    ))
                    return face
                }
                const faceA = findByJoints(pair.faceA)
                const faceB = findByJoints(pair.faceB)
                const instance = this.fabric.instance
                const distance = instance.faceMidpoint(faceA.index).distanceTo(instance.faceMidpoint(faceB.index))
                return {faceA, faceB, distance}
            })
    }

    public tightenFacePairs(beforePairs: IFacePair[], approach: number): IFacePair[] | undefined {
        const afterPairs = beforePairs.filter(pair => {
            const scaleSum = percentToFactor(pair.faceA.brick.scale) + percentToFactor(pair.faceB.brick.scale)
            const connectorScale = factorToPercent(scaleSum / 2)
            const step = scaleSum * approach
            if (pair.distance - step < 0) {
                if (!this.connectBricks(pair.faceA, pair.faceB, connectorScale)) {
                    console.log("Unable to connect")
                }
                return false
            }
            pair.distance -= step
            return true
        })
        return afterPairs.length === beforePairs.length ? undefined : afterPairs
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

    public orientToOrigin(face: IFace): void {
        const matrix = this.faceToOrigin(face)
        this.fabric.instance.apply(matrix)
    }

    private addFacePair(faceA: IFace, faceB: IFace): IFacePair {
        const instance = this.fabric.instance
        const distance = instance.faceMidpoint(faceA.index).distanceTo(instance.faceMidpoint(faceB.index))
        return {faceA, faceB, distance}
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

    private connectBricks(faceA: IFace, faceB: IFace, connectorScale: IPercent): boolean {
        const ring = this.facesToRing(faceA, faceB)
        if (!ring) {
            return false
        }
        const createRingPull = (index: number) => {
            const role = IntervalRole.Ring
            const joint = ring[index]
            const nextJoint = ring[(index + 1) % ring.length]
            this.fabric.createInterval(joint, nextJoint, role, connectorScale)
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
            this.fabric.createInterval(joint, partnerJoint, role, connectorScale)
        }
        for (let walk = 0; walk < ring.length; walk++) {
            createRingPull(walk)
            createCrossPull(walk)
        }
        const handleFace = (faceToRemove: IFace): void => {
            const triangle = faceToRemove.triangle
            const brick = faceToRemove.brick
            const face = brick.faces[triangle]
            TRIANGLE_DEFINITIONS.filter(t => t.opposite !== triangle && t.negative !== TRIANGLE_DEFINITIONS[triangle].negative).forEach(t => {
                brick.faces[t.name].canGrow = false
            })
            const triangleRing = TRIANGLE_DEFINITIONS[triangle].ring
            const engine = this.fabric.instance.engine
            const scaleFactor = percentToFactor(connectorScale)
            brick.rings[triangleRing].filter(interval => !interval.removed).forEach(interval => {
                engine.setIntervalRole(interval.index, interval.intervalRole = IntervalRole.Ring)
                const length = scaleFactor * roleDefaultLength(interval.intervalRole)
                engine.changeRestLength(interval.index, length)
            })
            this.fabric.removeFace(face, true)
        }
        handleFace(faceA)
        handleFace(faceB)
        this.fabric.instance.forgetDimensions()
        return true
    }

    private facesToRing(faceA: IFace, faceB: IFace): IJoint[] | undefined {
        const defA = TRIANGLE_DEFINITIONS[faceA.triangle]
        const endsA = defA.pushEnds.map(end => faceA.brick.joints[end])
        const jointsA = defA.negative ? endsA.reverse() : endsA
        const defB = TRIANGLE_DEFINITIONS[faceB.triangle]
        const endsB = defB.pushEnds.map(end => faceB.brick.joints[end])
        const jointsB = defA.negative ? endsB.reverse() : endsB
        const ninePairs: IJointPair[] = []
        jointsA.forEach(jointA => {
            jointsB.forEach(jointB => {
                const locationA = this.fabric.instance.location(jointA.index)
                const locationB = this.fabric.instance.location(jointB.index)
                const distance = locationA.distanceTo(locationB)
                ninePairs.push({jointA, jointB, distance})
            })
        })
        ninePairs.sort((a, b) => a.distance - b.distance)
        const closest = ninePairs.shift()
        if (!closest) {
            throw new Error()
        }
        let ring: IJoint[] = [closest.jointA, closest.jointB]
        let beforeMatchA = true
        let afterMatchB = true
        while (ring.length < 6) {
            const findClose = (joint: IJoint, findA: boolean): { index: number, jointToAdd: IJoint } | undefined => {
                const index = ninePairs.findIndex(p => joint.index === (findA ? p.jointA.index : p.jointB.index))
                if (index < 0) {
                    return undefined
                }
                const closePair = ninePairs[index]
                const jointToAdd = findA ? closePair.jointB : closePair.jointA
                return {index, jointToAdd}
            }
            const beforeEnd = ring[0]
            const foundBefore = findClose(beforeEnd, beforeMatchA)
            const afterEnd = ring[ring.length - 1]
            const foundAfter = findClose(afterEnd, !afterMatchB)
            if (!foundBefore || !foundAfter) {
                throw new Error("Before or after not found!")
            }
            const before = ninePairs[foundBefore.index]
            const after = ninePairs[foundAfter.index]
            if (before.distance < after.distance) {
                ring = [foundBefore.jointToAdd, ...ring]
                ninePairs.splice(foundBefore.index, 1)
                beforeMatchA = !beforeMatchA
            } else {
                ring = [...ring, foundAfter.jointToAdd]
                ninePairs.splice(foundAfter.index, 1)
                afterMatchB = !afterMatchB
            }
        }
        return ring
    }
}

interface IJointPair {
    jointA: IJoint,
    jointB: IJoint,
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
