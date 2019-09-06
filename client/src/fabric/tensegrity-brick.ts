/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IntervalRole, Laterality } from "./fabric-exports"
import { TensegrityFabric } from "./tensegrity-fabric"

const PHI = 1.61803398875
const PRETENSION = 1
const BAR_SPAN = 2 * PHI + PRETENSION * 2.5
const TRIANGLE_SPAN = 2 - PRETENSION
const RING_SPAN = TRIANGLE_SPAN / 4
const CROSS_SPAN = RING_SPAN / 2
const SETTLED_MIDPOINT = 0.83

enum Ray {
    XP = 0, XN, YP, YN, ZP, ZN,
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
    return rayVector(primaryRay).multiplyScalar(PHI).addScaledVector(rayVector(secondaryRay), SETTLED_MIDPOINT)
}

enum BarEnd {
    XPA = 0, XPO, XNA, XNO, YPA, YPO, YNA, YNO, ZPA, ZPO, ZNA, ZNO,
}

export function oppositeEnd(barEnd: BarEnd): BarEnd {
    return barEnd % 2 === 0 ? barEnd + 1 : barEnd - 1
}

interface IBar {
    alpha: Vector3
    omega: Vector3
}

const BAR_ARRAY: IBar[] = [
    {alpha: brickPoint(Ray.ZN, Ray.XP), omega: brickPoint(Ray.ZP, Ray.XP)},
    {alpha: brickPoint(Ray.ZN, Ray.XN), omega: brickPoint(Ray.ZP, Ray.XN)},
    {alpha: brickPoint(Ray.XN, Ray.YP), omega: brickPoint(Ray.XP, Ray.YP)},
    {alpha: brickPoint(Ray.XN, Ray.YN), omega: brickPoint(Ray.XP, Ray.YN)},
    {alpha: brickPoint(Ray.YN, Ray.ZP), omega: brickPoint(Ray.YP, Ray.ZP)},
    {alpha: brickPoint(Ray.YN, Ray.ZN), omega: brickPoint(Ray.YP, Ray.ZN)},
]

export enum Triangle {
    NNN = 0, PNN, NPN, NNP, NPP, PNP, PPN, PPP,
}

export enum Ring {
    NN = 0, // [BarEnd.ZNO, BarEnd.XPA, BarEnd.YNO, BarEnd.ZPA, BarEnd.XNO, BarEnd.YPA],
    PN = 1, // [BarEnd.YNA, BarEnd.XNA, BarEnd.ZNO, BarEnd.YPO, BarEnd.XPO, BarEnd.ZPA],
    NP = 2, // [BarEnd.XNA, BarEnd.YPA, BarEnd.ZPO, BarEnd.XPO, BarEnd.YNO, BarEnd.ZNA],
    PP = 3, // [BarEnd.YNA, BarEnd.ZNA, BarEnd.XPA, BarEnd.YPO, BarEnd.ZPO, BarEnd.XNO],
}

interface ITriangle {
    name: Triangle
    opposite: Triangle
    negative: boolean
    barEnds: BarEnd[]
    ringMember: Ring[]
    ring: Ring
}

const TRIANGLE_ARRAY: ITriangle[] = [
    {
        name: Triangle.NNN,
        opposite: Triangle.PPP,
        negative: true,
        barEnds: [BarEnd.YNA, BarEnd.XNA, BarEnd.ZNA],
        ringMember: [Ring.NP, Ring.PN, Ring.PP],
        ring: Ring.NN,
    },
    {
        name: Triangle.PNN,
        opposite: Triangle.NPP,
        negative: false,
        barEnds: [BarEnd.XNA, BarEnd.YPA, BarEnd.ZNO],
        ringMember: [Ring.PN, Ring.NN, Ring.NP],
        ring: Ring.PP,
    },
    {
        name: Triangle.NPN,
        opposite: Triangle.PNP,
        negative: false,
        barEnds: [BarEnd.XNO, BarEnd.YNA, BarEnd.ZPA],
        ringMember: [Ring.PP, Ring.NP, Ring.NN],
        ring: Ring.PN,
    },
    {
        name: Triangle.NNP,
        opposite: Triangle.PPN,
        negative: false,
        barEnds: [BarEnd.XPA, BarEnd.YNO, BarEnd.ZNA],
        ringMember: [Ring.NN, Ring.PN, Ring.PP],
        ring: Ring.NP,
    },
    {
        name: Triangle.NPP,
        opposite: Triangle.PNN,
        negative: true,
        barEnds: [BarEnd.YNO, BarEnd.XPO, BarEnd.ZPA],
        ringMember: [Ring.PN, Ring.NP, Ring.NN],
        ring: Ring.PP,
    },
    {
        name: Triangle.PNP,
        opposite: Triangle.NPN,
        negative: true,
        barEnds: [BarEnd.YPO, BarEnd.XPA, BarEnd.ZNO],
        ringMember: [Ring.PP, Ring.NN, Ring.NP],
        ring: Ring.PN,
    },
    {
        name: Triangle.PPN,
        opposite: Triangle.NNP,
        negative: true,
        barEnds: [BarEnd.YPA, BarEnd.XNO, BarEnd.ZPO],
        ringMember: [Ring.NN, Ring.PP, Ring.PN],
        ring: Ring.NP,
    },
    {
        name: Triangle.PPP,
        opposite: Triangle.NNN,
        negative: false,
        barEnds: [BarEnd.XPO, BarEnd.YPO, BarEnd.ZPO],
        ringMember: [Ring.NP, Ring.PP, Ring.PN],
        ring: Ring.NN,
    },
]

