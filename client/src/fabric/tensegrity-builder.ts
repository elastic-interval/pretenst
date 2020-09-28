/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { avg, CONNECTOR_LENGTH, IntervalRole, midpoint, normal, roleDefaultLength, sub } from "./eig-util"
import { IBud, IMark, ITenscript, MarkAction, treeNeedsOmniTwist } from "./tenscript"
import { Tensegrity } from "./tensegrity"
import {
    acrossPush,
    averageScaleFactor,
    faceFromTwist,
    FaceName,
    faceToOriginMatrix,
    factorFromPercent,
    IFace,
    IInterval,
    IJoint,
    IPercent,
    IRadialPull,
    ITwist,
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

export class TensegrityBuilder {
    constructor(public readonly tensegrity: Tensegrity) {
    }

    public createBud({spin, tree, marks}: ITenscript): IBud {
        const reorient = tree._ === undefined
        const omni = treeNeedsOmniTwist(tree) && reorient
        const twist = this.createTwistAt(new Vector3, spin, percentOrHundred(), omni)
        return {builder: this, tree, twist, marks, reorient}
    }

    public createTwistOn(baseFace: IFace, twistScale: IPercent, omni: boolean): ITwist {
        const baseFactor = factorFromPercent(baseFace.scale)
        const scale = percentFromFactor(factorFromPercent(twistScale) * baseFactor)
        if (omni) {
            const bottom = this.createTwist(faceTwistPoints(baseFace, scale), scale, oppositeSpin(baseFace.spin), IntervalRole.PhiPush)
            const bottomTopFace = faceFromTwist(bottom, FaceName.PPP)
            const top = this.createTwist(faceTwistPoints(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), IntervalRole.PhiPush)
            const twist = this.createOmniTwist(bottom, top)
            this.connect(baseFace, faceFromTwist(twist, FaceName.NNN), connectRoles(baseFace.omni, omni))
            return twist
        } else {
            const points = faceTwistPoints(baseFace, scale)
            const twist = this.createTwist(points, scale, oppositeSpin(baseFace.spin), IntervalRole.RootPush)
            this.connect(baseFace, faceFromTwist(twist, FaceName.NNN), connectRoles(baseFace.omni, omni))
            return twist
        }
    }

    public faceToOrigin(face: IFace): void {
        const instance = this.tensegrity.instance
        instance.apply(faceToOriginMatrix(face))
        instance.refreshFloatView()
    }

    public createRadialPulls(faces: IFace[], mark?: IMark): IRadialPull[] {
        const centerBrickFaceIntervals = () => {
            const scale = percentFromFactor(averageScaleFactor(faces))
            const where = locationFromFaces(faces)
            const omniTwist = this.createTwistAt(where, Spin.Left, scale, true)
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
        if (!mark || mark.action === MarkAction.FaceDistance) {
            const pullScale = mark ? mark.scale : percentFromFactor(0.75)
            if (!pullScale) {
                throw new Error("Missing pull scale")
            }
            const distancers: IRadialPull[] = []
            faces.forEach((faceA, indexA) => {
                faces.forEach((faceB, indexB) => {
                    if (indexA <= indexB) {
                        return
                    }
                    distancers.push(this.tensegrity.createRadialPull(faceA, faceB, pullScale))
                })
            })
            return distancers
        } else if (mark.action === MarkAction.JoinFaces) {
            switch (faces.length) {
                case 2:
                    if (faces[0].spin === faces[1].spin) {
                        return centerBrickFaceIntervals()
                    }
                    return [this.tensegrity.createRadialPull(faces[0], faces[1])]
                case 3:
                    return centerBrickFaceIntervals()
                default:
                    return []
            }
        } else {
            return []
        }
    }

    public checkConnectors(radialPulls: IRadialPull[], removeInterval: (interval: IInterval) => void): IRadialPull[] {
        if (radialPulls.length === 0) {
            return radialPulls
        }
        const connectFaces = (alpha: IFace, omega: IFace) => {
            rotateForBestRing(alpha, omega)
            this.connect(alpha, omega, connectRoles(alpha.omni, omega.omni))
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

    private createTwistAt(location: Vector3, spin: Spin, scale: IPercent, omni: boolean): ITwist {
        const pushesPerTwist = this.tensegrity.pushesPerTwist
        if (omni) {
            const bottom = this.createTwist(firstTwistPoints(location, pushesPerTwist, spin, scale), scale, spin, IntervalRole.PhiPush)
            const bottomTopFace = faceFromTwist(bottom, FaceName.PPP)
            const top = this.createTwist(faceTwistPoints(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), IntervalRole.PhiPush)
            return this.createOmniTwist(bottom, top)
        } else {
            return this.createTwist(firstTwistPoints(location, pushesPerTwist, spin, scale), scale, spin, IntervalRole.RootPush)
        }
    }

    private createOmniTwist(bottomTwist: ITwist, topTwist: ITwist): ITwist {
        const {scale} = bottomTwist
        const connectPulls = this.connect(faceFromTwist(bottomTwist, FaceName.PPP), faceFromTwist(topTwist, FaceName.NNN), connectRoles(true, true))
        const pushes = [...bottomTwist.pushes, ...topTwist.pushes]
        const pulls = [...bottomTwist.pulls, ...topTwist.pulls, ...connectPulls]
        const createFaceTouching = (joint: IJoint, spin: Spin): IFace => {
            const facePulls = pulls.filter(({alpha, omega}) => joint.index === alpha.index || joint.index === omega.index)
            const ends = facePulls.map(pull => otherJoint(joint, pull))
            const thirdForward = pulls.find(({alpha, omega}) => alpha.index === ends[0].index && omega.index === ends[1].index)
            const thirdReverse = pulls.find(({alpha, omega}) => alpha.index === ends[1].index && omega.index === ends[0].index)
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
        const topFace = topTwist.faces[1]
        const topTouching = topFace.ends.map(end => createFaceTouching(end, oppositeSpin(topFace.spin)))
        const bottomFace = bottomTwist.faces[0]
        const bottomTouching = bottomFace.ends.map(end => createFaceTouching(end, oppositeSpin(bottomFace.spin)))
        bottomFace.omni = topFace.omni = true
        const faces = [bottomFace, ...bottomTouching, ...topTouching, topFace]
        return {scale, pushes, pulls, faces}
    }

    private connect(faceA: IFace, faceB: IFace, roles: IConnectRoles): IInterval[] {
        const reverseA = [...faceA.ends].reverse()
        const forwardB = faceB.ends
        const a = reverseA.map(acrossPush)
        const b = reverseA
        const c = forwardB
        const d = forwardB.map(acrossPush)
        const scale = percentFromFactor((factorFromPercent(faceA.scale) + factorFromPercent(faceB.scale)) / 2)
        const pulls: IInterval[] = []
        for (let index = 0; index < b.length; index++) {
            const a0 = a[index]
            const a1 = a[(index + 1) % a.length]
            const b0 = b[index]
            const b1 = b[(index + 1) % b.length]
            const c0 = c[index]
            const d0 = d[index]
            pulls.push(this.tensegrity.createInterval(b0, c0, roles.ring, scale))
            pulls.push(this.tensegrity.createInterval(c0, b1, roles.ring, scale))
            if (faceA.spin === Spin.Left) {
                pulls.push(this.tensegrity.createInterval(c0, a1, roles.down, scale))
            } else {
                pulls.push(this.tensegrity.createInterval(c0, a0, roles.down, scale))
            }
            if (faceB.spin === Spin.Left) {
                pulls.push(this.tensegrity.createInterval(b1, d0, roles.up, scale))
            } else {
                pulls.push(this.tensegrity.createInterval(b0, d0, roles.up, scale))
            }
        }
        if (roles.ring === IntervalRole.Ring) {
            const faceScale = percentFromFactor((factorFromPercent(faceA.scale) + factorFromPercent(faceB.scale)) / 2)
            for (let index = 0; index < b.length; index++) {
                const a0 = a[index]
                const a1 = a[(index + 1) % a.length]
                const b0 = b[index]
                const b1 = b[(index + 1) % b.length]
                const c0 = c[index]
                const c1 = c[(index + 1) % c.length]
                const cN1 = c[(index + c.length - 1) % c.length]
                const d0 = d[index]
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

    private createTwist(points: IPoint[], scale: IPercent, spin: Spin, pushRole: IntervalRole): ITwist {
        const twist: ITwist = {scale, pushes: [], pulls: [], faces: []}
        const ends = points.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createJoint(alpha),
            omega: this.tensegrity.createJoint(omega),
        }))
        this.tensegrity.instance.refreshFloatView()
        const alphaEnds = ends.map(({alpha}) => alpha)
        const omegaEnds = ends.map(({omega}) => omega).reverse()
        ends.forEach(({alpha, omega}) => {
            const push = this.tensegrity.createInterval(alpha, omega, pushRole, scale)
            twist.pushes.push(push)
            alpha.push = omega.push = push
        })
        twist.pulls.push(...alphaEnds.map((alpha, index) =>
            this.tensegrity.createInterval(alpha, alphaEnds[(index + 1) % alphaEnds.length], IntervalRole.InterTwist, scale)))
        twist.faces.push(this.tensegrity.createFace(alphaEnds, false, spin, scale))
        twist.pulls.push(...omegaEnds.map((omega, index) =>
            this.tensegrity.createInterval(omega, omegaEnds[(index + 1) % omegaEnds.length], IntervalRole.InterTwist, scale)))
        twist.faces.push(this.tensegrity.createFace(omegaEnds,  false, spin, scale))
        ends.forEach(({alpha}, index) => {
            const offset = spin === Spin.Left ? ends.length - 1 : 1
            const omega = ends[(index + offset) % ends.length].omega
            twist.pulls.push(this.tensegrity.createInterval(alpha, omega, IntervalRole.Twist, scale))
        })
        // console.log(`${ends.map(e => `${e.alpha.index}-${e.omega.index}`).join(" ")} : ${spin === Spin.Left ? "L" : "R"}`)
        return twist
    }
}

export function scaleToFaceConnectorLength(scaleFactor: number): number {
    return 0.6 * scaleFactor
}

interface IConnectRoles {
    ring: IntervalRole
    up: IntervalRole
    down: IntervalRole
}

function connectRoles(omniA: boolean, omniB: boolean): IConnectRoles {
    if (!omniA && !omniB) {
        return {ring: IntervalRole.Ring, up: IntervalRole.InterTwist, down: IntervalRole.InterTwist}
    } else if (omniA && !omniB) {
        return {ring: IntervalRole.Ring, up: IntervalRole.Cross, down: IntervalRole.InterTwist}
    } else if (!omniA && omniB) {
        return {ring: IntervalRole.Ring, up: IntervalRole.InterTwist, down: IntervalRole.Cross}
    } else {
        return {ring: IntervalRole.PhiTriangle, down: IntervalRole.PhiTriangle, up: IntervalRole.PhiTriangle}
    }
}

interface IPoint {
    alpha: Vector3
    omega: Vector3
}

function firstTwistPoints(location: Vector3, pushesPerTwist: number, spin: Spin, scale: IPercent): IPoint[] {
    const base: Vector3[] = []
    for (let index = 0; index < pushesPerTwist; index++) {
        const angle = index * Math.PI * 2 / pushesPerTwist
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        base.push(new Vector3(x, 0, y).add(location))
    }
    return twistPoints(base, spin, scale)
}

function faceTwistPoints(face: IFace, scale: IPercent): IPoint[] {
    const base = face.ends.map(jointLocation).reverse()
    return twistPoints(base, oppositeSpin(face.spin), scale)
}

function twistPoints(base: Vector3[], spin: Spin, scale: IPercent): IPoint[] {
    const initialLength = roleDefaultLength(IntervalRole.PhiTriangle) * factorFromPercent(scale) / Math.sqrt(3)
    const tinyRadius = initialLength * base.length / 3 / Math.sqrt(3)
    const points: IPoint[] = []
    const mid = midpoint(base)
    const up = normal(base).multiplyScalar(initialLength)
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
