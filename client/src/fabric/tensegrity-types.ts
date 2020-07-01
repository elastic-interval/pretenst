/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole } from "eig"
import { Matrix4, Vector3 } from "three"

import { JOINT_RADIUS } from "../pretenst"

import { intervalRoleName } from "./eig-util"

export enum Spin {Left, Right}

export function oppositeSpin(spin: Spin): Spin {
    switch (spin) {
        case Spin.Left:
            return Spin.Right
        case Spin.Right:
            return Spin.Left
    }
}

export enum FaceName {NNN = 0, PNN, NPN, NNP, NPP, PNP, PPN, PPP}

export const FACE_NAMES = [FaceName.NNN, FaceName.PNN, FaceName.NPN, FaceName.NNP, FaceName.NPP, FaceName.PNP, FaceName.PPN, FaceName.PPP]

export const FACE_DIRECTIONS = "aBCDbcdA"

export interface IJoint {
    index: number
    push?: IInterval
    location: () => Vector3
}

export interface IInterval {
    index: number
    isPush: boolean
    removed: boolean
    intervalRole: IntervalRole
    scale: IPercent
    alpha: IJoint
    omega: IJoint
    location: () => Vector3
    strainNuance: () => number
}

export function acrossPush(joint: IJoint): IJoint {
    if (!joint.push) {
        throw new Error("No push")
    }
    const push = joint.push
    if (push.alpha.index === joint.index) {
        return push.omega
    }
    if (push.omega.index === joint.index) {
        return push.alpha
    }
    throw new Error("Big problem")
}

export function otherJoint(joint: IJoint, interval: IInterval): IJoint {
    if (interval.alpha.index === joint.index) {
        return interval.omega
    }
    if (interval.omega.index === joint.index) {
        return interval.alpha
    }
    throw new Error("No other joint")
}

export interface IFaceMark {
    _: number
}

export interface IFace {
    index: number
    omni: boolean
    spin: Spin
    scale: IPercent
    pulls: IInterval[]
    ends: IJoint[]
    mark?: IFaceMark
}

export interface IFaceInterval {
    index: number
    alpha: IFace
    omega: IFace
    connector: boolean
    scaleFactor: number
    removed: boolean
}

export interface IFaceAnchor {
    index: number
    alpha: IFace
    omega: IJoint
    removed: boolean
}

export function rotateForBestRing(alpha: IFace, omega: IFace): void {
    const alphaEnds = [...alpha.ends].reverse()
    const omegaEnds = omega.ends
    const ringLengths: number[] = []
    for (let rotation = 0; rotation < alphaEnds.length; rotation++) {
        let ringLength = 0
        for (let walk = 0; walk < alphaEnds.length; walk++) {
            const rotatedWalk = (walk + rotation) % alphaEnds.length
            ringLength += alphaEnds[walk].location().distanceTo(omegaEnds[rotatedWalk].location())
            ringLength += omegaEnds[rotatedWalk].location().distanceTo(alphaEnds[(walk + 1) % alphaEnds.length].location())
        }
        ringLengths.push(ringLength)
    }
    let bestRotation = 0
    let minLength = length[bestRotation]
    ringLengths.forEach((length, index) => {
        if (length < minLength) {
            bestRotation = index
            minLength = length
        }
    })
    if (bestRotation > 0) {
        omega.ends = omega.ends.map(({}, index) => omega.ends[(index + bestRotation) % omega.ends.length])
    }
}

export function intervalsFromFaces(faces: IFace[]): IInterval[] {
    return faces.reduce((accum, face) => {
        const unknown = (interval: IInterval) => !accum.some(existing => interval.index === existing.index)
        const pulls = face.pulls.filter(unknown)
        return [...accum, ...pulls]
    }, [] as IInterval[])
}

export function midpointFromFace(face: IFace): Vector3 {
    const midpoint = new Vector3()
    face.ends.forEach(end => midpoint.add(end.location()))
    return midpoint.multiplyScalar(1 / face.ends.length)
}

export function midpointFromFaces(faces: IFace[]): Vector3 {
    return faces
        .reduce((accum, face) => accum.add(midpointFromFace(face)), new Vector3())
        .multiplyScalar(1 / faces.length)
}

export interface IPercent {
    _: number
}

export function percentOrHundred(percent?: IPercent): IPercent {
    return percent ? percent : {_: 100.0}
}

export function factorFromPercent({_: percent}: IPercent): number {
    return percent / 100.0
}

export function percentFromFactor(factor: number): IPercent {
    const _ = factor * 100.0
    return {_}
}

