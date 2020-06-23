/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole } from "eig"
import { Matrix4, Vector3 } from "three"

import { JOINT_RADIUS } from "../pretenst"

import { intervalRoleName } from "./eig-util"

export const PHI = 1.61803398875
export const DEFAULT_PUSH_LENGTH = Math.sqrt(2)

export enum Ray {
    XP = 0, XN, YP, YN, ZP, ZN,
}

export enum PushEnd {
    XPA = 0, XPO, XNA, XNO, YPA, YPO,
    YNA, YNO, ZPA, ZPO, ZNA, ZNO,
}

export enum FaceName {
    NNN = 0, PNN, NPN, NNP, NPP, PNP, PPN, PPP,
}

export const FACE_NAMES = [FaceName.NNN, FaceName.PNN, FaceName.NPN, FaceName.NNP, FaceName.NPP, FaceName.PNP, FaceName.PPN, FaceName.PPP]

export const BRICK_FACE_DIRECTIONS = "aBCDbcdA"

export enum BrickRing {
    NN = 0, // [PushEnd.ZNO, PushEnd.XPA, PushEnd.YNO, PushEnd.ZPA, PushEnd.XNO, PushEnd.YPA],
    PN = 1, // [PushEnd.YNA, PushEnd.XNA, PushEnd.ZNO, PushEnd.YPO, PushEnd.XPO, PushEnd.ZPA],
    NP = 2, // [PushEnd.XNA, PushEnd.YPA, PushEnd.ZPO, PushEnd.XPO, PushEnd.YNO, PushEnd.ZNA],
    PP = 3, // [PushEnd.YNA, PushEnd.ZNA, PushEnd.XPA, PushEnd.YPO, PushEnd.ZPO, PushEnd.XNO],
}

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