function barsToPoints(vectors: Vector3[], bar: IBar): Vector3[] {
    vectors.push(new Vector3().add(bar.alpha))
    vectors.push(new Vector3().add(bar.omega))
    return vectors
}

// function createBrickPointsUpright(): Vector3[] {
//     const points = BAR_ARRAY.reduce(barsToPoints, [])
//     points.forEach(p => {
//         const xx = p.x
//         p.x = p.z
//         p.y += PHI
//         p.z = xx
//     })
//     return points
// }

function createBrickPointsOnOrigin(base: Triangle, altitudeFactor: number, scale: number): Vector3 [] {
    const points = BAR_ARRAY.reduce(barsToPoints, [])
    points.forEach(point => point.multiplyScalar(scale))
    const trianglePoints = TRIANGLE_ARRAY[base].barEnds.map((barEnd: BarEnd) => points[barEnd]).reverse()
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
    const y = new Vector3().sub(midpoint).normalize()
    const z = new Vector3().crossVectors(y, x).normalize()
    const basis = new Matrix4().makeBasis(x, y, z)
    const fromBasis = new Matrix4().getInverse(basis).setPosition(new Vector3(0, midpoint.length() * altitudeFactor, 0))
    return points.map(p => p.applyMatrix4(fromBasis))
}

export type Joint = number
export type JointTag = number

export interface IInterval {
    index: number
    removed: boolean
    alpha: Joint
    omega: Joint
    span: number
}

export interface IFace {
    index: number
    canGrow: boolean
    brick: IBrick
    triangle: Triangle
    joints: Joint[]
    cables: IInterval[]
}

function xformToTriangle(trianglePoints: Vector3[]): Matrix4 {
    if (trianglePoints.length !== 3) {
        throw new Error()
    }
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const midSide = new Vector3().addVectors(trianglePoints[0], trianglePoints[1]).multiplyScalar(0.5)
    const x = new Vector3().subVectors(midSide, midpoint).normalize()
    const u = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
    const proj = new Vector3().add(x).multiplyScalar(x.dot(u))
    const z = u.sub(proj).normalize()
    const y = new Vector3().crossVectors(z, x).normalize()
    return new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
}

function createJoint(fabric: TensegrityFabric, jointTag: JointTag, location: Vector3): Joint {
    return fabric.exports.createJoint(jointTag, Laterality.BILATERAL_RIGHT, location.x, location.y, location.z)
}

function createInterval(fabric: TensegrityFabric, alpha: number, omega: number, intervalRole: IntervalRole, span: number): IInterval {
    return <IInterval>{
        index: fabric.exports.createInterval(alpha, omega, span, intervalRole, false),
        removed: false,
        alpha, omega, span,
    }
}

function createFace(fabric: TensegrityFabric, brick: IBrick, triangle: Triangle): IFace {
    const joints = TRIANGLE_ARRAY[triangle].barEnds.map(barEnd => brick.joints[barEnd])
    const cables = [0, 1, 2].map(offset => brick.cables[triangle * 3 + offset])
    return <IFace>{
        index: fabric.exports.createFace(joints[0], joints[1], joints[2]),
        canGrow: true,
        brick,
        triangle,
        joints,
        cables,
    }
}

