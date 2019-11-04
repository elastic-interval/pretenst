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
    cables: IInterval[]
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
    cables: IInterval[]
    rings: IInterval[][]
    faces: IFace[]
}

export interface IConnector {
    cables: IInterval[]
    facesToRemove: IFace[]
}

export function byBrick(brick: IBrick): (interval: IInterval) => boolean {
    return interval => {
        const matchesInterval = (faceInterval: IInterval) => (
            !faceInterval.removed && faceInterval.index === interval.index
        )
        return brick.pushes.some(matchesInterval) || brick.cables.some(matchesInterval)
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

export interface ICodeTree {
    _: number,
    S?: IPercent,
    _X?: ICodeTree,
    A?: ICodeTree,
    B?: ICodeTree,
    C?: ICodeTree,
}

export function treeToCode(codeTree: ICodeTree): string {
    return JSON.stringify(codeTree)
        .replace(/[_.:"]/g, "")
        .replace(/[{]/g, "[")
        .replace(/[}]/g, "]")
}

export function codeToTree(error: (message: string) => void, code?: string): ICodeTree | undefined {

    function matchBracket(s: string, openBracket: number): number {
        if (s.charAt(openBracket) !== "[") {
            throw new Error(`Code must start with [: ${s.charAt(openBracket)}`)
        }
        let depth = 0
        for (let index = openBracket; index < s.length; index++) {
            const char = s.charAt(index)
            if (char === "[") {
                depth++
            } else if (char === "]") {
                depth--
                if (depth === 0) {
                    return index
                }
            }
        }
        throw new Error(`No matching end bracket: |${s}|`)
    }

    function _codeToTree(c: string): ICodeTree {
        const finalBracket = matchBracket(c, 0)
        if (finalBracket !== c.length - 1) {
            throw new Error(`Code must end with ]: ${finalBracket} != ${c.length - 1}`)
        }
        const between = c.substring(1, finalBracket)
        const comma = between.indexOf(",")
        const countEnd = comma < 0 ? finalBracket : comma
        const _ = parseInt(between.substring(0, countEnd), 10)
        const tree: ICodeTree = {_}
        if (comma < 0) {
            return tree
        }
        const afterCount = between.substring(comma + 1)
        for (let index = 0; index < afterCount.length; index++) {
            const endBracket = matchBracket(afterCount, index + 1)
            const bracketed = afterCount.substring(index + 1, endBracket + 1)
            switch (afterCount.charAt(index)) {
                case "X":
                    tree._X = _codeToTree(bracketed)
                    break
                case "A":
                    tree.A = _codeToTree(bracketed)
                    break
                case "B":
                    tree.B = _codeToTree(bracketed)
                    break
                case "C":
                    tree.C = _codeToTree(bracketed)
                    break
                case "S":
                    tree.S = {_: parseInt(bracketed.substring(1, bracketed.length - 1), 10)}
                    break
            }
            index += bracketed.length + 1
        }
        return tree
    }

    try {
        if (!code || code.length === 0) {
            error("No code to parse")
            return undefined
        }
        return _codeToTree(code)
    } catch (e) {
        error(e.message)
        return undefined
    }
}

export interface IActiveCode {
    codeTree: ICodeTree
    brick: IBrick
}

export interface IGrowth {
    growing: IActiveCode []
    optimizationStack: string[]
}

