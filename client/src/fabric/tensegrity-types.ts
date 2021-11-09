/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Quaternion, Vector3 } from "three"

import { DOWN, IntervalRole, intervalRoleName, sub, UP } from "./eig-util"
import { FabricInstance } from "./fabric-instance"
import { Twist } from "./twist"

export enum Spin {
    Left = "Left",
    Right = "Right",
    LeftRight = "Left-Right",
    RightLeft = "Right-Left",
}

export const SPINS = [Spin.Left, Spin.Right, Spin.LeftRight, Spin.RightLeft]

export function spinChange(spin: Spin, opposite: boolean, toOmni: boolean): Spin {
    if (opposite) {
        switch (spin) {
            case Spin.Left:
                return toOmni ? Spin.RightLeft : Spin.Right
            case Spin.Right:
                return toOmni ? Spin.LeftRight : Spin.Left
            case Spin.LeftRight:
                return Spin.RightLeft
            case Spin.RightLeft:
                return Spin.LeftRight
        }
    } else {
        switch (spin) {
            case Spin.Left:
                return toOmni ? Spin.LeftRight : spin
            case Spin.Right:
                return toOmni ? Spin.RightLeft : spin
            case Spin.LeftRight:
            case Spin.RightLeft:
                return spin
        }
    }
    throw new Error("Spin?")
}

export function isOmniSpin(spin: Spin): boolean {
    switch (spin) {
        case Spin.LeftRight:
        case Spin.RightLeft:
            return true
    }
    return false
}

export enum FaceName {a = 0, B, C, D, b, c, d, A}

export const FACE_NAMES = [FaceName.a, FaceName.B, FaceName.C, FaceName.D, FaceName.b, FaceName.c, FaceName.d, FaceName.A]

export const FACE_NAME_CHARS = "aBCDbcdA"

export function isFaceNameChar(char: string): boolean {
    return FACE_NAME_CHARS.indexOf(char) >= 0
}

export function faceNameFromChar(char: string): FaceName {
    const index = FACE_NAME_CHARS.indexOf(char)
    if (index < 0) {
        throw new Error(`[${char}] is not a face name`)
    }
    return FACE_NAMES[index]
}

export interface IJoint {
    index: number
    push?: IInterval
    pulls?: IInterval[]
}

export function expectPush({push}: IJoint): IInterval {
    if (!push) {
        throw new Error("Expected push")
    }
    return push
}

export function jointPulls({pulls}: IJoint): IInterval[] {
    if (!pulls) {
        throw new Error("no pulls")
    }
    return pulls
}

export interface IIntervalDetails {
    interval: IInterval
    strain: number
    length: number
    height: number
}

function indexKey(a: number, b: number): string {
    return a < b ? `(${a},${b})` : `(${b},${a})`
}

export function twoJointKey(alpha: IJoint, omega: IJoint): string {
    return indexKey(alpha.index, omega.index)
}

export interface IPair {
    alpha: IJoint
    omega: IJoint
    scale: IPercent
    intervalRole: IntervalRole
}

export function pairKey({alpha, omega}: IPair): string {
    return twoJointKey(alpha, omega)
}

export interface IInterval {
    index: number
    removed: boolean
    intervalRole: IntervalRole
    scale: IPercent
    alpha: IJoint
    omega: IJoint
}

export function intervalRotation(unit: Vector3): Quaternion {
    const dot = UP.dot(unit)
    return new Quaternion().setFromUnitVectors(dot > 0 ? UP : DOWN, unit)
}

export function areAdjacent(a: IInterval, b: IInterval): boolean {
    if (a.index === b.index) {
        return false
    }
    return a.alpha.index === b.alpha.index
        || a.omega.index === b.omega.index
        || a.alpha.index === b.omega.index
        || a.omega.index === b.alpha.index
}

export function filterRole(role: IntervalRole): (interval: IInterval) => boolean {
    return ({intervalRole}) => intervalRole === role
}

export function intervalToPair({alpha, omega, scale, intervalRole}: IInterval): IPair {
    return {alpha, omega, scale, intervalRole}
}

export function intervalKey({alpha, omega}: IInterval): string {
    return twoJointKey(alpha, omega)
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

export interface IMarkNumber {
    _: number
}

export interface IFace {
    twist: Twist,
    index: number
    spin: Spin
    scale: IPercent
    pulls: IInterval[]
    ends: IJoint[]
    pushes: IInterval[]
    markNumbers: IMarkNumber[]
    joint?: IJoint
}

export interface IRadialPull {
    alpha: IFace
    omega: IFace
    axis: IInterval,
    alphaRays: IInterval[],
    omegaRays: IInterval[],
}

export function rotateForBestRing(instance: FabricInstance, alpha: IFace, omega: IFace): void {
    const alphaEnds = [...alpha.ends].reverse()
    const omegaEnds = omega.ends
    const ringLengths: number[] = []
    for (let rotation = 0; rotation < alphaEnds.length; rotation++) {
        let ringLength = 0
        for (let walk = 0; walk < alphaEnds.length; walk++) {
            const rotatedWalk = (walk + rotation) % alphaEnds.length
            ringLength += instance.jointDistance(alphaEnds[walk], omegaEnds[rotatedWalk])
            ringLength += instance.jointDistance(omegaEnds[rotatedWalk], alphaEnds[(walk + 1) % alphaEnds.length])
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

export function intervalsFromFaces(faces: IFace[]): IInterval[] {
    return faces.reduce((accum, face) => {
        const unknown = (interval: IInterval) => !accum.some(existing => interval.index === existing.index)
        const pulls = face.pulls.filter(unknown)
        return [...accum, ...pulls]
    }, [] as IInterval[])
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

export interface IChord {
    holeIndex: number
    length: number
}

export function averageScaleFactor(faces: IFace[]): number {
    return faces.reduce((sum, face) => sum + factorFromPercent(face.scale), 0) / faces.length
}

export function reorientMatrix(points: Vector3[], rotation: number): Matrix4 {
    const x = sub(points[0], points[1])
    const y = sub(points[3], points[2])
    const z = sub(points[5], points[4])
    const middle = points
        .reduce((sum, point) => sum.add(point), new Vector3())
        .multiplyScalar(1.0 / points.length)
    const faceBasis = new Matrix4().makeBasis(x, y, z).setPosition(middle)
    const twirl = new Matrix4().makeRotationZ(Math.PI * -0.24)
    const rotate = new Matrix4().makeRotationY(-Math.PI / 2 - rotation * Math.PI / 3)
    return faceBasis.multiply(twirl).multiply(rotate).invert()
}
