/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { roleDefaultLength } from "../pretenst"

import { avg, midpoint, normal, sub } from "./eig-util"
import { IBud, IMark, ITenscript, MarkAction, treeNeedsOmniTwist } from "./tenscript"
import { Tensegrity } from "./tensegrity"
import { scaleToInitialStiffness } from "./tensegrity-optimizer"
import {
    acrossPush,
    averageScaleFactor,
    faceFromTwist,
    FaceName,
    faceToOriginMatrix,
    factorFromPercent,
    IFace,
    IFaceAnchor,
    IFaceInterval,
    IInterval,
    IJoint,
    IPercent,
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
            const bottom = this.createTwist(faceTwistPoints(baseFace, scale), scale, oppositeSpin(baseFace.spin), IntervalRole.NexusPush)
            const bottomTopFace = faceFromTwist(bottom, FaceName.PPP)
            const top = this.createTwist(faceTwistPoints(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), IntervalRole.NexusPush)
            const twist = this.createOmniTwist(bottom, top)
            this.connect(baseFace, faceFromTwist(twist, FaceName.NNN), connectRoles(baseFace.omni, omni))
            return twist
        } else {
            const points = faceTwistPoints(baseFace, scale)
            const twist = this.createTwist(points, scale, oppositeSpin(baseFace.spin), IntervalRole.ColumnPush)
            this.connect(baseFace, faceFromTwist(twist, FaceName.NNN), connectRoles(baseFace.omni, omni))
            return twist
        }
    }

    public faceToOrigin(face: IFace): void {
        const instance = this.tensegrity.instance
        instance.apply(faceToOriginMatrix(face))
        instance.refreshFloatView()
    }

    public createFaceIntervals(faces: IFace[], mark: IMark): IFaceInterval[] {
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
                return this.tensegrity.createFaceConnector(closestFace, face)
            })
        }
        switch (mark.action) {
            case MarkAction.JoinFaces:
                switch (faces.length) {
                    case 2:
                        if (faces[0].spin === faces[1].spin) {
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

    public checkFaceIntervals(faceIntervals: IFaceInterval[], removeInterval: (faceInterval: IFaceInterval) => void): IFaceInterval[] {
        if (faceIntervals.length === 0) {
            return faceIntervals
        }
        const connectFaceInterval = ({alpha, omega}: IFaceInterval) => {
            rotateForBestRing(alpha, omega)
            this.connect(alpha, omega, connectRoles(alpha.omni, omega.omni))
        }
        return faceIntervals.filter(faceInterval => {
            if (faceInterval.connector) {
                const {alpha, omega, scaleFactor} = faceInterval
                const distance = locationFromFace(alpha).distanceTo(locationFromFace(omega))
                const closeEnough = distance <= scaleToFaceConnectorLength(scaleFactor) * 10
                if (closeEnough) {
                    connectFaceInterval(faceInterval)
                    removeInterval(faceInterval)
                    return false
                }
            }
            return true
        })
    }

    public createFaceAnchor(face: IFace, mark: IMark): IFaceAnchor {
        if (mark.action !== MarkAction.Anchor) {
            throw new Error("Anchor problem")
        }
        const point = mark.point
        const scale = mark.scale
        if (!point || !scale) {
            throw new Error("Missing anchor point specs")
        }
        return this.tensegrity.createFaceAnchor(face, point, scale)
    }

    // =====================================================

    private createTwistAt(location: Vector3, spin: Spin, scale: IPercent, omni: boolean): ITwist {
        const pushesPerTwist = this.tensegrity.pushesPerTwist
        if (omni) {
            const bottom = this.createTwist(firstTwistPoints(location, pushesPerTwist, spin, scale), scale, spin, IntervalRole.NexusPush)
            const bottomTopFace = faceFromTwist(bottom, FaceName.PPP)
            const top = this.createTwist(faceTwistPoints(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), IntervalRole.NexusPush)
            return this.createOmniTwist(bottom, top)
        } else {
            return this.createTwist(firstTwistPoints(location, pushesPerTwist, spin, scale), scale, spin, IntervalRole.ColumnPush)
        }
    }

    private createOmniTwist(bottomTwist: ITwist, topTwist: ITwist): ITwist {
        const {scale} = bottomTwist
        const omniRoles = {ring: IntervalRole.Triangle, down: IntervalRole.Triangle, up: IntervalRole.Triangle}
        const connectPulls = this.connect(faceFromTwist(bottomTwist, FaceName.PPP), faceFromTwist(topTwist, FaceName.NNN), omniRoles)
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
            return this.tensegrity.createFace(ends, true, spin, scale, facePulls)
        }
        const topFace = topTwist.faces[1]
        const topTouching = topFace.ends.map(end => createFaceTouching(end, oppositeSpin(topFace.spin)))
        const bottomFace = bottomTwist.faces[0]
        const bottomTouching = bottomFace.ends.map(end => createFaceTouching(end, oppositeSpin(bottomFace.spin)))
        bottomFace.omni = topFace.omni = true
        const pushes = [...bottomTwist.pushes, ...topTwist.pushes]
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
            pulls.push(this.createInterval(b0, c0, scale, roles.ring))
            pulls.push(this.createInterval(c0, b1, scale, roles.ring))
            if (faceA.spin === Spin.Left) {
                pulls.push(this.createInterval(c0, a1, scale, roles.down))
            } else {
                pulls.push(this.createInterval(c0, a0, scale, roles.down))
            }
            if (faceB.spin === Spin.Left) {
                pulls.push(this.createInterval(b1, d0, scale, roles.up))
            } else {
                pulls.push(this.createInterval(b0, d0, scale, roles.up))
            }
        }
        this.tensegrity.removeFace(faceB)
        this.tensegrity.removeFace(faceA)
        return pulls
    }

    private createTwist(points: IPoint[], scale: IPercent, spin: Spin, columnRole: IntervalRole): ITwist {
        const ends = points.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createIJoint(alpha),
            omega: this.tensegrity.createIJoint(omega),
        }))
        this.tensegrity.instance.refreshFloatView()
        const alphaEnds = ends.map(({alpha}) => alpha)
        const omegaEnds = ends.map(({omega}) => omega).reverse()
        const alphaPulls = alphaEnds.map((alpha, index) =>
            this.createInterval(alpha, alphaEnds[(index + 1) % alphaEnds.length], scale, IntervalRole.Triangle))
        const alphaFace = this.tensegrity.createFace(alphaEnds, false, spin, scale, alphaPulls)
        const omegaPulls = omegaEnds.map((omega, index) =>
            this.createInterval(omega, omegaEnds[(index + 1) % omegaEnds.length], scale, IntervalRole.Triangle))
        const omegaFace = this.tensegrity.createFace(omegaEnds, false, spin, scale, omegaPulls)
        const twist: ITwist = {scale, pushes: [], pulls: [], faces: [alphaFace, omegaFace]}
        ends.forEach(({alpha, omega}) => {
            const push = this.createInterval(alpha, omega, scale, columnRole)
            twist.pushes.push(push)
            alpha.push = omega.push = push
        })
        ends.forEach(({alpha}, index) => {
            const offset = spin === Spin.Left ? ends.length - 1 : 1
            const omega = ends[(index + offset) % ends.length].omega
            twist.pulls.push(this.createInterval(alpha, omega, scale, IntervalRole.Triangle))
        })
        return twist
    }

    private createInterval(alpha: IJoint, omega: IJoint, scale: IPercent, intervalRole: IntervalRole): IInterval {
        const currentLength = jointDistance(alpha, omega)
        const idealLength = factorFromPercent(scale) * roleDefaultLength(intervalRole)
        const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown) * Math.abs(currentLength - idealLength)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        return this.tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, countdown)
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
        return {ring: IntervalRole.Ring, up: IntervalRole.Triangle, down: IntervalRole.Triangle}
    } else if (omniA && !omniB) {
        return {ring: IntervalRole.Ring, up: IntervalRole.Cross, down: IntervalRole.Triangle}
    } else if (!omniA && omniB) {
        return {ring: IntervalRole.Ring, up: IntervalRole.Triangle, down: IntervalRole.Cross}
    } else {
        throw new Error("Cannot create connected twist")
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
    const initialLength = roleDefaultLength(IntervalRole.Triangle) * factorFromPercent(scale) / Math.sqrt(3)
    const tinyRadius = initialLength * base.length / 3 / Math.sqrt(3)
    const points: IPoint[] = []
    const mid = midpoint(base)
    const up = normal(base).multiplyScalar(initialLength)
    for (let index = 0; index < base.length; index++) {
        const a = sub(base[(index + base.length-1) % base.length], mid)
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
