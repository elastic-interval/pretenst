/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IFabricInstanceExports, IntervalRole, Laterality } from "./fabric-exports"

const PHI = 1.618
const BAR_SPAN = PHI * 2
const CABLE_SPAN = 0.1

export enum Triangle {
    NNN, NNP, NPN, NPP, PNN, PNP, PPN, PPP,
}

enum Ray {
    XP, XN, YP, YN, ZP, ZN,
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

function point(primaryRay: Ray, secondaryRay: Ray): Vector3 {
    return rayVector(primaryRay).multiplyScalar(PHI).add(rayVector(secondaryRay))
}

enum BarEnd {
    XPA, XPO, XNA, XNO, YPA, YPO, YNA, YNO, ZPA, ZPO, ZNA, ZNO,
}

interface IBar {
    id: Ray
    alpha: Vector3
    omega: Vector3
}

const BARS: IBar[] = [
    {id: Ray.XP, alpha: point(Ray.ZN, Ray.XP), omega: point(Ray.ZP, Ray.XP)},
    {id: Ray.XN, alpha: point(Ray.ZN, Ray.XN), omega: point(Ray.ZP, Ray.XN)},
    {id: Ray.YP, alpha: point(Ray.XN, Ray.YP), omega: point(Ray.XP, Ray.YP)},
    {id: Ray.YN, alpha: point(Ray.XN, Ray.YN), omega: point(Ray.XP, Ray.YN)},
    {id: Ray.ZP, alpha: point(Ray.YN, Ray.ZP), omega: point(Ray.YP, Ray.ZP)},
    {id: Ray.ZN, alpha: point(Ray.YN, Ray.ZN), omega: point(Ray.YP, Ray.ZN)},
]

function tensegrityBrickPoints(): Vector3[] {
    return BARS.reduce((vectors: Vector3[], bar: IBar): Vector3[] => {
        vectors.push(new Vector3().add(bar.alpha))
        vectors.push(new Vector3().add(bar.omega))
        return vectors
    }, [])
}

interface ITriangle {
    id: Triangle
    barEnds: BarEnd[]
}

const TRIANGLES: ITriangle[] = [
    {id: Triangle.NNN, barEnds: [BarEnd.XNA, BarEnd.YNA, BarEnd.ZNA]},
    {id: Triangle.NNP, barEnds: [BarEnd.XPA, BarEnd.YNO, BarEnd.ZNA]},
    {id: Triangle.NPN, barEnds: [BarEnd.XNO, BarEnd.YNA, BarEnd.ZPA]},
    {id: Triangle.PNN, barEnds: [BarEnd.XNA, BarEnd.YPA, BarEnd.ZNO]},
    {id: Triangle.NPP, barEnds: [BarEnd.XPO, BarEnd.YNO, BarEnd.ZPA]},
    {id: Triangle.PNP, barEnds: [BarEnd.XPA, BarEnd.YPO, BarEnd.ZNO]},
    {id: Triangle.PPN, barEnds: [BarEnd.XNO, BarEnd.YPA, BarEnd.ZPO]},
    {id: Triangle.PPP, barEnds: [BarEnd.XPO, BarEnd.YPO, BarEnd.ZPO]},
]

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

function initialTriangle(): Vector3[] {
    const points = tensegrityBrickPoints()
    return TRIANGLES[Triangle.NNN].barEnds.map(barEnd => points[barEnd]).reverse()
}

function brickPointsFromTriangle(trianglePoints: Vector3[]): Vector3[] {
    if (trianglePoints.length !== 3) {
        throw new Error(`expected a triangle, got ${trianglePoints.length}`)
    }
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const midSide = new Vector3().addVectors(trianglePoints[0], trianglePoints[1]).multiplyScalar(0.5)
    const x = new Vector3().subVectors(midSide, midpoint).normalize()
    const y = new Vector3().sub(midpoint).normalize()
    const z = new Vector3().crossVectors(y, x).normalize()
    const transformation = new Matrix4().getInverse(new Matrix4().makeBasis(x, y, z))
    const upwards = new Vector3().setY(midpoint.length())
    const points = tensegrityBrickPoints()
    points.forEach(p => p.applyMatrix4(transformation).add(upwards))
    return points
}

export class TensegrityBrick {
    public readonly joints: Joint[]
    public readonly bars: Interval[]
    public readonly cables: Interval[]
    public readonly faces: IFace[]

    constructor(private exports: IFabricInstanceExports, existingTriangle?: Vector3[]) {
        const trianglePoints = existingTriangle ? existingTriangle : initialTriangle()
        const points = brickPointsFromTriangle(trianglePoints)
        this.joints = points.map((location, index) => this.joint(index, location))
        // const joints = this.joints.map(joint => this.exports.getJointLocation(joint)).map(vectorToString(2)).join("\n")
        // console.log("joints", joints)
        this.bars = BARS.map(bar => {
            const barIndex = bar.id * 2
            const alpha = barIndex
            const omega = barIndex + 1
            return this.bar(alpha, omega, BAR_SPAN)
        })
        this.cables = TRIANGLES.reduce((cables: Interval[], tri: ITriangle): Interval[] => {
            cables.push(this.cable(tri.barEnds[0], tri.barEnds[1], CABLE_SPAN))
            cables.push(this.cable(tri.barEnds[1], tri.barEnds[2], CABLE_SPAN))
            cables.push(this.cable(tri.barEnds[2], tri.barEnds[0], CABLE_SPAN))
            return cables
        }, [])
        this.faces = TRIANGLES.map(tri => this.face(tri))
    }

    public grow(triangle: Triangle): TensegrityBrick {
        const trianglePoints = this.faces[triangle].joints.map(joint => this.exports.getJointLocation(joint))
        return new TensegrityBrick(this.exports, trianglePoints)
    }

    public toString(): string {
        this.exports.freshGeometry()
        const joints = this.joints.map(joint => this.exports.getJointLocation(joint)).map(vectorToString(2)).join("\n")
        const bars = this.bars.map(bar => intervalToString(2)(bar)).join("\n")
        const cables = this.cables.map(intervalToString(2)).join("\n")
        const faces = this.faces.map(faceToString(2)).join("\n")
        return `Brick{\n\tjoints:\n${joints}\n\tbars:\n${bars}\n\tcables:\n${cables}\n\tfaces:\n${faces}`
    }

    private joint(jointTag: JointTag, location: Vector3): Joint {
        return this.exports.createJoint(jointTag, Laterality.BILATERAL_RIGHT, location.x, location.y, location.z)
    }

    private bar(alpha: number, omega: number, span: number): Interval {
        return {
            index: this.exports.createInterval(alpha, omega, span, IntervalRole.BAR, false),
            alpha, omega, span,
        }
    }

    private cable(alpha: number, omega: number, span: number): Interval {
        return {
            index: this.exports.createInterval(alpha, omega, span, IntervalRole.CABLE, false),
            alpha, omega, span,
        }
    }

    private face(triangle: ITriangle): IFace {
        const joints = triangle.barEnds.map(barEnd => this.joints[barEnd])
        return {
            index: this.exports.createFace(joints[0], joints[1], joints[2]),
            joints,
        }
    }
}
