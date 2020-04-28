/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Matrix4, Vector3 } from "three"

import { IMark, MarkAction } from "./tenscript"
import { Tensegrity } from "./tensegrity"
import { scaleToInitialStiffness } from "./tensegrity-optimizer"
import {
    averageLocation,
    averageScaleFactor,
    brickContaining,
    createBrickPointsAt,
    faceToOriginMatrix,
    factorToPercent,
    IBrick,
    IFace,
    IFaceAnchor,
    IFaceInterval,
    IInterval,
    IJoint,
    initialBrick,
    IPercent,
    IPushDefinition,
    isNexus,
    percentToFactor,
    PUSH_ARRAY,
    toSymmetricalMatrix,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-types"

export function scaleToFaceConnectorLength(scaleFactor: number): number {
    return 0.6 * scaleFactor
}

export class TensegrityBuilder {

    constructor(private tensegrity: Tensegrity) {
    }

    public createBrickAt(midpoint: Vector3, symmetrical: boolean, scale: IPercent): IBrick {
        const points = createBrickPointsAt(Triangle.PPP, scale, midpoint)
        return this.createBrick(points, Triangle.NNN, scale)
    }

    public createConnectedBrick(brickA: IBrick, triangle: Triangle, scale: IPercent): IBrick {
        const violated = () => brickA.negativeAdjacent > 1 && brickA.postiveAdjacent > 1
        const brickWasViolated = violated()
        const faceA = brickA.faces[triangle]
        const scaleA = percentToFactor(brickA.scale)
        const scaleB = scaleA * percentToFactor(scale)
        const brickB = this.createBrickOnFace(faceA, factorToPercent(scaleB))
        const faceB = brickB.faces[brickB.base]
        const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
        this.connectFaces(faceA, faceB, factorToPercent((scaleA + scaleB) / 2), countdown)
        if (brickWasViolated !== violated()) {
            const instance = this.tensegrity.instance
            instance.apply(toSymmetricalMatrix(brickA, this.tensegrity.rotation, index => instance.unitVector(index)))
        }
        return brickB
    }

    public checkFaceIntervals(faceIntervals: IFaceInterval[], removeInterval: (faceInterval: IFaceInterval) => void): IFaceInterval[] {
        if (faceIntervals.length === 0) {
            return faceIntervals
        }
        const connectFaceInteval = ({alpha, omega, scaleFactor}: IFaceInterval) => {
            const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
            this.connectFaces(alpha, omega, factorToPercent(scaleFactor), countdown)
        }
        return faceIntervals.filter(faceInterval => {
            if (faceInterval.connector) {
                const {alpha, omega, scaleFactor} = faceInterval
                const distance = alpha.location().distanceTo(omega.location())
                const closeEnough = distance <= scaleToFaceConnectorLength(scaleFactor) * 10
                if (closeEnough) {
                    connectFaceInteval(faceInterval)
                    removeInterval(faceInterval)
                    return false
                }
            }
            return true
        })
    }

    public faceToOrigin(face: IFace): void {
        const instance = this.tensegrity.instance
        instance.apply(faceToOriginMatrix(face))
        instance.refreshFloatView()
    }

    public createFaceIntervals(faces: IFace[], mark: IMark): IFaceInterval[] {
        const centerBrickFaceIntervals = () => {
            const brick = this.createBrickAt(
                averageLocation(faces.map(face => face.location())), false, factorToPercent(averageScaleFactor(faces)),
            )
            return faces.map(face => {
                const opposing = brick.faces.filter(({negative, removed}) => !removed && negative !== face.negative)
                const closestFace = opposing.reduce((a, b) => {
                    const aa = a.location().distanceTo(face.location())
                    const bb = b.location().distanceTo(face.location())
                    return aa < bb ? a : b
                })
                closestFace.removed = true
                return this.tensegrity.createFaceConnector(closestFace, face)
            })
        }
        switch (mark.action) {
            case MarkAction.JoinFaces:
                switch (faces.length) {
                    case 2:
                        if (faces[0].negative === faces[1].negative) {
                            return centerBrickFaceIntervals()
                        }
                        return [this.tensegrity.createFaceConnector(faces[0], faces[1])]
                    case 3:
                        return centerBrickFaceIntervals()
                    default:
                        return []
                }
            case MarkAction.FaceDistance:
                const pullScale = mark.scale
                if (!pullScale) {
                    throw new Error("Missing pull scale")
                }
                const distancers: IFaceInterval[] = []
                faces.forEach((faceA, indexA) => {
                    faces.forEach((faceB, indexB) => {
                        if (indexA <= indexB) {
                            return
                        }
                        distancers.push(this.tensegrity.createFaceDistancer(faceA, faceB, pullScale))
                    })
                })
                return distancers
            default:
                return []
        }
    }

    public createFaceAnchor(face: IFace, mark: IMark): IFaceAnchor {
        if (mark.action !== MarkAction.Anchor) {
            throw new Error("Anchor problem")
        }
        const point = mark.point
        if (!point) {
            throw new Error("Missing anchor point")
        }
        return this.tensegrity.createFaceAnchor(face, point)
    }

    private createBrickOnFace(face: IFace, scale: IPercent): IBrick {
        const negativeFace = TRIANGLE_DEFINITIONS[face.triangle].negative
        const brick = face.brick
        const triangle = face.triangle
        const trianglePoints = brick.faces[triangle].joints.map(joint => joint.location())
        const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
        const midSide = new Vector3().addVectors(trianglePoints[0], trianglePoints[1]).multiplyScalar(0.5)
        const x = new Vector3().subVectors(midSide, midpoint).normalize()
        const u = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
        const proj = new Vector3().add(x).multiplyScalar(x.dot(u))
        const z = u.sub(proj).normalize()
        const y = new Vector3().crossVectors(z, x).normalize().multiplyScalar(0.5)
        const xform = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
        const base = negativeFace ? Triangle.NNN : Triangle.PPP
        const points = createBrickPointsAt(base, scale, new Vector3(0, 0, 0)) // todo: maybe raise it
        const movedToFace = points.map(p => p.applyMatrix4(xform))
        const baseTriangle = negativeFace ? Triangle.PPP : Triangle.NNN
        return this.createBrick(movedToFace, baseTriangle, scale, face)
    }

    private createBrick(points: Vector3[], base: Triangle, scale: IPercent, parent?: IFace): IBrick {
        const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        const brick = initialBrick(base, scale, parent)
        this.tensegrity.bricks.push(brick)
        const jointIndexes = points.map((p, idx) => this.tensegrity.createJoint(p))
        this.tensegrity.instance.refreshFloatView()
        PUSH_ARRAY.forEach(({}: IPushDefinition, idx: number) => {
            const alphaIndex = jointIndexes[idx * 2]
            const omegaIndex = jointIndexes[idx * 2 + 1]
            const alpha: IJoint = {
                index: alphaIndex,
                oppositeIndex: omegaIndex,
                location: () => this.tensegrity.instance.jointLocation(alphaIndex),
            }
            const omega: IJoint = {
                index: omegaIndex,
                oppositeIndex: alphaIndex,
                location: () => this.tensegrity.instance.jointLocation(omegaIndex),
            }
            brick.pushes.push(this.tensegrity.createInterval(alpha, omega, IntervalRole.NexusPush, scale, stiffness, linearDensity, countdown))
        })
        brick.pushes.forEach(push => brick.joints.push(push.alpha, push.omega))
        const joints = brick.pushes.reduce((arr: IJoint[], push) => {
            arr.push(push.alpha, push.omega)
            return arr
        }, [])
        this.tensegrity.joints.push(...joints)
        TRIANGLE_DEFINITIONS.forEach(triangle => {
            const tJoints = triangle.pushEnds.map(end => joints[end])
            for (let walk = 0; walk < 3; walk++) {
                const alpha = tJoints[walk]
                const omega = tJoints[(walk + 1) % 3]
                const interval = this.tensegrity.createInterval(alpha, omega, IntervalRole.Triangle, scale, stiffness, linearDensity, countdown)
                brick.pulls.push(interval)
                brick.rings[triangle.ringMember[walk]].push(interval)
            }
        })
        TRIANGLE_DEFINITIONS.forEach(triangle => {
            const face = this.tensegrity.createFace(brick, triangle.name)
            brick.faces.push(face)
        })
        this.tensegrity.instance.refreshFloatView()
        return brick
    }

    private facesToRing(faceA: IFace, faceB: IFace): IJoint[] {
        if (faceA.negative === faceB.negative) {
            throw new Error("Polarity not opposite")
        }
        const dirA = new Vector3().subVectors(faceA.joints[0].location(), faceA.location()).normalize()
        const oppositeJoint = faceB.joints.map((joint, index) => [
            new Vector3().subVectors(joint.location(), faceB.location()).normalize().dot(dirA), index,
        ]).sort((a, b) => b[0] - a[0]).pop()
        if (!oppositeJoint) {
            throw new Error("No opposite joint")
        }
        const permutation: number[] = [[1, 0, 2], [2, 1, 0], [0, 2, 1]][oppositeJoint[1]]
        return [
            faceA.joints[0], faceB.joints[permutation[0]],
            faceA.joints[1], faceB.joints[permutation[1]],
            faceA.joints[2], faceB.joints[permutation[2]],
        ]
    }

    private connectFaces(faceA: IFace, faceB: IFace, scale: IPercent, countdown: number): void {
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        if (faceA.negative === faceB.negative) {
            throw new Error("Same polarity!")
        }
        [faceA, faceB].forEach((face: IFace): void => {
            this.tensegrity.removeFace(face, true)
            if (!face.negative) {
                face.brick.negativeAdjacent++
            } else {
                face.brick.postiveAdjacent++
            }
        })
        const ring = this.facesToRing(faceA, faceB)
        const createInterval = (from: IJoint, to: IJoint, role: IntervalRole) =>
            this.tensegrity.createInterval(from, to, role, scale, stiffness, linearDensity, countdown)
        for (let corner = 0; corner < ring.length; corner++) {
            const prev = ring[(corner + 5) % 6]
            const curr = ring[corner]
            const next = ring[(corner + 1) % 6]
            createInterval(curr, next, IntervalRole.Ring)
            const crossInterval = (from: IJoint, opposite: IJoint) => {
                const to = this.tensegrity.joints[opposite.oppositeIndex]
                const toBrick = brickContaining(to, faceA.brick, faceB.brick)
                toBrick.crosses.push(createInterval(from, to, IntervalRole.Triangle))
            }
            if (faceA.negative) {
                crossInterval(prev, curr)
            } else {
                crossInterval(next, curr)
            }
        }
        [faceA, faceB].forEach(({triangle, brick}: IFace): void => {
            const adjustRole = (intervals: IInterval[], role: IntervalRole) => intervals
                .filter(interval => !interval.removed && interval.intervalRole !== role)
                .forEach(interval => this.tensegrity.changeIntervalRole(interval, role, brick.scale, countdown))
            if (isNexus(brick)) {
                adjustRole(brick.pulls, IntervalRole.Triangle)
                adjustRole(brick.crosses, IntervalRole.Cross)
                adjustRole(brick.pushes, IntervalRole.NexusPush)
            } else {
                adjustRole(brick.rings[TRIANGLE_DEFINITIONS[triangle].ring], IntervalRole.Ring)
                adjustRole(brick.crosses, IntervalRole.Triangle)
                adjustRole(brick.pushes, IntervalRole.ColumnPush)
            }
        })
        this.tensegrity.instance.refreshFloatView()
    }
}
