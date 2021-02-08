/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { avg, CONNECTOR_LENGTH, IntervalRole, midpoint, normal, roleDefaultLength, sub } from "./eig-util"
import { FaceAction, IBud, ITenscript } from "./tenscript"
import { Tensegrity } from "./tensegrity"
import {
    acrossPush,
    averageScaleFactor,
    FaceName,
    faceToOriginMatrix,
    factorFromPercent,
    IFace,
    IInterval,
    IJoint,
    IPercent,
    IRadialPull,
    isOmniSpin,
    jointDistance,
    jointLocation,
    locationFromFace,
    locationFromFaces,
    oppositeSpin,
    otherJoint,
    percentFromFactor,
    percentOrHundred,
    rotateForBestRing,
    Spin,
} from "./tensegrity-types"
import { Twist } from "./twist"

export class TensegrityBuilder {
    constructor(public readonly tensegrity: Tensegrity) {
    }

    public createBud({spin, tree, marks}: ITenscript, origin?: Vector3): IBud {
        const reorient = tree.forward === -1
        const at = origin ? origin : new Vector3()
        const twist = this.createTwistAt(at, spin, percentOrHundred())
        return {builder: this, tree, twist, marks, reorient}
    }

    public createTwistOn(baseFace: IFace, twistScale: IPercent, omni: boolean): Twist {
        const baseFactor = factorFromPercent(baseFace.scale)
        const scale = percentFromFactor(factorFromPercent(twistScale) * baseFactor)
        if (omni) {
            const pushRole = IntervalRole.PhiPush
            const pullRole = IntervalRole.PhiTriangle
            const bottom = this.createTwist(faceTwistPointPairs(baseFace, scale), scale, oppositeSpin(baseFace.spin), pushRole, pullRole)
            const bottomTopFace = bottom.face(FaceName.A)
            const top = this.createTwist(faceTwistPointPairs(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), pushRole, pullRole)
            const twist = this.createOmniTwist(bottom, top)
            this.connect(baseFace, twist.face(FaceName.a), omni)
            return twist
        } else {
            const points = faceTwistPointPairs(baseFace, scale)
            const twist = this.createTwist(points, scale, oppositeSpin(baseFace.spin), IntervalRole.RootPush, IntervalRole.Twist)
            this.connect(baseFace, twist.face(FaceName.a), omni)
            return twist
        }
    }

    public faceToOrigin(face: IFace): void {
        const instance = this.tensegrity.instance
        instance.apply(faceToOriginMatrix(face))
        instance.refreshFloatView()
    }

    public createRadialPulls(faces: IFace[], action: FaceAction, actionScale?: IPercent): void {
        const centerBrickFaceIntervals = () => {
            const scale = percentFromFactor(averageScaleFactor(faces))
            const where = locationFromFaces(faces)
            const omniTwist = this.createTwistAt(where, Spin.LeftRight, scale)
            this.tensegrity.instance.refreshFloatView()
            return faces.map(face => {
                const opposing = omniTwist.faces.filter(({spin, pulls}) => pulls.length > 0 && spin !== face.spin)
                const faceLocation = locationFromFace(face)
                const closestFace = opposing.reduce((a, b) => {
                    const aa = locationFromFace(a).distanceTo(faceLocation)
                    const bb = locationFromFace(b).distanceTo(faceLocation)
                    return aa < bb ? a : b
                })
                return this.tensegrity.createRadialPull(closestFace, face)
            })
        }
        switch (action) {
            case FaceAction.Distance:
                const pullScale = actionScale ? actionScale : percentFromFactor(0.75)
                if (!pullScale) {
                    throw new Error("Missing pull scale")
                }
                faces.forEach((faceA, indexA) => {
                    faces.forEach((faceB, indexB) => {
                        if (indexA <= indexB) {
                            return
                        }
                        this.tensegrity.createRadialPull(faceA, faceB, pullScale)
                    })
                })
                break
            case FaceAction.Join:
                switch (faces.length) {
                    case 2:
                        if (faces[0].spin === faces[1].spin) {
                            centerBrickFaceIntervals()
                        } else {
                            this.tensegrity.createRadialPull(faces[0], faces[1])
                        }
                        break
                    case 3:
                        centerBrickFaceIntervals()
                        break
                }
                break
        }
        if (action === FaceAction.Distance) {
        } else if (action === FaceAction.Join) {
        }
    }

    public checkConnectors(radialPulls: IRadialPull[], removeInterval: (interval: IInterval) => void): IRadialPull[] {
        if (radialPulls.length === 0) {
            return radialPulls
        }
        const connectFaces = (alpha: IFace, omega: IFace) => {
            rotateForBestRing(alpha, omega)
            this.connect(alpha, omega, false)
        }
        return radialPulls.filter(({axis, alpha, omega, alphaRays, omegaRays}) => {
            if (axis.intervalRole === IntervalRole.ConnectorPull) {
                const distance = jointDistance(axis.alpha, axis.omega)
                if (distance <= CONNECTOR_LENGTH) {
                    connectFaces(alpha, omega)
                    removeInterval(axis)
                    alphaRays.forEach(removeInterval)
                    omegaRays.forEach(removeInterval)
                    return false
                }
            }
            return true
        })
    }

