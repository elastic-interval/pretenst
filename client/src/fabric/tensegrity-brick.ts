/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IntervalRole, Laterality } from "./fabric-exports"
import { TensegrityFabric } from "./tensegrity-fabric"

const PHI = 1.618
const BAR_SPAN = 5.5
const TRIANGLE_SPAN = 1
const RING_SPAN = 0.01
const CROSS_SPAN = 1

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
    return rayVector(primaryRay).multiplyScalar(PHI).add(rayVector(secondaryRay))
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
    negative: boolean
    barEnds: BarEnd[]
    ringMember: Ring[]
}

const TRIANGLE_ARRAY: ITriangle[] = [
    {
        name: Triangle.NNN,
        negative: true,
        barEnds: [BarEnd.YNA, BarEnd.XNA, BarEnd.ZNA],
        ringMember: [Ring.NP, Ring.PN, Ring.PP],
    },
    {
        name: Triangle.PNN,
        negative: false,
        barEnds: [BarEnd.XNA, BarEnd.YPA, BarEnd.ZNO],
        ringMember: [Ring.PN, Ring.NN, Ring.NP],
    },
    {
        name: Triangle.NPN,
        negative: false,
        barEnds: [BarEnd.XNO, BarEnd.YNA, BarEnd.ZPA],
        ringMember: [Ring.PP, Ring.NP, Ring.NN],
    },
    {
        name: Triangle.NNP,
        negative: false,
        barEnds: [BarEnd.XPA, BarEnd.YNO, BarEnd.ZNA],
        ringMember: [Ring.NN, Ring.PN, Ring.PP],
    },
    {
        name: Triangle.NPP,
        negative: true,
        barEnds: [BarEnd.YNO, BarEnd.XPO, BarEnd.ZPA],
        ringMember: [Ring.PN, Ring.NP, Ring.NN],
    },
    {
        name: Triangle.PNP,
        negative: true,
        barEnds: [BarEnd.YPO, BarEnd.XPA, BarEnd.ZNO],
        ringMember: [Ring.PP, Ring.NN, Ring.NP],
    },
    {
        name: Triangle.PPN,
        negative: true,
        barEnds: [BarEnd.YPA, BarEnd.XNO, BarEnd.ZPO],
        ringMember: [Ring.NN, Ring.PP, Ring.PN],
    },
    {
        name: Triangle.PPP,
        negative: false,
        barEnds: [BarEnd.XPO, BarEnd.YPO, BarEnd.ZPO],
        ringMember: [Ring.NP, Ring.PP, Ring.PN],
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

function createBrickPointsOnOrigin(): Vector3 [] {
    const points = BAR_ARRAY.reduce(barsToPoints, [])
    const trianglePoints = TRIANGLE_ARRAY[Triangle.NNN].barEnds.map((barEnd: BarEnd) => points[barEnd]).reverse()
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
    const y = new Vector3().sub(midpoint).normalize()
    const z = new Vector3().crossVectors(y, x).normalize()
    const basis = new Matrix4().makeBasis(x, y, z)
    const fromBasis = new Matrix4().getInverse(basis).setPosition(new Vector3(0, midpoint.length(), 0))
    return points.map(p => p.applyMatrix4(fromBasis))
}

export type Joint = number
export type JointTag = number

export interface Interval {
    index: number
    alpha: Joint
    omega: Joint
    span: number
}

export interface IFace {
    index: number
    brick: IBrick
    triangle: Triangle
    joints: Joint[]
    cables: Interval[]
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
    return fabric.createJoint(jointTag, Laterality.BILATERAL_RIGHT, location.x, location.y, location.z)
}

function createInterval(fabric: TensegrityFabric, alpha: number, omega: number, intervalRole: IntervalRole, span: number): Interval {
    return {
        index: fabric.createInterval(alpha, omega, span, intervalRole, true),
        alpha, omega, span,
    }
}

function createFace(fabric: TensegrityFabric, brick: IBrick, triangle: Triangle): IFace {
    const joints = TRIANGLE_ARRAY[triangle].barEnds.map(barEnd => brick.joints[barEnd])
    const cables = [0, 1, 2].map(offset => brick.cables[triangle * 3 + offset])
    return <IFace>{
        index: fabric.createFace(joints[0], joints[1], joints[2]),
        brick,
        triangle,
        joints,
        cables,
    }
}

export interface IBrick {
    joints: Joint[]
    bars: Interval[]
    cables: Interval[]
    rings: Interval[][]
    faces: IFace[]
}

function createBrick(fabric: TensegrityFabric, points: Vector3[]): IBrick {
    const joints = points.map((p, index) => createJoint(fabric, index, p))
    const bars = BAR_ARRAY.map((bar: IBar, index: number) => {
        const alpha = joints[index * 2]
        const omega = joints[index * 2 + 1]
        return createInterval(fabric, alpha, omega, IntervalRole.BAR, BAR_SPAN)
    })
    const brick: IBrick = {joints, bars, cables: [], rings: [[], [], [], []], faces: []}
    const role = IntervalRole.TRI_CABLE
    TRIANGLE_ARRAY.forEach(triangle => {
        const triangleJoints = triangle.barEnds.map(barEnd => joints[barEnd])
        for (let walk = 0; walk < 3; walk++) {
            const interval = createInterval(fabric, triangleJoints[walk], triangleJoints[(walk + 1) % 3], role, TRIANGLE_SPAN)
            brick.cables.push(interval)
            brick.rings[triangle.ringMember[walk]].push(interval)
        }
    })
    TRIANGLE_ARRAY.forEach(triangle => {
        brick.faces.push(createFace(fabric, brick, triangle.name))
    })
    fabric.freshGeometry()
    return brick
}

export function createBrickOnOrigin(fabric: TensegrityFabric): IBrick {
    return createBrick(fabric, createBrickPointsOnOrigin())
}

export function createBrickOnTriangle(fabric: TensegrityFabric, brick: IBrick, triangle: Triangle): IBrick {
    const trianglePoints = brick.faces[triangle].joints.map(joint => fabric.getJointLocation(joint))
    const xform = xformToTriangle(trianglePoints)
    return createBrick(fabric, createBrickPointsOnOrigin().map(p => p.applyMatrix4(xform)))
}

export interface IBrickConnector {
    ringCables: Interval[]
    crossCables: Interval[]
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
            location: fabric.getJointLocation(joints[0]),
            opposite: joints[1],
            oppositeLocation: fabric.getJointLocation(joints[1]),
        }
    }
    const a = TRIANGLE_ARRAY[triangleA].barEnds.map(barEnd => [brickA.joints[barEnd], brickA.joints[oppositeEnd(barEnd)]]).map(toIJoint)
    const b = TRIANGLE_ARRAY[triangleB].barEnds.map(barEnd => [brickB.joints[barEnd], brickB.joints[oppositeEnd(barEnd)]]).map(toIJoint)
    const ring = jointsToRing(a.concat(b))
    const ringCables: Interval[] = []
    const crossCables: Interval[] = []
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
    fabric.removeFace(brickA.faces[triangleA])
    fabric.removeFace(brickB.faces[triangleB])
    fabric.freshGeometry()
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

    function intervalToString(indent: number): (interval: Interval) => string {
        return (interval: Interval) => {
            return `${"\t".repeat(indent)}(${interval.alpha}:${interval.omega})=${interval.span}`
        }
    }

    function faceToString(indent: number): (face: IFace) => string {
        return (face: IFace) => {
            return `${"\t".repeat(indent)}(${face.joints[0]}:${face.joints[1]}:${face.joints[2]})`
        }
    }

    const points = brick.joints.map(joint => fabric.getJointLocation(joint))
    const joints = points.map(vectorToString(2)).join("\n")
    const minHeight = points.reduce((height, point) => Math.min(height, point.y), Number.POSITIVE_INFINITY).toFixed(3)
    const maxHeight = points.reduce((height, point) => Math.max(height, point.y), Number.NEGATIVE_INFINITY).toFixed(3)
    const bars = brick.bars.map(bar => intervalToString(2)(bar)).join("\n")
    const cables = brick.cables.map(intervalToString(2)).join("\n")
    const faces = brick.faces.map(faceToString(2)).join("\n")
    return `Brick{\n\theight ${minHeight} to ${maxHeight}\n\n\tjoints:\n${joints}\n\tbars:\n${bars}\n\tcables:\n${cables}\n\tfaces:\n${faces}`
}

export function connectorToString(fabric: TensegrityFabric, connector: IBrickConnector): string {
    function intervalToString(indent: number): (interval: Interval) => string {
        return (interval: Interval) => {
            return `${"\t".repeat(indent)}(${interval.alpha}:${interval.omega})=${interval.span}`
        }
    }

    const ringCables = connector.ringCables.map(intervalToString(2)).join("\n")
    const crossCables = connector.crossCables.map(intervalToString(2)).join("\n")
    return `Connector{\n\tringCables:\n${ringCables}\n\tcrossCables:\n${crossCables}\n}`
}
