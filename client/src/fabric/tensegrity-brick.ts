/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IFabricInstanceExports, IntervalRole, Laterality } from "./fabric-exports"

const PHI = 1.618
const BAR_SPAN = PHI * 2
const CABLE_SPAN = 0.1

enum Ray {
    XP, XN,
    YP, YN,
    ZP, ZN,
}

function rayVector(ray: Ray): Vector3 {
    const v = new Vector3()
    switch (ray) {
        case Ray.XP:
            v.x = 1
            break
        case Ray.XN:
            v.x = -1
            break
        case Ray.YP:
            v.y = 1
            break
        case Ray.YN:
            v.y = -1
            break
        case Ray.ZP:
            v.z = 1
            break
        case Ray.ZN:
            v.z = -1
            break
    }
    return v
}

function point(primaryRay: Ray, secondaryRay: Ray): Vector3 {
    return rayVector(primaryRay).multiplyScalar(PHI).add(rayVector(secondaryRay))
}

enum BarEnd {
    XPA, XPO,
    XNA, XNO,
    YPA, YPO,
    YNA, YNO,
    ZPA, ZPO,
    ZNA, ZNO,
}

interface IBar {
    id: Ray
    alphaEnd: BarEnd
    alpha: Vector3
    omegaEnd: BarEnd
    omega: Vector3
}

const BARS: IBar[] = [
    {
        id: Ray.XP,
        alpha: point(Ray.ZN, Ray.XP), omega: point(Ray.ZP, Ray.XP),
        alphaEnd: BarEnd.XPA, omegaEnd: BarEnd.XPO,
    },
    {
        id: Ray.XN,
        alpha: point(Ray.ZN, Ray.XN), omega: point(Ray.ZP, Ray.XN),
        alphaEnd: BarEnd.XNA, omegaEnd: BarEnd.XNO,
    },
    {
        id: Ray.YP,
        alpha: point(Ray.XN, Ray.YP), omega: point(Ray.XP, Ray.YP),
        alphaEnd: BarEnd.YPA, omegaEnd: BarEnd.YPO,
    },
    {
        id: Ray.YN,
        alpha: point(Ray.XN, Ray.YN), omega: point(Ray.XP, Ray.YN),
        alphaEnd: BarEnd.YNA, omegaEnd: BarEnd.YNO,
    },
    {
        id: Ray.ZP,
        alpha: point(Ray.YN, Ray.ZP), omega: point(Ray.YP, Ray.ZP),
        alphaEnd: BarEnd.ZPA, omegaEnd: BarEnd.ZPO,
    },
    {
        id: Ray.ZN,
        alpha: point(Ray.YN, Ray.ZN), omega: point(Ray.YP, Ray.ZN),
        alphaEnd: BarEnd.ZNA, omegaEnd: BarEnd.ZNO,
    },
]

enum Triangle {
    NNN, NNP, NPN, NPP, PNN, PNP, PPN, PPP,
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
type Face = number

interface Interval {
    index: number
    alpha: Joint
    omega: Joint
    span: number
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

function onAltitude(a: Vector3, b: Vector3): number {
    return b.y - a.y
}

/*
function faceToString(indent: number): (interval: Interval) => string {
    return (interval: Interval) => {
        return `${"\t".repeat(indent)}(${interval.alpha}:${interval.omega})=${interval.span}`
    }
}
*/

export class TensegrityBrick {
    public readonly joints: Joint[]
    public readonly bars: Interval[]
    public readonly cables: Interval[]
    public readonly faces: Face[]

    constructor(private exports: IFabricInstanceExports) {
        const locations = BARS.reduce((vectors: Vector3[], bar: IBar): Vector3[] => {
            vectors.push(bar.alpha)
            vectors.push(bar.omega)
            return vectors
        }, [])
        const tri = TRIANGLES[0]
        const triMid = tri.barEnds.reduce((mid: Vector3, barEnd: number) => mid.add(locations[barEnd]), new Vector3()).multiplyScalar(1.0 / 3.0)
        const x = new Vector3().subVectors(locations[tri.barEnds[0]], triMid).normalize()
        const y = new Vector3().sub(triMid).normalize()
        const z = new Vector3().crossVectors(y, x).normalize()
        const upwards = new Vector3().setY(triMid.length())
        const transformation = new Matrix4().getInverse(new Matrix4().makeBasis(x, y, z))
        locations.forEach(location => location.applyMatrix4(transformation).add(upwards))
        this.joints = locations.map((location, index) => this.joint(index, location))
        this.bars = BARS.map(bar => {
            const barIndex = bar.id * 2
            const alpha = barIndex
            const omega = barIndex + 1
            return this.bar(alpha, omega, BAR_SPAN)
        })
        this.cables = TRIANGLES.reduce((cables: Interval[], triangle): Interval[] => {
            cables.push(this.cable(triangle.barEnds[0], triangle.barEnds[1], CABLE_SPAN))
            cables.push(this.cable(triangle.barEnds[1], triangle.barEnds[2], CABLE_SPAN))
            cables.push(this.cable(triangle.barEnds[2], triangle.barEnds[0], CABLE_SPAN))
            return cables
        }, [])
        this.faces = TRIANGLES.map(triangle => {
            return this.exports.createFace(triangle.barEnds[0], triangle.barEnds[1], triangle.barEnds[2])
        })
    }

    public toString(): string {
        const joints = this.joints.map(joint => this.exports.getJointLocation(joint)).sort(onAltitude).map(vectorToString(2)).join("\n")
        const bars = this.bars.map(bar => intervalToString(2)(bar)).join("\n")
        const cables = this.cables.map(intervalToString(2)).join("\n")
        return `Brick{\n\tjoints:\n${joints}\n\tbars:\n${bars}\n\tcables:\n${cables}\n}`
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
}