    // =====================================================

    private createTwistAt(location: Vector3, spin: Spin, scale: IPercent): Twist {
        const pushesPerTwist = this.tensegrity.pushesPerTwist
        if (isOmniSpin(spin)) {
            const pushRole = IntervalRole.PhiPush
            const pullRole = IntervalRole.PhiTriangle
            const bottomSpin = spin === Spin.LeftRight ? Spin.Left : Spin.Right
            const bottom = this.createTwist(firstTwistPointPairs(location, pushesPerTwist, bottomSpin, scale), scale, bottomSpin, pushRole, pullRole)
            const bottomTopFace = bottom.face(FaceName.A)
            const top = this.createTwist(faceTwistPointPairs(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), pushRole, pullRole)
            return this.createOmniTwist(bottom, top)
        } else {
            return this.createTwist(firstTwistPointPairs(location, pushesPerTwist, spin, scale), scale, spin, IntervalRole.RootPush, IntervalRole.Twist)
        }
    }

    private createOmniTwist(bottomTwist: Twist, topTwist: Twist): Twist {
        const topFace = topTwist.faces[1]
        const bottomFace = bottomTwist.faces[0]
        const avoidFaces = (joint: IJoint) => !(topFace.ends.some(end => joint.index === end.index) || bottomFace.ends.some(end => joint.index === end.index))
        const connectPulls = this.connect(bottomTwist.faces[1], topTwist.faces[0], true)
        const pushes = [...bottomTwist.pushes, ...topTwist.pushes]
        const pulls = [...bottomTwist.pulls.filter(p => !p.removed), ...topTwist.pulls.filter(p => !p.removed), ...connectPulls]
        const {scale} = bottomTwist
        const createFaceTouching = (joint: IJoint, spin: Spin): IFace => {
            const facePulls = pulls.filter(({alpha, omega}) =>
                joint.index === alpha.index || joint.index === omega.index)
            const ends = facePulls.map(pull => otherJoint(joint, pull)).filter(avoidFaces)
            const thirdForward = pulls.find(({alpha, omega}) =>
                alpha.index === ends[0].index && omega.index === ends[1].index)
            const thirdReverse = pulls.find(({alpha, omega}) =>
                alpha.index === ends[1].index && omega.index === ends[0].index)
            ends.push(joint)
            if (spin === Spin.Left) {
                ends.reverse()
            }
            if (thirdForward) {
                facePulls.push(thirdForward)
            } else if (thirdReverse) {
                facePulls.push(thirdReverse)
            } else {
                throw new Error("Interval not found")
            }
            return this.tensegrity.createFace(ends, true, spin, scale)
        }
        const topTouching = topFace.ends.map(end => createFaceTouching(end, oppositeSpin(topFace.spin)))
        const bottomTouching = bottomFace.ends.map(end => createFaceTouching(end, oppositeSpin(bottomFace.spin)))
        bottomFace.omni = topFace.omni = true
        const faces = [bottomFace, ...bottomTouching, ...topTouching, topFace]
        return new Twist(scale, faces, pushes, pulls)
    }

    private connect(faceA: IFace, faceB: IFace, omni: boolean): IInterval[] {
        const reverseA = [...faceA.ends].reverse()
        const forwardB = faceB.ends
        const a = reverseA.map(acrossPush)
        const b = reverseA
        const c = forwardB
        const d = forwardB.map(acrossPush)

        function indexJoints(index: number): IIndexedJoints {
            return {
                a0: a[index],
                a1: a[(index + 1) % a.length],
                b0: b[index],
                b1: b[(index + 1) % b.length],
                c0: c[index],
                c1: c[(index + 1) % c.length],
                cN1: c[(index + c.length - 1) % c.length],
                d0: d[index],
                d1: d[(index + 1) % d.length],
            }
        }

        const scale = percentFromFactor((factorFromPercent(faceA.scale) + factorFromPercent(faceB.scale)) / 2)
        const pulls: IInterval[] = []
        const ringRole = omni ? IntervalRole.PhiTriangle : IntervalRole.Ring
        for (let index = 0; index < b.length; index++) {
            const {b0, b1, c0} = indexJoints(index)
            pulls.push(this.tensegrity.createInterval(b0, c0, ringRole, scale))
            pulls.push(this.tensegrity.createInterval(c0, b1, ringRole, scale))
        }
        if (omni) {
            const phiRole = IntervalRole.PhiTriangle
            for (let index = 0; index < b.length; index++) {
                const {a0, a1, b0, b1, c0, d0} = indexJoints(index)
                if (faceA.spin === Spin.Left) {
                    pulls.push(this.tensegrity.createInterval(c0, a1, phiRole, scale))
                } else {
                    pulls.push(this.tensegrity.createInterval(c0, a0, phiRole, scale))
                }
                if (faceB.spin === Spin.Left) {
                    pulls.push(this.tensegrity.createInterval(b1, d0, phiRole, scale))
                } else {
                    pulls.push(this.tensegrity.createInterval(b0, d0, phiRole, scale))
                }
            }
        } else {
            const faceScale = percentFromFactor((factorFromPercent(faceA.scale) + factorFromPercent(faceB.scale)) / 2)
            for (let index = 0; index < b.length; index++) {
                const {a0, a1, b0, b1, c0, c1, cN1, d0} = indexJoints(index)
                if (faceA.spin === Spin.Left) {
                    this.tensegrity.createFace([c0, a1, b0], false, oppositeSpin(faceA.spin), faceScale)
                } else {
                    this.tensegrity.createFace([c0, b1, a0], false, oppositeSpin(faceA.spin), faceScale)
                }
                if (faceB.spin === Spin.Left) {
                    this.tensegrity.createFace([b1, d0, c1], false, oppositeSpin(faceB.spin), faceScale)
                } else {
                    this.tensegrity.createFace([b0, cN1, d0], false, oppositeSpin(faceB.spin), faceScale)
                }
            }
        }
        this.tensegrity.removeFace(faceB)
        this.tensegrity.removeFace(faceA)
        return pulls
    }

