/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IntervalRole, intervalRoleName, isPushRole, JOINT_RADIUS, midpoint, sub } from "./eig-util"
import { FabricInstance } from "./fabric-instance"

export enum Spin {Left, Right}

export function oppositeSpin(spin: Spin): Spin {
    switch (spin) {
        case Spin.Left:
            return Spin.Right
        case Spin.Right:
            return Spin.Left
    }
}

export function spinChar(spin: Spin): string {
    return spin === Spin.Left ? "L" : "R"
}

export enum FaceName {NNN = 0, PNN, NPN, NNP, NPP, PNP, PPN, PPP}

export const FACE_NAMES = [FaceName.NNN, FaceName.PNN, FaceName.NPN, FaceName.NNP, FaceName.NPP, FaceName.PNP, FaceName.PPN, FaceName.PPP]

export const FACE_DIRECTIONS = "aBCDbcdA"

export interface IJoint {
    index: number
    push?: IInterval
    instance: FabricInstance
}

export function expectPush({push}: IJoint): IInterval {
    if (!push) {
        throw new Error("Expected push")
    }
    return push
}

export function jointLocation({instance, index}: IJoint): Vector3 {
    return instance.jointLocation(index)
}

export function jointDistance(a: IJoint, b: IJoint): number {
    return jointLocation(a).distanceTo(jointLocation(b))
}

export interface IInterval {
    index: number
    removed: boolean
    intervalRole: IntervalRole
    scale: IPercent
    alpha: IJoint
    omega: IJoint
}

export function intervalLocation({alpha, omega}: IInterval): Vector3 {
    return jointLocation(alpha).add(jointLocation(omega)).multiplyScalar(0.5)
}

export function intervalLength({alpha, omega}: IInterval): number {
    return jointDistance(alpha, omega)
}

export function intervalStrainNuance({alpha, index}: IInterval): number {
    return alpha.instance.floatView.strainNuances[index]
}

export function intervalJoins(a: IJoint, b: IJoint): (interval: IInterval) => boolean {
    return ({alpha, omega}: IInterval) =>
        alpha.index === a.index && omega.index === b.index || omega.index === a.index && alpha.index === b.index
}

export function intervalToString({intervalRole, alpha, omega}: IInterval): string {
    return `${intervalRoleName(intervalRole)}/${alpha.index}:${omega.index}`
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

export enum FaceSelection {
    None = "None",
    Face = "Face",
    Pulls = "Pulls",
    Pushes = "Pushes",
    Both = "Both",
}

export interface IFace {
    index: number
    omni: boolean
    spin: Spin
    scale: IPercent
    pulls: IInterval[]
    ends: IJoint[]
    pushes: IInterval[]
    faceSelection: FaceSelection
    mark?: IFaceMark
}

export interface IRadialPull {
    alpha: IFace
    omega: IFace
    axis: IInterval,
    alphaRays: IInterval[],
    omegaRays: IInterval[],
}

export function rotateForBestRing(alpha: IFace, omega: IFace): void {
    const alphaEnds = [...alpha.ends].reverse()
    const omegaEnds = omega.ends
    const ringLengths: number[] = []
    for (let rotation = 0; rotation < alphaEnds.length; rotation++) {
        let ringLength = 0
        for (let walk = 0; walk < alphaEnds.length; walk++) {
            const rotatedWalk = (walk + rotation) % alphaEnds.length
            ringLength += jointDistance(alphaEnds[walk], omegaEnds[rotatedWalk])
            ringLength += jointDistance(omegaEnds[rotatedWalk], alphaEnds[(walk + 1) % alphaEnds.length])
        }
        ringLengths.push(ringLength)
    }
    let bestRotation = 0
    let minLength = ringLengths[bestRotation]
    ringLengths.forEach((ringLength, index) => {
        if (ringLength < minLength) {
            bestRotation = index
            minLength = ringLength
        }
    })
    if (bestRotation > 0) {
        omega.ends = omega.ends.map(({}, index) => omega.ends[(index + bestRotation) % omega.ends.length])
    }
}

export function intervalsTouching(joints: IJoint[]): (interval: IInterval) => boolean {
    return ({alpha, omega}) =>
        joints.some(joint => joint.index === alpha.index || joint.index === omega.index)
}

export function intervalsFromFaces(faces: IFace[]): IInterval[] {
    return faces.reduce((accum, face) => {
        const unknown = (interval: IInterval) => !accum.some(existing => interval.index === existing.index)
        const pulls = face.pulls.filter(unknown)
        return [...accum, ...pulls]
    }, [] as IInterval[])
}

export function locationFromFace(face: IFace): Vector3 {
    return midpoint(face.ends.map(jointLocation))
}

export function normalFromFace(face: IFace): Vector3 {
    const origin = locationFromFace(face)
    const cross = new Vector3()
    const norm = new Vector3()
    const toEnds = face.ends.map(jointLocation).map(location => location.sub(origin))
    for (let index = 0; index < toEnds.length; index++) {
        cross.crossVectors(toEnds[index], toEnds[(index + 1) % toEnds.length]).normalize()
        norm.add(cross)
    }
    return norm.normalize()
}

export function locationFromJoints(joints: IJoint[]): Vector3 {
    return joints
        .reduce((accum, joint) => accum.add(jointLocation(joint)), new Vector3())
        .multiplyScalar(1 / joints.length)
}

export function locationFromFaces(faces: IFace[]): Vector3 {
    return faces
        .reduce((accum, face) => accum.add(locationFromFace(face)), new Vector3())
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
        .reduce((loc, joint) => loc.add(jointLocation(joint)), new Vector3())
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
                    return twist.faces[2]
                case FaceName.NPN: // C
                    return twist.faces[1]
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
    const push = touching.find(interval => isPushRole(interval.intervalRole))
    if (!push) {
        return []
    }
    const unitFromHere = (interval: IInterval) => new Vector3()
        .subVectors(jointLocation(otherJoint(here, interval)), jointLocation(here)).normalize()
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
    const trianglePoints = face.ends.map(jointLocation)
    const mid = midpoint(trianglePoints)
    const x = new Vector3().subVectors(trianglePoints[1], mid).normalize()
    const z = new Vector3().subVectors(trianglePoints[0], mid).normalize()
    const y = new Vector3().crossVectors(x, z).normalize()
    z.crossVectors(x, y).normalize()
    const faceBasis = new Matrix4().makeBasis(x, y, z).setPosition(mid)
    return new Matrix4().getInverse(faceBasis)
}

export function reorientMatrix(points: Vector3[], rotation: number): Matrix4 {
    const x = sub(points[0], points[1])
    const y = sub(points[3], points[2])
    const z = sub(points[5], points[4])
    const middle = points
        .reduce((sum, point) => sum.add(point), new Vector3())
        .multiplyScalar(1.0 / points.length)
    const faceBasis = new Matrix4().makeBasis(x, y, z).setPosition(middle)
    const twirl = new Matrix4().makeRotationX(Math.PI * -0.27)
    const rotate = new Matrix4().makeRotationY(-rotation * Math.PI / 3)
    return new Matrix4().getInverse(faceBasis.multiply(twirl).multiply(rotate))
}

export interface ISelection {
    faces: IFace[]
    intervals: IInterval[]
}

export function emptySelection(): ISelection {
    return {faces: [], intervals: []}
}