export interface ITwist {
    faces: IFace[]
    scale: IPercent
    pushes: IInterval[]
    pulls: IInterval[]
}

export function locationFromTwist(twist: ITwist): Vector3 {
    const gatherJoints = (array: IJoint[], push: IInterval) => {
        array.push(push.alpha, push.omega)
        return array
    }
    return twist.pushes
        .reduce(gatherJoints, [])
        .reduce((loc, joint) => loc.add(joint.location()), new Vector3())
        .multiplyScalar(1 / (twist.pushes.length * 2))
}

export function faceFromTwist(twist: ITwist, faceName: FaceName): IFace {
    switch (twist.faces.length) {
        case 2:
            switch (faceName) {
                case FaceName.NNN:
                    return twist.faces[0]
                case FaceName.PPP:
                    return twist.faces[1]
            }
            break
        case 8: // aBCDbcdA
            switch (faceName) {
                case FaceName.NNN: // a
                    return twist.faces[0]
                case FaceName.PNN: // B
                    return twist.faces[1]
                case FaceName.NPN: // C
                    return twist.faces[2]
                case FaceName.NNP: // D
                    return twist.faces[3]
                case FaceName.NPP: // b
                    return twist.faces[4]
                case FaceName.PNP: // c
                    return twist.faces[5]
                case FaceName.PPN: // d
                    return twist.faces[6]
                case FaceName.PPP: // A
                    return twist.faces[7]
            }
            break
    }
    throw new Error(`Face ${FaceName[faceName]} not found in twist with ${twist.faces.length} faces`)
}

export function faceConnectorLengthFromScale(scaleFactor: number): number {
    return 0.6 * scaleFactor
}

export interface IChord {
    holeIndex: number
    length: number
}

export interface IJointHole {
    index: number
    interval: number
    role: string
    oppositeJoint: number
    chords: IChord[]
}

interface IAdjacentInterval {
    interval: IInterval
    unit: Vector3
    hole: IJointHole
}

export function jointHolesFromJoint(here: IJoint, intervals: IInterval[]): IJointHole[] {
    const touching = intervals.filter(interval => interval.alpha.index === here.index || interval.omega.index === here.index)
    const push = touching.find(interval => interval.isPush)
    if (!push) {
        return []
    }
    const unitFromHere = (interval: IInterval) => new Vector3()
        .subVectors(otherJoint(here, interval).location(), here.location()).normalize()
    const pushUnit = unitFromHere(push)
    const adjacent = touching
        .map(interval => (<IAdjacentInterval>{
            interval,
            unit: unitFromHere(interval),
            hole: <IJointHole>{
                index: 0, // assigned below
                interval: interval.index,
                role: intervalRoleName(interval.intervalRole),
                oppositeJoint: otherJoint(here, interval).index,
                chords: [],
            },
        }))
        .sort((a: IAdjacentInterval, b: IAdjacentInterval) => {
            const pushToA = a.unit.dot(pushUnit)
            const pushToB = b.unit.dot(pushUnit)
            return pushToA < pushToB ? 1 : pushToA > pushToB ? -1 : 0
        })
    adjacent.forEach((a, index) => a.hole.index = index)
    const compareDot = (unit: Vector3) => (a: IAdjacentInterval, b: IAdjacentInterval) => {
        const pushToA = a.unit.dot(unit)
        const pushToB = b.unit.dot(unit)
        return pushToA < pushToB ? 1 : pushToA > pushToB ? -1 : 0
    }
    adjacent.forEach(from => {
        adjacent
            .filter(a => a.hole.index !== from.hole.index)
            .sort(compareDot(from.unit))
            .forEach(other => {
                const angle = Math.acos(from.unit.dot(other.unit))
                const length = 2 * Math.sin(angle / 2) * JOINT_RADIUS
                from.hole.chords.push(<IChord>{holeIndex: other.hole.index, length})
            })
    })
    return adjacent.map(({hole}: IAdjacentInterval) => hole)
}

export function averageScaleFactor(faces: IFace[]): number {
    return faces.reduce((sum, face) => sum + factorFromPercent(face.scale), 0) / faces.length
}

export function faceToOriginMatrix(face: IFace): Matrix4 {
    const trianglePoints = face.ends.map(end => end.location())
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
    const z = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
    const y = new Vector3().crossVectors(x, z).normalize()
    z.crossVectors(x, y).normalize()
    const faceBasis = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
    return new Matrix4().getInverse(faceBasis)
}

