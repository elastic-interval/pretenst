/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { IntervalRole } from "./fabric-engine"
import { TensegrityFabric } from "./tensegrity-fabric"

export const PHI = 1.61803398875

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

export enum Ring {
    NN = 0, // [PushEnd.ZNO, PushEnd.XPA, PushEnd.YNO, PushEnd.ZPA, PushEnd.XNO, PushEnd.YPA],
    PN = 1, // [PushEnd.YNA, PushEnd.XNA, PushEnd.ZNO, PushEnd.YPO, PushEnd.XPO, PushEnd.ZPA],
    NP = 2, // [PushEnd.XNA, PushEnd.YPA, PushEnd.ZPO, PushEnd.XPO, PushEnd.YNO, PushEnd.ZNA],
    PP = 3, // [PushEnd.YNA, PushEnd.ZNA, PushEnd.XPA, PushEnd.YPO, PushEnd.ZPO, PushEnd.XNO],
}

export interface IJoint {
    index: number
    oppositeIndex: number
}

export type JointTag = number

export interface IInterval {
    index: number
    isPush: boolean
    removed: boolean
    intervalRole: IntervalRole
    scale: IPercent
    alpha: IJoint
    omega: IJoint
}

export interface IFace {
    index: number
    canGrow: boolean
    brick: IBrick
    triangle: Triangle
    joints: IJoint[]
    pushes: IInterval[]
    pulls: IInterval[]
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
    return rayVector(primaryRay).multiplyScalar(PHI).add(rayVector(secondaryRay))
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
    base: Triangle
    scale: IPercent
    fabric: TensegrityFabric
    joints: IJoint[]
    pushes: IInterval[]
    pulls: IInterval[]
    rings: IInterval[][]
    faces: IFace[]
}

export interface IConnector {
    pulls: IInterval[]
    facesToRemove: IFace[]
}

export function byBrick(brick: IBrick): (interval: IInterval) => boolean {
    return interval => {
        const matchesInterval = (faceInterval: IInterval) => (
            !faceInterval.removed && faceInterval.index === interval.index
        )
        return brick.pushes.some(matchesInterval) || brick.pulls.some(matchesInterval)
    }
}

export interface IIntervalSplit {
    selected: IInterval[]
    unselected: IInterval[]
}

export function emptySplit(): IIntervalSplit {
    return {selected: [], unselected: []}
}

type IntervalSplitter = (split: IIntervalSplit, interval: IInterval) => IIntervalSplit

export function intervalSplitter(selectionFilter: (interval: IInterval) => boolean): IntervalSplitter {
    return (split, interval) => {
        if (selectionFilter(interval)) {
            split.selected.push(interval)
        } else {
            split.unselected.push(interval)
        }
        return split
    }
}