export interface IBrick {
    base: Triangle
    joints: Joint[]
    bars: IInterval[]
    cables: IInterval[]
    rings: IInterval[][]
    faces: IFace[]
}

function createBrick(fabric: TensegrityFabric, points: Vector3[], base: Triangle): IBrick {
    const joints = points.map((p, index) => createJoint(fabric, index, p))
    const bars = BAR_ARRAY.map((bar: IBar, index: number) => {
        const alpha = joints[index * 2]
        const omega = joints[index * 2 + 1]
        return createInterval(fabric, alpha, omega, IntervalRole.BAR, BAR_SPAN)
    })
    const brick: IBrick = {base, joints, bars, cables: [], rings: [[], [], [], []], faces: []}
    const role = IntervalRole.TRI_CABLE
    TRIANGLE_ARRAY.forEach(triangle => {
        const triangleJoints = triangle.barEnds.map(barEnd => joints[barEnd])
        for (let walk = 0; walk < 3; walk++) {
            const interval = createInterval(fabric, triangleJoints[walk], triangleJoints[(walk + 1) % 3], role, TRIANGLE_SPAN)
            brick.cables.push(interval)
            brick.rings[triangle.ringMember[walk]].push(interval)
        }
    })
    TRIANGLE_ARRAY.forEach(triangle => brick.faces.push(createFace(fabric, brick, triangle.name)))
    return brick
}

export function createBrickOnOrigin(fabric: TensegrityFabric): IBrick {
    const base = Triangle.NNN
    return createBrick(fabric, createBrickPointsOnOrigin(base, 2.6, 1.0), base)
}

export function createBrickOnTriangle(fabric: TensegrityFabric, brick: IBrick, triangle: Triangle): IBrick {
    const trianglePoints = brick.faces[triangle].joints.map(joint => fabric.exports.getJointLocation(joint))
    const xform = xformToTriangle(trianglePoints)
    const base = TRIANGLE_ARRAY[triangle].negative ? Triangle.PPP : Triangle.NNN
    return createBrick(fabric, createBrickPointsOnOrigin(base, 0.8, 1.0).map(p => p.applyMatrix4(xform)), base)
}

export interface IBrickConnector {
    ringCables: IInterval[]
    crossCables: IInterval[]
}

interface IJoint {
    joint: Joint
    location: Vector3
    opposite: Joint
    oppositeLocation: Vector3
}

function jointsToRing(joints: IJoint[]): IJoint[] {
    const ring: IJoint[] = []
    while (joints.length > 0) {
        const ringEnd = ring[ring.length - 1]
        if (!ringEnd) {
            const anyJoint = joints.pop()
            if (!anyJoint) {
                throw new Error()
            }
            ring.push(anyJoint)
        } else {
            let closest: IJoint | undefined
            joints.forEach(otherJoint => {
                if (!closest) {
                    closest = otherJoint
                    return
                }
                const otherDistance = otherJoint.location.distanceTo(ringEnd.location)
                const closestDistance = closest.location.distanceTo(ringEnd.location)
                if (otherDistance < closestDistance) {
                    closest = otherJoint
                }
            })
            if (!closest) {
                throw new Error()
            }
            ring.push(closest)
            joints = joints.filter(j => closest && j.joint !== closest.joint)
        }
    }
    return ring
}

