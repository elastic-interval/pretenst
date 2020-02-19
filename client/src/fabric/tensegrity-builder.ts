/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole } from "eig"
import { Matrix4, Vector3 } from "three"

import { TensegrityFabric } from "./tensegrity-fabric"
import {
    averageLocation,
    averageScaleFactor,
    factorToPercent,
    IBrick,
    IFace,
    IFacePull,
    IInterval,
    IJoint,
    initialBrick,
    IPercent,
    IPushDefinition,
    IRing,
    oppositeTriangle,
    percentToFactor,
    PUSH_ARRAY,
    PushEnd,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-types"

export function scaleToFacePullLength(scaleFactor: number): number {
    return 0.6 * scaleFactor
}

export class TensegrityBuilder {

    private faceMarks: Record<number, IFace[]> = {}

    constructor(public readonly fabric: TensegrityFabric, private numericFeature: (fabricFeature: FabricFeature) => number) {
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
        const countdown = this.numericFeature(FabricFeature.IntervalCountdown)
        this.connectFaces(faceA, faceB, factorToPercent((scaleA + scaleB) / 2), countdown)
        return brickB
    }

    public turnUpright(): void {
        const markedFace = this.faceMarkLists.find(list => list.length === 1)
        if (!markedFace) {
            return
        }
        this.uprightAtOrigin(markedFace[0])
    }

    public checkFacePulls(facePulls: IFacePull[], removeFacePull: (facePull: IFacePull) => void): IFacePull[] {
        if (facePulls.length === 0) {
            return facePulls
        }
        const instance = this.fabric.instance
        const connectFacePull = ({alpha, omega, scaleFactor}: IFacePull) => {
            const countdown = this.numericFeature(FabricFeature.IntervalCountdown)
            this.connectFaces(alpha, omega, factorToPercent(scaleFactor), countdown)
        }
        return facePulls.filter(facePull => {
            const {alpha, omega, scaleFactor} = facePull
            const distance = instance.faceMidpoint(alpha.index).distanceTo(instance.faceMidpoint(omega.index))
            const closeEnough = distance <= scaleToFacePullLength(scaleFactor) * 10
            if (closeEnough) {
                connectFacePull(facePull)
                removeFacePull(facePull)
                return false
            }
            return true
        })
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
        const crossPulls = fabric.intervals.filter(interval => (
            interval.intervalRole === IntervalRole.ColumnCross ||
            interval.intervalRole === IntervalRole.NexusCross),
        )
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
        const countdown = this.numericFeature(FabricFeature.IntervalCountdown)
        pairs.forEach(({scale, a, x, b, y}: IPair) => {
            fabric.createInterval(x, y, IntervalRole.BowMid, scale, countdown)
            const ax = fabric.findInterval(a, x)
            const ay = fabric.findInterval(a, y)
            const bx = fabric.findInterval(b, x)
            const by = fabric.findInterval(b, y)
            if (!(ax && bx && ay && by)) {
                throw new Error("Cannot find intervals during optimize")
            }
            fabric.removeInterval(ax)
            fabric.removeInterval(by)
            this.fabric.changeIntervalRole(ay, IntervalRole.BowEnd, scale, countdown)
            this.fabric.changeIntervalRole(bx, IntervalRole.BowEnd, scale, countdown)
        })
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
        this.fabric.instance.refreshFloatView()
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
        const points = this.createBrickPointsAt(base, scale, new Vector3(0, 0, 0)) // todo: maybe raise it
        const movedToFace = points.map(p => p.applyMatrix4(xform))
        const baseTriangle = negativeFace ? Triangle.PPP : Triangle.NNN
        return this.createBrick(movedToFace, baseTriangle, scale)
    }

    private createBrick(points: Vector3[], base: Triangle, scale: IPercent): IBrick {
        const countdown = this.numericFeature(FabricFeature.IntervalCountdown)
        const brick = initialBrick(this.fabric.bricks.length, base, scale)
        this.fabric.bricks.push(brick)
        const jointIndexes = points.map((p, idx) => this.fabric.createJointIndex(p))
        this.fabric.instance.refreshFloatView()
        PUSH_ARRAY.forEach(({}: IPushDefinition, idx: number) => {
            const alphaIndex = jointIndexes[idx * 2]
            const omegaIndex = jointIndexes[idx * 2 + 1]
            const alpha: IJoint = {index: alphaIndex, oppositeIndex: omegaIndex}
            const omega: IJoint = {index: omegaIndex, oppositeIndex: alphaIndex}
            brick.pushes.push(this.fabric.createInterval(alpha, omega, IntervalRole.NexusPush, scale, countdown))
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
                const alpha = tJoints[walk]
                const omega = tJoints[(walk + 1) % 3]
                const interval = this.fabric.createInterval(alpha, omega, IntervalRole.Triangle, scale, countdown)
                brick.pulls.push(interval)
                brick.rings[triangle.ringMember[walk]].push(interval)
            }
        })
        TRIANGLE_DEFINITIONS.forEach(triangle => {
            const face = this.fabric.createFace(brick, triangle.name)
            brick.faces.push(face)
        })
        this.fabric.instance.refreshFloatView()
        return brick
    }

    private createBrickPointsAt(base: Triangle, scale: IPercent, position: Vector3): Vector3 [] {
        const pushesToPoints = (vectors: Vector3[], push: IPushDefinition): Vector3[] => {
            vectors.push(new Vector3().add(push.alpha))
            vectors.push(new Vector3().add(push.omega))
            return vectors
        }
        const points = PUSH_ARRAY.reduce(pushesToPoints, [])
        const newBase = oppositeTriangle(base)
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
        const trianglePoints = face.joints.map(joint => this.fabric.instance.location(joint.index))
        const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
        const x = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
        const z = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
        const y = new Vector3().crossVectors(z, x).normalize()
        z.crossVectors(x, y).normalize()
        const basis = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
        return new Matrix4().getInverse(basis)
    }

    private facesToRing(faceA: IFace, faceB: IFace): IRing {
        if (faceA.negative === faceB.negative) {
            throw new Error("Polarity not opposite")
        }
        const instance = this.fabric.instance
        const dirA = new Vector3().subVectors(
            instance.location(faceA.joints[0].index),
            instance.faceMidpoint(faceA.index),
        ).normalize()
        const worstDotB = faceB.joints.map((joint, index) => [
            new Vector3().subVectors(
                instance.location(joint.index),
                instance.faceMidpoint(faceB.index),
            ).normalize().dot(dirA),
            index,
        ]).sort((a, b) => b[0] - a[0]).pop()
        if (!worstDotB) {
            throw new Error("No worst dot-b")
        }
        let idxA: number[]
        let idxB: number[]
        switch (worstDotB[1]) {
            case 0:
                idxA = [1, 2, 0]
                idxB = [1, 2, 0]
                break
            case 1:
                idxA = [1, 2, 0]
                idxB = [2, 0, 1]
                break
            case 2:
                idxA = [1, 2, 0]
                idxB = [0, 1, 2]
                break
            default:
                throw new Error("Strange index worst dot-b")
        }
        if (!faceA.negative) {
            idxA.reverse()
        }
        if (!faceB.negative) {
            idxB.reverse()
        }
        const jointsA = idxA.map(idx => faceA.joints[idx])
        const jointsB = idxB.map(idx => faceB.joints[idx])
        return {faceA, faceB, jointsA, jointsB}
    }

    private connectFaces(faceA: IFace, faceB: IFace, connectorScale: IPercent, countdown: number): void {
        if (faceA.negative === faceB.negative) {
            throw new Error("Same polarity!")
        }
        const ring = this.facesToRing(faceA, faceB)
        const brickIsNexus = (brick: IBrick) => brick.negativeAdjacent > 1 || brick.postiveeAdjacent > 1
        const createInterval = (from: IJoint, to: IJoint, role: IntervalRole) => this.fabric.createInterval(from, to, role, connectorScale, countdown)
        for (let corner = 0; corner < 3; corner++) {
            const a0 = ring.jointsA[corner]
            const b0 = ring.jointsB[corner]
            const b1 = ring.jointsB[(corner + 1) % 3]
            const ringInterval = (from: IJoint, to: IJoint) => createInterval(from, to, IntervalRole.Ring)
            ringInterval(a0, b0)
            ringInterval(a0, b1)
            const crossInterval = (from: IJoint, opposite: IJoint, toFace: IFace) => {
                const to = this.fabric.joints[opposite.oppositeIndex]
                const role = brickIsNexus(toFace.brick) ? IntervalRole.NexusCross : IntervalRole.ColumnCross
                createInterval(from, to, role)
            }
            crossInterval(a0, b1, faceB)
            crossInterval(b0, a0, faceA)
        }
        const handleFace = (faceToRemove: IFace): void => {
            const scale = faceToRemove.brick.scale
            const triangle = faceToRemove.triangle
            const brick = faceToRemove.brick
            if (faceToRemove.negative) {
                brick.negativeAdjacent++
            } else {
                brick.postiveeAdjacent++
            }
            TRIANGLE_DEFINITIONS
                .filter(t => t.opposite !== triangle && t.negative !== TRIANGLE_DEFINITIONS[triangle].negative)
                .forEach(t => brick.faces[t.name].canGrow = false)
            this.fabric.removeFace(faceToRemove, true)
            const triangleRing = TRIANGLE_DEFINITIONS[triangle].ring
            if (brickIsNexus(brick)) {
                brick.pulls
                    .filter(interval => !interval.removed)
                    .forEach(interval => this.fabric.changeIntervalRole(interval, IntervalRole.Triangle, scale, countdown))
                brick.crosses
                    .forEach(interval => this.fabric.changeIntervalRole(interval, IntervalRole.NexusCross, scale, countdown))

            } else {
                brick.rings[triangleRing]
                    .filter(interval => !interval.removed)
                    .forEach(interval => this.fabric.changeIntervalRole(interval, IntervalRole.Ring, scale, countdown))
            }
            const pushRole = brickIsNexus(brick) ? IntervalRole.NexusPush : IntervalRole.ColumnPush
            brick.pushes
                .filter(interval => !interval.removed)
                .forEach(interval => this.fabric.changeIntervalRole(interval, pushRole, scale, countdown))
        }
        handleFace(faceA)
        handleFace(faceB)
    }
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