    private createTwist(points: IPointPair[], scale: IPercent, spin: Spin, pushRole: IntervalRole, pullRole: IntervalRole): Twist {
        const twist = new Twist(scale, [], [], [])
        const ends = points.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createJoint(alpha),
            omega: this.tensegrity.createJoint(omega),
        }))
        this.tensegrity.instance.refreshFloatView()
        ends.forEach(({alpha, omega}) => {
            const push = this.tensegrity.createInterval(alpha, omega, pushRole, scale)
            twist.pushes.push(push)
            alpha.push = omega.push = push
        })
        const alphaEnds = ends.map(({alpha}) => alpha)
        const omegaEnds = ends.map(({omega}) => omega).reverse()
        twist.pulls.push(...alphaEnds.map((alpha, index) =>
            this.tensegrity.createInterval(alpha, alphaEnds[(index + 1) % alphaEnds.length], pullRole, scale)))
        twist.faces.push(this.tensegrity.createFace(alphaEnds, false, spin, scale))
        twist.pulls.push(...omegaEnds.map((omega, index) =>
            this.tensegrity.createInterval(omega, omegaEnds[(index + 1) % omegaEnds.length], pullRole, scale)))
        twist.faces.push(this.tensegrity.createFace(omegaEnds, false, spin, scale))
        ends.forEach(({alpha}, index) => {
            const offset = spin === Spin.Left ? ends.length - 1 : 1
            const omega = ends[(index + offset) % ends.length].omega
            twist.pulls.push(this.tensegrity.createInterval(alpha, omega, pullRole, scale))
        })
        return twist
    }
}

export function scaleToFaceConnectorLength(scaleFactor: number): number {
    return 0.6 * scaleFactor
}

interface IPointPair {
    alpha: Vector3
    omega: Vector3
}

function firstTwistPointPairs(location: Vector3, pushesPerTwist: number, spin: Spin, scale: IPercent): IPointPair[] {
    const base: Vector3[] = []
    for (let index = 0; index < pushesPerTwist; index++) {
        const angle = index * Math.PI * 2 / pushesPerTwist
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        base.push(new Vector3(x, 0, y).add(location))
    }
    return twistPointPairs(base, spin, scale)
}

function faceTwistPointPairs(face: IFace, scale: IPercent): IPointPair[] {
    const base = face.ends.map(jointLocation).reverse()
    return twistPointPairs(base, oppositeSpin(face.spin), scale)
}

function twistPointPairs(base: Vector3[], spin: Spin, scale: IPercent): IPointPair[] {
    const initialLength = roleDefaultLength(IntervalRole.PhiTriangle) * factorFromPercent(scale) / Math.sqrt(3)
    const tinyRadius = initialLength * base.length / 3 / Math.sqrt(3)
    const points: IPointPair[] = []
    const mid = midpoint(base)
    const up = normal(base).multiplyScalar(-initialLength)
    for (let index = 0; index < base.length; index++) {
        const a = sub(base[(index + base.length - 1) % base.length], mid)
        const b = sub(base[index], mid)
        const c = sub(base[(index + 1) % base.length], mid)
        const d = sub(base[(index + 2) % base.length], mid)
        const bc = avg(b, c)
        const cd = avg(c, d)
        const ba = avg(b, a)
        const alpha = new Vector3().copy(mid)
        const omega = new Vector3().copy(mid).add(up)
        if (spin === Spin.Left) {
            alpha.addScaledVector(bc, tinyRadius)
            omega.addScaledVector(cd, tinyRadius)
        } else {
            alpha.addScaledVector(bc, tinyRadius)
            omega.addScaledVector(ba, tinyRadius)
        }
        points.push({alpha, omega})
    }
    return points
}

interface IIndexedJoints {
    a0: IJoint,
    a1: IJoint,
    b0: IJoint,
    b1: IJoint,
    c0: IJoint,
    c1: IJoint,
    cN1: IJoint,
    d0: IJoint,
    d1: IJoint,
}