export function connectBricks(fabric: TensegrityFabric, brickA: IBrick, triangleA: Triangle, brickB: IBrick, triangleB: Triangle): IBrickConnector {
    const toIJoint = (joints: Joint[]): IJoint => {
        return {
            joint: joints[0],
            location: fabric.exports.getJointLocation(joints[0]),
            opposite: joints[1],
            oppositeLocation: fabric.exports.getJointLocation(joints[1]),
        }
    }
    const a = TRIANGLE_ARRAY[triangleA].barEnds.map(barEnd => [brickA.joints[barEnd], brickA.joints[oppositeEnd(barEnd)]]).map(toIJoint)
    const b = TRIANGLE_ARRAY[triangleB].barEnds.map(barEnd => [brickB.joints[barEnd], brickB.joints[oppositeEnd(barEnd)]]).map(toIJoint)
    const ring = jointsToRing(a.concat(b))
    const ringCables: IInterval[] = []
    const crossCables: IInterval[] = []
    for (let walk = 0; walk < ring.length; walk++) {
        const prevJoint = ring[(walk + ring.length - 1) % ring.length]
        const joint = ring[walk]
        const nextJoint = ring[(walk + 1) % ring.length]
        ringCables.push(createInterval(fabric, joint.joint, nextJoint.joint, IntervalRole.RING_CABLE, RING_SPAN))
        const prevOpposite = joint.location.distanceTo(prevJoint.oppositeLocation)
        const nextOpposite = joint.location.distanceTo(nextJoint.oppositeLocation)
        if (prevOpposite < nextOpposite) {
            crossCables.push(createInterval(fabric, joint.joint, prevJoint.opposite, IntervalRole.CROSS_CABLE, CROSS_SPAN))
        } else {
            crossCables.push(createInterval(fabric, joint.joint, nextJoint.opposite, IntervalRole.CROSS_CABLE, CROSS_SPAN))
        }
    }
    const removeFace = (triangle: Triangle, brick: IBrick) => {
        const face = brick.faces[triangle]
        fabric.removeFace(face, true)
        TRIANGLE_ARRAY.filter(t => t.opposite !== triangle && t.negative !== TRIANGLE_ARRAY[triangle].negative).forEach(t => {
            brick.faces[t.name].canGrow = false
        })
        const triangleRing = TRIANGLE_ARRAY[triangle].ring
        brick.rings[triangleRing].filter(interval => !interval.removed).forEach(interval => {
            fabric.exports.setIntervalRole(interval.index, IntervalRole.RING_CABLE)
            fabric.exports.setIntervalIdealSpan(interval.index, RING_SPAN)
        })
    }
    removeFace(triangleA, brickA)
    removeFace(triangleB, brickB)
    return {ringCables, crossCables}
}

export function brickToString(fabric: TensegrityFabric, brick: IBrick): string {
    // const points = brick.joints.map(joint => fabric.getJointLocation(joint))
    // const minHeight = points.reduce((height, point) => Math.min(height, point.y), Number.POSITIVE_INFINITY).toFixed(3)
    // const maxHeight = points.reduce((height, point) => Math.max(height, point.y), Number.NEGATIVE_INFINITY).toFixed(3)
    // return `Brick{\n\theight ${minHeight} to ${maxHeight}\n}`
    function vectorToString(indent: number): (vector: Vector3) => string {
        return vector => {
            const x = vector.x.toFixed(3)
            const y = vector.y.toFixed(3)
            const z = vector.z.toFixed(3)
            return `${"\t".repeat(indent)}(${x},${y},${z})`
        }
    }

    function intervalToString(indent: number): (interval: IInterval) => string {
        return (interval: IInterval) => {
            return `${"\t".repeat(indent)}(${interval.alpha}:${interval.omega})=${interval.span}`
        }
    }

    function faceToString(indent: number): (face: IFace) => string {
        return (face: IFace) => {
            return `${"\t".repeat(indent)}(${face.joints[0]}:${face.joints[1]}:${face.joints[2]})`
        }
    }

    const points = brick.joints.map(joint => fabric.exports.getJointLocation(joint))
    const joints = points.map(vectorToString(2)).join("\n")
    const minHeight = points.reduce((height, point) => Math.min(height, point.y), Number.POSITIVE_INFINITY).toFixed(3)
    const maxHeight = points.reduce((height, point) => Math.max(height, point.y), Number.NEGATIVE_INFINITY).toFixed(3)
    const bars = brick.bars.map(bar => intervalToString(2)(bar)).join("\n")
    const cables = brick.cables.map(intervalToString(2)).join("\n")
    const faces = brick.faces.map(faceToString(2)).join("\n")
    return `Brick{\n\theight ${minHeight} to ${maxHeight}\n\n\tjoints:\n${joints}\n\tbars:\n${bars}\n\tcables:\n${cables}\n\tfaces:\n${faces}`
}

export function connectorToString(fabric: TensegrityFabric, connector: IBrickConnector): string {
    function intervalToString(indent: number): (interval: IInterval) => string {
        return (interval: IInterval) => {
            return `${"\t".repeat(indent)}(${interval.alpha}:${interval.omega})=${interval.span}`
        }
    }

    const ringCables = connector.ringCables.map(intervalToString(2)).join("\n")
    const crossCables = connector.crossCables.map(intervalToString(2)).join("\n")
    return `Connector{\n\tringCables:\n${ringCables}\n\tcrossCables:\n${crossCables}\n}`
}
