/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { IntervalRole } from "./fabric-exports"
import { TensegrityFabric } from "./tensegrity-fabric"

export const PHI = 1.61803398875
export const SPAN = 0.0

export enum Ray {
    XP = 0, XN, YP, YN, ZP, ZN,
}

export enum BarEnd {
    XPA = 0, XPO, XNA, XNO, YPA, YPO,
    YNA, YNO, ZPA, ZPO, ZNA, ZNO,
}

export enum Triangle {
    NNN = 0, PNN, NPN, NNP, NPP, PNP, PPN, PPP,
}

export enum Ring {
    NN = 0, // [BarEnd.ZNO, BarEnd.XPA, BarEnd.YNO, BarEnd.ZPA, BarEnd.XNO, BarEnd.YPA],
    PN = 1, // [BarEnd.YNA, BarEnd.XNA, BarEnd.ZNO, BarEnd.YPO, BarEnd.XPO, BarEnd.ZPA],
    NP = 2, // [BarEnd.XNA, BarEnd.YPA, BarEnd.ZPO, BarEnd.XPO, BarEnd.YNO, BarEnd.ZNA],
    PP = 3, // [BarEnd.YNA, BarEnd.ZNA, BarEnd.XPA, BarEnd.YPO, BarEnd.ZPO, BarEnd.XNO],
}

export interface IJoint {
    index: number
    oppositeIndex: number
}

export type JointTag = number

export interface IInterval {
    index: number
    removed: boolean
    intervalRole: IntervalRole
    alpha: IJoint
    omega: IJoint
    span: number
}

export interface IFace {
    index: number
    canGrow: boolean
    brick: IBrick
    triangle: Triangle
    joints: IJoint[]
    cables: IInterval[]
}

export interface IBarDefinition {
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
    return rayVector(primaryRay).multiplyScalar(PHI).add(rayVector(secondaryRay))
}

export const BAR_ARRAY: IBarDefinition[] = [
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
    barEnds: BarEnd[]
    ringMember: Ring[]
    ring: Ring
}

export const TRIANGLE_ARRAY: ITriangleDefinition[] = [
    {
        name: Triangle.NNN, opposite: Triangle.PPP, negative: true, ring: Ring.NN,
        barEnds: [BarEnd.YNA, BarEnd.XNA, BarEnd.ZNA], ringMember: [Ring.NP, Ring.PN, Ring.PP],
    },
    {
        name: Triangle.PNN, opposite: Triangle.NPP, negative: false, ring: Ring.PP,
        barEnds: [BarEnd.XNA, BarEnd.YPA, BarEnd.ZNO], ringMember: [Ring.PN, Ring.NN, Ring.NP],
    },
    {
        name: Triangle.NPN, opposite: Triangle.PNP, negative: false, ring: Ring.PN,
        barEnds: [BarEnd.XNO, BarEnd.YNA, BarEnd.ZPA], ringMember: [Ring.PP, Ring.NP, Ring.NN],
    },
    {
        name: Triangle.NNP, opposite: Triangle.PPN, negative: false, ring: Ring.NP,
        barEnds: [BarEnd.XPA, BarEnd.YNO, BarEnd.ZNA], ringMember: [Ring.NN, Ring.PN, Ring.PP],
    },
    {
        name: Triangle.NPP, opposite: Triangle.PNN, negative: true, ring: Ring.PP,
        barEnds: [BarEnd.YNO, BarEnd.XPO, BarEnd.ZPA], ringMember: [Ring.PN, Ring.NP, Ring.NN],
    },
    {
        name: Triangle.PNP, opposite: Triangle.NPN, negative: true, ring: Ring.PN,
        barEnds: [BarEnd.YPO, BarEnd.XPA, BarEnd.ZNO], ringMember: [Ring.PP, Ring.NN, Ring.NP],
    },
    {
        name: Triangle.PPN, opposite: Triangle.NNP, negative: true, ring: Ring.NP,
        barEnds: [BarEnd.YPA, BarEnd.XNO, BarEnd.ZPO], ringMember: [Ring.NN, Ring.PP, Ring.PN],
    },
    {
        name: Triangle.PPP, opposite: Triangle.NNN, negative: false, ring: Ring.NN,
        barEnds: [BarEnd.XPO, BarEnd.YPO, BarEnd.ZPO], ringMember: [Ring.NP, Ring.PP, Ring.PN],
    },
]

export interface IBrick {
    base: Triangle
    fabric: TensegrityFabric
    joints: IJoint[]
    bars: IInterval[]
    cables: IInterval[]
    rings: IInterval[][]
    faces: IFace[]
}

export interface IConnector {
    cables: IInterval[]
    facesToRemove: IFace[]
}
