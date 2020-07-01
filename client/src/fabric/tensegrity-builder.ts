/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { roleDefaultLength } from "../pretenst"

import { IMark, MarkAction } from "./tenscript"
import { Tensegrity } from "./tensegrity"
import { scaleToInitialStiffness } from "./tensegrity-optimizer"
import {
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
    midpointFromFace,
    midpointFromFaces,
    oppositeSpin,
    otherJoint,
    percentFromFactor,
    Spin,
} from "./tensegrity-types"

const CYL_SIZE = 3

export class TensegrityBuilder {

    constructor(private tensegrity: Tensegrity) {
    }

    public createTwistAt(location: Vector3, spin: Spin, scale: IPercent, omni: boolean): ITwist {
        if (omni) {
            const bottom = this.createTwist(firstTwistPoints(location, spin, scale), scale, spin, IntervalRole.NexusPush)
            const bottomTopFace = faceFromTwist(bottom, FaceName.PPP)
            const top = this.createTwist(faceTwistPoints(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), IntervalRole.NexusPush)
            return this.createOmniTwist(bottom, top)
        } else {
            return this.createTwist(firstTwistPoints(location, spin, scale), scale, spin, IntervalRole.ColumnPush)
        }
    }

    public createTwistOn(baseFace: IFace, twistScale: IPercent, omni: boolean): ITwist {
        const baseFactor = factorFromPercent(baseFace.scale)
        const scale = percentFromFactor(factorFromPercent(twistScale) * baseFactor)
        if (omni) {
            const bottom = this.createTwist(faceTwistPoints(baseFace, scale), scale, oppositeSpin(baseFace.spin), IntervalRole.NexusPush)
            const bottomTopFace = faceFromTwist(bottom, FaceName.PPP)
            const top = this.createTwist(faceTwistPoints(bottomTopFace, scale), scale, oppositeSpin(bottomTopFace.spin), IntervalRole.NexusPush)
            const twist = this.createOmniTwist(bottom, top)
            this.connectFace(baseFace, twist, connectRoles(baseFace.omni, omni))
            return twist
        } else {
            const points = faceTwistPoints(baseFace, scale)
            const twist = this.createTwist(points, scale, oppositeSpin(baseFace.spin), IntervalRole.ColumnPush)
            this.connectFace(baseFace, twist, connectRoles(baseFace.omni, omni))
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
            const where = midpointFromFaces(faces)
            const omniTwist = this.createTwistAt(where, Spin.Left, scale, true)
            this.tensegrity.instance.refreshFloatView()
            return faces.map(face => {
                const opposing = omniTwist.faces.filter(({spin, pulls}) => pulls.length > 0 && spin !== face.spin)
                const faceLocation = midpointFromFace(face)
                const closestFace = opposing.reduce((a, b) => {
                    const aa = midpointFromFace(a).distanceTo(faceLocation)
                    const bb = midpointFromFace(b).distanceTo(faceLocation)
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
        const connectFaceInterval = ({alpha, omega, scaleFactor}: IFaceInterval) => {
            console.error("NOT YET IMPLEMENTED")
            // const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
            // this.connectFaces(alpha, omega, percentFromFactor(scaleFactor), countdown)
        }
        return faceIntervals.filter(faceInterval => {
            if (faceInterval.connector) {
                const {alpha, omega, scaleFactor} = faceInterval
                const distance = midpointFromFace(alpha).distanceTo(midpointFromFace(omega))
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

    private createOmniTwist(bottomTwist: ITwist, topTwist: ITwist): ITwist {
        const {scale} = bottomTwist
        const omniRoles = {ring: IntervalRole.Triangle, down: IntervalRole.Triangle, up: IntervalRole.Triangle}
        this.connectFace(faceFromTwist(bottomTwist, FaceName.PPP), topTwist, omniRoles)
        const pulls = [...bottomTwist.pulls, ...topTwist.pulls]
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
            const face = <IFace>{index: this.createFace(ends), omni: true, spin, scale, ends, pulls: facePulls}
            this.tensegrity.faces.push(face)
            return face
        }
        const topFace = topTwist.faces[1]
        const topTouching = topFace.ends.map(end => createFaceTouching(end, oppositeSpin(topFace.spin)))
        const bottomFace = bottomTwist.faces[0]
        const bottomTouching = bottomFace.ends.map(end => createFaceTouching(end, oppositeSpin(bottomFace.spin)))
        bottomFace.omni = topFace.omni = true
        const pushes = [...bottomTwist.pushes, ...topTwist.pushes]
        const faces = [bottomFace, ...bottomTouching, ...topTouching, topFace]
        return {scale, pushes, pulls, faces, bottomTwist}
    }

    private connectFace(baseFace: IFace, twist: ITwist, roles: IConnectRoles): void {
        const nnn = faceFromTwist(twist, FaceName.NNN)
        const ppp = faceFromTwist(twist.bottomTwist ? twist.bottomTwist : twist, FaceName.PPP)
        const baseEnds = [...baseFace.ends].reverse()
        const a = baseEnds.map(baseEnd => otherJoint(baseEnd))
        const b = baseEnds
        const c = nnn.ends
        const d = [...ppp.ends].reverse()
        const scale = percentFromFactor((factorFromPercent(baseFace.scale) + factorFromPercent(twist.scale)) / 2)
        const offsetA = baseFace.spin === Spin.Left ? 1 : 0
        const offsetB = nnn.spin === Spin.Left ? 1 : 0
        const pulls = twist.pulls
        for (let index = 0; index < baseFace.ends.length; index++) {
            pulls.push(this.createInterval(b[index], c[index], scale, roles.ring))
            pulls.push(this.createInterval(c[index], b[(index + 1) % b.length], scale, roles.ring))
            pulls.push(this.createInterval(c[index], a[(index + offsetA) % a.length], scale, roles.down))
            pulls.push(this.createInterval(b[(index + offsetB) % b.length], d[index], scale, roles.up))
        }
        this.tensegrity.removeFace(nnn)
        this.tensegrity.removeFace(baseFace)
    }

    private createTwist(points: IPoint[], scale: IPercent, spin: Spin, columnRole: IntervalRole): ITwist {
        const ends = points.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createIJoint(alpha),
            omega: this.tensegrity.createIJoint(omega),
        }))
        this.tensegrity.instance.refreshFloatView()
        const alphaEnds = ends.map(({alpha}) => alpha)
        const omegaEnds = ends.map(({omega}) => omega).reverse()
        const alphaFace: IFace = {
            index: this.createFace(alphaEnds),
            spin, scale, ends: alphaEnds, omni: false,
            pulls: alphaEnds.map((alpha, index) =>
                this.createInterval(alpha, alphaEnds[(index + 1) % alphaEnds.length], scale, IntervalRole.Triangle)),
        }
        const omegaFace: IFace = {
            index: this.createFace(omegaEnds),
            spin, scale, ends: omegaEnds, omni: false,
            pulls: omegaEnds.map((omega, index) =>
                this.createInterval(omega, omegaEnds[(index + 1) % omegaEnds.length], scale, IntervalRole.Triangle)),
        }
        this.tensegrity.faces.push(alphaFace, omegaFace)
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

    private createFace(ends: IJoint[]): number {
        return this.tensegrity.fabric.create_face(ends[0].index, ends[1].index, ends[2].index)
    }

    private createInterval(alpha: IJoint, omega: IJoint, scale: IPercent, intervalRole: IntervalRole): IInterval {
        const currentLength = alpha.location().distanceTo(omega.location())
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

function connectRoles(baseOmni: boolean, twistOmni: boolean): IConnectRoles {
    if (!baseOmni && !twistOmni) {
        return {ring: IntervalRole.Ring, up: IntervalRole.Triangle, down: IntervalRole.Triangle}
    } else if (baseOmni && !twistOmni) {
        return {ring: IntervalRole.Ring, up: IntervalRole.Cross, down: IntervalRole.Triangle}
    } else if (!baseOmni && twistOmni) {
        return {ring: IntervalRole.Ring, up: IntervalRole.Triangle, down: IntervalRole.Cross}
    } else {
        throw new Error("Cannot create connected twist")
    }
}

interface IPoint {
    alpha: Vector3
    omega: Vector3
}

function firstTwistPoints(location: Vector3, spin: Spin, scale: IPercent): IPoint[] {
    const base: Vector3[] = []
    for (let index = 0; index < CYL_SIZE; index++) {
        const angle = index * Math.PI * 2 / CYL_SIZE
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        base.push(new Vector3(x, 0, y).add(location))
    }
    return twistPoints(location, base, spin, scale)
}

function faceTwistPoints(face: IFace, scale: IPercent): IPoint[] {
    const midpoint = midpointFromFace(face)
    const base = face.ends.map(end => end.location()).reverse()
    return twistPoints(midpoint, base, oppositeSpin(face.spin), scale)
}

function twistPoints(midpoint: Vector3, base: Vector3[], spin: Spin, scale: IPercent): IPoint[] {
    const initialLength = roleDefaultLength(IntervalRole.Triangle) * factorFromPercent(scale) / Math.sqrt(3)
    const tinyRadius = initialLength / Math.sqrt(3)
    const points: IPoint[] = []
    const sub = (a: Vector3, b: Vector3) => new Vector3().subVectors(a, b).normalize()
    const between = (a: Vector3, b: Vector3) => new Vector3().addVectors(a, b).normalize()
    const up = new Vector3().crossVectors(sub(base[2], base[0]), sub(base[1], base[0])).normalize().multiplyScalar(initialLength)
    const mid = () => new Vector3().copy(midpoint)
    for (let index = 0; index < base.length; index++) {
        const a = sub(base[index], midpoint)
        const b = sub(base[(index + 1) % base.length], midpoint)
        const c = sub(base[(index + 2) % base.length], midpoint)
        const ab = between(a, b)
        const bc = between(b, c)
        const ca = between(c, a)
        const alpha = mid()
        const omega = mid().add(up)
        if (spin === Spin.Left) {
            alpha.addScaledVector(ab, tinyRadius)
            omega.addScaledVector(bc, tinyRadius)
        } else {
            alpha.addScaledVector(ab, tinyRadius)
            omega.addScaledVector(ca, tinyRadius)
        }
        points.push({alpha, omega})
    }
    return points
}
