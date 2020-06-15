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

export enum Triangle {
    NNN = 0, PNN, NPN, NNP, NPP, PNP, PPN, PPP,
}

export const TRIANGLES = [Triangle.NNN, Triangle.PNN, Triangle.NPN, Triangle.NNP, Triangle.NPP, Triangle.PNP, Triangle.PPN, Triangle.PPP]

export const TRIANGLE_DIRECTIONS = "aBCDbcdA"

export enum Ring {
    NN = 0, // [PushEnd.ZNO, PushEnd.XPA, PushEnd.YNO, PushEnd.ZPA, PushEnd.XNO, PushEnd.YPA],
    PN = 1, // [PushEnd.YNA, PushEnd.XNA, PushEnd.ZNO, PushEnd.YPO, PushEnd.XPO, PushEnd.ZPA],
    NP = 2, // [PushEnd.XNA, PushEnd.YPA, PushEnd.ZPO, PushEnd.XPO, PushEnd.YNO, PushEnd.ZNA],
    PP = 3, // [PushEnd.YNA, PushEnd.ZNA, PushEnd.XPA, PushEnd.YPO, PushEnd.ZPO, PushEnd.XNO],
}

export interface IJoint {
    index: number
    oppositeIndex: number
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

export function oppositeJoint(interval: IInterval, joint: IJoint): IJoint {
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
        .subVectors(oppositeJoint(interval, here).location(), here.location()).normalize()
    const pushUnit = unitFromHere(push)
    const adjacent = touching
        .map(interval => (<IAdjacentInterval>{
            interval,
            unit: unitFromHere(interval),
            hole: <IJointHole>{
                index: 0, // assigned below
                interval: interval.index,
                role: intervalRoleName(interval.intervalRole),
                oppositeJoint: oppositeJoint(interval, here).index,
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

export interface IFace {
    index: number
    negative: boolean
    brick: IBrick
    triangle: Triangle
    joints: IJoint[]
    pushes: IInterval[]
    pulls: IInterval[]
    mark?: IFaceMark
    removed: boolean
    location: () => Vector3
}

export function averageScaleFactor(faces: IFace[]): number {
    return faces.reduce((sum, face) => sum + percentToFactor(face.brick.scale), 0) / faces.length
}

export function averageLocation(locations: Vector3[]): Vector3 {
    return locations
        .reduce((sum, location) => sum.add(location), new Vector3())
        .multiplyScalar(1 / locations.length)
}

export function intervalsOfFaces(faces: IFace[]): IInterval[] {
    return faces.reduce((accum, face) => {
        const unknown = (interval: IInterval) => !accum.some(existing => interval.index === existing.index)
        const pulls = face.pulls.filter(unknown)
        const pushes = face.pushes.filter(unknown)
        return [...accum, ...pushes, ...pulls]
    }, [] as IInterval[])
}

export function facesMidpoint(faces: IFace[]): Vector3 {
    return faces
        .reduce((accum, face) => accum.add(face.location()), new Vector3())
        .multiplyScalar(1 / faces.length)
}

export function faceToOriginMatrix(face: IFace): Matrix4 {
    const trianglePoints = face.joints.map(joint => joint.location())
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
    const z = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
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

export interface ITriangleDefinition {
    name: Triangle
    opposite: Triangle
    negative: boolean
    pushEnds: PushEnd[]
    ringMember: Ring[]
    ring: Ring
}

export const TRIANGLE_DEFINITIONS: ITriangleDefinition[] = [
    {
        name: Triangle.NNN, opposite: Triangle.PPP, negative: true, ring: Ring.NN,
        pushEnds: [PushEnd.YNA, PushEnd.XNA, PushEnd.ZNA], ringMember: [Ring.NP, Ring.PN, Ring.PP],
    },
    {
        name: Triangle.PNN, opposite: Triangle.NPP, negative: false, ring: Ring.PP,
        pushEnds: [PushEnd.XNA, PushEnd.YPA, PushEnd.ZNO], ringMember: [Ring.PN, Ring.NN, Ring.NP],
    },
    {
        name: Triangle.NPN, opposite: Triangle.PNP, negative: false, ring: Ring.PN,
        pushEnds: [PushEnd.XNO, PushEnd.YNA, PushEnd.ZPA], ringMember: [Ring.PP, Ring.NP, Ring.NN],
    },
    {
        name: Triangle.NNP, opposite: Triangle.PPN, negative: false, ring: Ring.NP,
        pushEnds: [PushEnd.XPA, PushEnd.YNO, PushEnd.ZNA], ringMember: [Ring.NN, Ring.PN, Ring.PP],
    },
    {
        name: Triangle.NPP, opposite: Triangle.PNN, negative: true, ring: Ring.PP,
        pushEnds: [PushEnd.YNO, PushEnd.XPO, PushEnd.ZPA], ringMember: [Ring.PN, Ring.NP, Ring.NN],
    },
    {
        name: Triangle.PNP, opposite: Triangle.NPN, negative: true, ring: Ring.PN,
        pushEnds: [PushEnd.YPO, PushEnd.XPA, PushEnd.ZNO], ringMember: [Ring.PP, Ring.NN, Ring.NP],
    },
    {
        name: Triangle.PPN, opposite: Triangle.NNP, negative: true, ring: Ring.NP,
        pushEnds: [PushEnd.YPA, PushEnd.XNO, PushEnd.ZPO], ringMember: [Ring.NN, Ring.PP, Ring.PN],
    },
    {
        name: Triangle.PPP, opposite: Triangle.NNN, negative: false, ring: Ring.NN,
        pushEnds: [PushEnd.XPO, PushEnd.YPO, PushEnd.ZPO], ringMember: [Ring.NP, Ring.PP, Ring.PN],
    },
]

export function oppositeTriangle(triangle: Triangle): Triangle {
    return TRIANGLE_DEFINITIONS[triangle].opposite
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
    parentFace?: IFace,
    base: Triangle
    scale: IPercent
    joints: IJoint[]
    pushes: IInterval[]
    pulls: IInterval[]
    crosses: IInterval[]
    rings: IInterval[][]
    faces: IFace[]
    negativeAdjacent: number
    postiveAdjacent: number
    location: () => Vector3
}

export function isNexus(brick: IBrick): boolean {
    return brick.negativeAdjacent > 1 || brick.postiveAdjacent > 1
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

export function initialBrick(base: Triangle, scale: IPercent, parent?: IFace): IBrick {
    return {
        parentFace: parent, base, scale, joints: [],
        pushes: [], pulls: [], crosses: [],
        rings: [[], [], [], []], faces: [],
        negativeAdjacent: 0, postiveAdjacent: 0,
        location: () => new Vector3(),
    }
}

export function createBrickPointsAt(base: Triangle, scale: IPercent, position: Vector3): Vector3 [] {
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

