/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IFabricInstanceExports, IntervalRole, Laterality } from "./fabric-exports"

export enum Triangle {
    NNN = 0, PNN, NPN, NNP, NPP, PNP, PPN, PPP,
}

export interface IBrick {
    joints: Joint[]
    bars: Interval[]
    cables: Interval[]
    faces: IFace[]
}

const PHI = 1.618
const BAR_SPAN = PHI * 2
const CABLE_SPAN = 0.1

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

// function oppositeEnd(barEnd: BarEnd): BarEnd {
//     return barEnd % 2 === 0 ? barEnd + 1 : barEnd - 1
// }

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

const TRIANGLE_ARRAY: BarEnd[][] = [
    /*NNN*/ [BarEnd.YNA, BarEnd.XNA, BarEnd.ZNA],
    /*PNN*/ [BarEnd.XNA, BarEnd.YPA, BarEnd.ZNO], // NNN share XNA
    /*NPN*/ [BarEnd.XNO, BarEnd.YNA, BarEnd.ZPA], // NNN share YNA
    /*NNP*/ [BarEnd.XPA, BarEnd.YNO, BarEnd.ZNA], // NNN share ZNA
    /*NPP*/ [BarEnd.YNO, BarEnd.XPO, BarEnd.ZPA], // PPP share XPO
    /*PNP*/ [BarEnd.YPO, BarEnd.XPA, BarEnd.ZNO], // PPP share YPO
    /*PPN*/ [BarEnd.YPA, BarEnd.XNO, BarEnd.ZPO], // PPP share ZPO
    /*PPP*/ [BarEnd.XPO, BarEnd.YPO, BarEnd.ZPO],
]

// const NNN_OPPOSITES = TRIANGLE_ARRAY[Triangle.NNN].map(oppositeEnd)

// interface IBrickConnector {
//     trianglePoints: Vector3[]
//     opposites: BarEnd[]
// }

function createBrickPoints(): Vector3[] {
    const copyBarPoints = (vectors: Vector3[], bar: IBar): Vector3[] => {
        vectors.push(new Vector3().add(bar.alpha))
        vectors.push(new Vector3().add(bar.omega))
        return vectors
    }
    const points = BAR_ARRAY.reduce(copyBarPoints, [])
    const trianglePoints = TRIANGLE_ARRAY[Triangle.NNN].map((barEnd: BarEnd) => points[barEnd]).reverse()
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
    const y = new Vector3().sub(midpoint).normalize()
    const z = new Vector3().crossVectors(y, x).normalize()
    const basis = new Matrix4().makeBasis(x, y, z)
    const fromBasis = new Matrix4().getInverse(basis).setPosition(new Vector3(0, midpoint.length(), 0))
    return points.map(p => p.applyMatrix4(fromBasis))
}

type Joint = number
type JointTag = number

interface Interval {
    index: number
    alpha: Joint
    omega: Joint
    span: number
}

interface IFace {
    index: number,
    joints: Joint[]
}

function baseOnTriangle(trianglePoints: Vector3[]): Matrix4 {
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

function createJoint(exports: IFabricInstanceExports,jointTag: JointTag, location: Vector3): Joint {
    return exports.createJoint(jointTag, Laterality.BILATERAL_RIGHT, location.x, location.y, location.z)
}

function createBar(exports: IFabricInstanceExports, alpha: number, omega: number, span: number): Interval {
    return {
        index: exports.createInterval(alpha, omega, span, IntervalRole.BAR, false),
        alpha, omega, span,
    }
}

function createCable(exports: IFabricInstanceExports, alpha: number, omega: number, span: number): Interval {
    return {
        index: exports.createInterval(alpha, omega, span, IntervalRole.CABLE, false),
        alpha, omega, span,
    }
}

function createFace(exports: IFabricInstanceExports, joints: Joint[], barEnds: BarEnd[]): IFace {
    const faceJoints = barEnds.map(barEnd => joints[barEnd])
    return {
        index: exports.createFace(faceJoints[0], faceJoints[1], faceJoints[2]),
        joints: faceJoints,
    }
}

export function createBrick(exports: IFabricInstanceExports, trianglePoints?: Vector3[]): IBrick {
    const newPoints = createBrickPoints()
    const xform = trianglePoints ? baseOnTriangle(trianglePoints) : undefined
    const points = xform ? newPoints.map(p => p.applyMatrix4(xform)) : newPoints
    const joints = points.map((p, index) => createJoint(exports, index, p))
    const bars = BAR_ARRAY.map((bar: IBar, index: number) => {
        const alpha = index
        const omega = index + 1
        return createBar(exports, alpha, omega, BAR_SPAN)
    })
    const cables = TRIANGLE_ARRAY.reduce((list: Interval[], barEnds: BarEnd[]): Interval[] => {
        list.push(createCable(exports, barEnds[0], barEnds[1], CABLE_SPAN))
        list.push(createCable(exports, barEnds[1], barEnds[2], CABLE_SPAN))
        list.push(createCable(exports, barEnds[2], barEnds[0], CABLE_SPAN))
        return list
    }, [])
    const faces = TRIANGLE_ARRAY.map(triangle => createFace(exports, joints, triangle))
    return {joints, bars, cables, faces}
}

export function growBrick(exports: IFabricInstanceExports, brick: IBrick, triangle: Triangle): IBrick {
    const faceJoints = brick.faces[triangle].joints
    const trianglePoints = faceJoints.map(joint => exports.getJointLocation(joint))
    return createBrick(exports, trianglePoints)
}

export function brickToString(exports: IFabricInstanceExports, brick: IBrick): string {
    exports.freshGeometry()
    // const points = brick.joints.map(joint => exports.getJointLocation(joint))
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

    exports.freshGeometry()
    const points = brick.joints.map(joint => exports.getJointLocation(joint))
    const joints = points.map(vectorToString(2)).join("\n")
    const minHeight = points.reduce((height, point) => Math.min(height, point.y), Number.POSITIVE_INFINITY).toFixed(3)
    const maxHeight = points.reduce((height, point) => Math.max(height, point.y), Number.NEGATIVE_INFINITY).toFixed(3)
    const bars = brick.bars.map(bar => intervalToString(2)(bar)).join("\n")
    const cables = brick.cables.map(intervalToString(2)).join("\n")
    const faces = brick.faces.map(faceToString(2)).join("\n")
    return `Brick{\n\theight ${minHeight} to ${maxHeight}\n\n\tjoints:\n${joints}\n\tbars:\n${bars}\n\tcables:\n${cables}\n\tfaces:\n${faces}`
}