export function otherJoint(interval: IInterval, joint: IJoint): IJoint {
    if (interval.alpha.index === joint.index) {
        return interval.omega
    }
    if (interval.omega.index === joint.index) {
        return interval.alpha
    }
    throw new Error("Other of what?")
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

export function gatherJointHoles(here: IJoint, intervals: IInterval[]): IJointHole[] {
    const touching = intervals.filter(interval => interval.alpha.index === here.index || interval.omega.index === here.index)
    const push = touching.find(interval => interval.isPush)
    if (!push) {
        return []
    }
    const unitFromHere = (interval: IInterval) => new Vector3()
        .subVectors(otherJoint(interval, here).location(), here.location()).normalize()
    const pushUnit = unitFromHere(push)
    const adjacent = touching
        .map(interval => (<IAdjacentInterval>{
            interval,
            unit: unitFromHere(interval),
            hole: <IJointHole>{
                index: 0, // assigned below
                interval: interval.index,
                role: intervalRoleName(interval.intervalRole),
                oppositeJoint: otherJoint(interval, here).index,
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

export interface IFaceInterval {
    index: number
    alpha: IBrickFace
    omega: IBrickFace
    connector: boolean
    scaleFactor: number
    removed: boolean
}

export interface IFaceAnchor {
    index: number
    alpha: IBrickFace
    omega: IJoint
    removed: boolean
}

export interface IBrickFace {
    faceName: FaceName
    index: number
    negative: boolean
    brick: IBrick
    joints: IJoint[]
    pushes: IInterval[]
    pulls: IInterval[]
    mark?: IFaceMark
    removed: boolean
    location: () => Vector3
}

export function averageScaleFactor(faces: IBrickFace[]): number {
    return faces.reduce((sum, face) => sum + percentToFactor(face.brick.scale), 0) / faces.length
}

export function averageLocation(locations: Vector3[]): Vector3 {
    return locations
        .reduce((sum, location) => sum.add(location), new Vector3())
        .multiplyScalar(1 / locations.length)
}

export function intervalsOfFaces(faces: IBrickFace[]): IInterval[] {
    return faces.reduce((accum, face) => {
        const unknown = (interval: IInterval) => !accum.some(existing => interval.index === existing.index)
        const pulls = face.pulls.filter(unknown)
        const pushes = face.pushes.filter(unknown)
        return [...accum, ...pushes, ...pulls]
    }, [] as IInterval[])
}

export function facesMidpoint(faces: IBrickFace[]): Vector3 {
    return faces
        .reduce((accum, face) => accum.add(face.location()), new Vector3())
        .multiplyScalar(1 / faces.length)
}

export function faceToOriginMatrix(face: IBrickFace): Matrix4 {
    const facePoints = face.joints.map(joint => joint.location())
    const midpoint = facePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(facePoints[1], midpoint).normalize()
    const z = new Vector3().subVectors(facePoints[0], midpoint).normalize()
    const y = new Vector3().crossVectors(z, x).normalize()
    z.crossVectors(x, y).normalize()
    const faceBasis = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
    return new Matrix4().getInverse(faceBasis)
}

export interface IPushDefinition {
    alpha: Vector3
    omega: Vector3
}

function rayVector(ray: Ray): Vector3 {
    const v = new Vector3()
    switch (ray) {
        case Ray.XP:
            return v.setX(1)
        case Ray.XN:
            return v.setX(-1)
        case Ray.YP:
            return v.setY(1)
        case Ray.YN:
            return v.setY(-1)
        case Ray.ZP:
            return v.setZ(1)
        case Ray.ZN:
            return v.setZ(-1)
        default:
            return v
    }
}

function brickPoint(primaryRay: Ray, secondaryRay: Ray): Vector3 {
    return rayVector(primaryRay)
        .multiplyScalar(DEFAULT_PUSH_LENGTH / 2)
        .addScaledVector(rayVector(secondaryRay), DEFAULT_PUSH_LENGTH / 2 / PHI)
}

export const PUSH_ARRAY: IPushDefinition[] = [
    {alpha: brickPoint(Ray.ZN, Ray.XP), omega: brickPoint(Ray.ZP, Ray.XP)},
    {alpha: brickPoint(Ray.ZN, Ray.XN), omega: brickPoint(Ray.ZP, Ray.XN)},
    {alpha: brickPoint(Ray.XN, Ray.YP), omega: brickPoint(Ray.XP, Ray.YP)},
    {alpha: brickPoint(Ray.XN, Ray.YN), omega: brickPoint(Ray.XP, Ray.YN)},
    {alpha: brickPoint(Ray.YN, Ray.ZP), omega: brickPoint(Ray.YP, Ray.ZP)},
    {alpha: brickPoint(Ray.YN, Ray.ZN), omega: brickPoint(Ray.YP, Ray.ZN)},
]

export interface IBrickFaceDef {
    name: FaceName
    opposite: FaceName
    negative: boolean
    pushEnds: PushEnd[]
    ringMember: BrickRing[]
    ring: BrickRing
}

export const BRICK_FACE_DEF: IBrickFaceDef[] = [
    {
        name: FaceName.NNN, opposite: FaceName.PPP, negative: true, ring: BrickRing.NN,
        pushEnds: [PushEnd.YNA, PushEnd.XNA, PushEnd.ZNA], ringMember: [BrickRing.NP, BrickRing.PN, BrickRing.PP],
    },
    {
        name: FaceName.PNN, opposite: FaceName.NPP, negative: false, ring: BrickRing.PP,
        pushEnds: [PushEnd.XNA, PushEnd.YPA, PushEnd.ZNO], ringMember: [BrickRing.PN, BrickRing.NN, BrickRing.NP],
    },
    {
        name: FaceName.NPN, opposite: FaceName.PNP, negative: false, ring: BrickRing.PN,
        pushEnds: [PushEnd.XNO, PushEnd.YNA, PushEnd.ZPA], ringMember: [BrickRing.PP, BrickRing.NP, BrickRing.NN],
    },
    {
        name: FaceName.NNP, opposite: FaceName.PPN, negative: false, ring: BrickRing.NP,
        pushEnds: [PushEnd.XPA, PushEnd.YNO, PushEnd.ZNA], ringMember: [BrickRing.NN, BrickRing.PN, BrickRing.PP],
    },
    {
        name: FaceName.NPP, opposite: FaceName.PNN, negative: true, ring: BrickRing.PP,
        pushEnds: [PushEnd.YNO, PushEnd.XPO, PushEnd.ZPA], ringMember: [BrickRing.PN, BrickRing.NP, BrickRing.NN],
    },
    {
        name: FaceName.PNP, opposite: FaceName.NPN, negative: true, ring: BrickRing.PN,
        pushEnds: [PushEnd.YPO, PushEnd.XPA, PushEnd.ZNO], ringMember: [BrickRing.PP, BrickRing.NN, BrickRing.NP],
    },
    {
        name: FaceName.PPN, opposite: FaceName.NNP, negative: true, ring: BrickRing.NP,
        pushEnds: [PushEnd.YPA, PushEnd.XNO, PushEnd.ZPO], ringMember: [BrickRing.NN, BrickRing.PP, BrickRing.PN],
    },
    {
        name: FaceName.PPP, opposite: FaceName.NNN, negative: false, ring: BrickRing.NN,
        pushEnds: [PushEnd.XPO, PushEnd.YPO, PushEnd.ZPO], ringMember: [BrickRing.NP, BrickRing.PP, BrickRing.PN],
    },
]

export function oppositeFace(face: FaceName): FaceName {
    return BRICK_FACE_DEF[face].opposite
}

export interface IFaceMark {
    _: number
}

export interface IPercent {
    _: number
}

export function percentOrHundred(percent?: IPercent): IPercent {
    return percent ? percent : {_: 100.0}
}

export function percentToFactor({_: percent}: IPercent): number {
    return percent / 100.0
}

export function factorToPercent(factor: number): IPercent {
    const _ = factor * 100.0
    return {_}
}

export interface IBrick {
    parentFace?: IBrickFace,
    base: FaceName
    scale: IPercent
    joints: IJoint[]
    pushes: IInterval[]
    pulls: IInterval[]
    crosses: IInterval[]
    rings: IInterval[][]
    faces: IBrickFace[]
    negativeAdjacent: number
    positiveAdjacent: number
    location: () => Vector3
}

export function isNexus(brick: IBrick): boolean {
    return brick.negativeAdjacent > 1 || brick.positiveAdjacent > 1
}

export function brickContaining(joint: IJoint, brickA: IBrick, brickB: IBrick): IBrick {
    const chooseA = !!brickA.joints.find(brickJoint => brickJoint.index === joint.index)
    const chooseB = !!brickB.joints.find(brickJoint => brickJoint.index === joint.index)
    if (chooseA && !chooseB) {
        return brickA
    } else if (chooseB && !chooseA) {
        return brickB
    } else {
        throw new Error("Neither contained joint")
    }
}

export function initialBrick(base: FaceName, scale: IPercent, parent?: IBrickFace): IBrick {
    return {
        parentFace: parent, base, scale, joints: [],
        pushes: [], pulls: [], crosses: [], faces: [],
        rings: [[], [], [], []],
        negativeAdjacent: 0, positiveAdjacent: 0,
        location: () => new Vector3(),
    }
}

export function createBrickPointsAt(base: FaceName, scale: IPercent, position: Vector3): Vector3 [] {
    const pushesToPoints = (vectors: Vector3[], push: IPushDefinition): Vector3[] => {
        vectors.push(new Vector3().add(push.alpha))
        vectors.push(new Vector3().add(push.omega))
        return vectors
    }
    const points = PUSH_ARRAY.reduce(pushesToPoints, [])
    const newBase = oppositeFace(base)
    const facePoints = BRICK_FACE_DEF[newBase].pushEnds.map((end: PushEnd) => points[end]).reverse()
    const midpoint = facePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(facePoints[0], midpoint).normalize()
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

export function toSymmetricalMatrix(joints: Vector3[], rotation: number): Matrix4 {
    const unit = (alpha: Vector3, omega: Vector3) => new Vector3().subVectors(omega, alpha).normalize()
    const x = unit(joints[4], joints[5])
    const y = unit(joints[0], joints[1])
    const z = unit(joints[8], joints[9])
    const midpoint = joints
        .reduce((m, joint) => m.add(joint), new Vector3())
        .multiplyScalar(1.0 / 12.0)
    const faceBasis = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
    const twirl = new Matrix4().makeRotationZ(Math.PI * 0.275)
    const rotate = new Matrix4().makeRotationY(-rotation * Math.PI / 3)
    return new Matrix4().getInverse(faceBasis.multiply(twirl).multiply(rotate))
}

