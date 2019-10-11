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
    isBar: boolean
    removed: boolean
    intervalRole: IntervalRole
    alpha: IJoint
    omega: IJoint
}

export interface IFace {
    index: number
    canGrow: boolean
    brick: IBrick
    triangle: Triangle
    joints: IJoint[]
    bars: IInterval[]
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

export const TRIANGLE_DEFINITIONS: ITriangleDefinition[] = [
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
    bars: IInterval[]
    cables: IInterval[]
    rings: IInterval[][]
    faces: IFace[]
}

export interface IConnector {
    cables: IInterval[]
    facesToRemove: IFace[]
}

export enum AdjacentIntervals {
    None = "None",
    Cables = "Cables",
    Bars = "Bars",
    Face = "Face",
    Brick = "Brick",
}

export function nextAdjacent(selectedFace: ISelectedFace): ISelectedFace {
    function nextIntervals(adjacentIntervals: AdjacentIntervals): AdjacentIntervals {
        switch (adjacentIntervals) {
            case AdjacentIntervals.None:
                return AdjacentIntervals.Cables
            case AdjacentIntervals.Cables:
                return AdjacentIntervals.Bars
            case AdjacentIntervals.Bars:
                return AdjacentIntervals.Face
            case AdjacentIntervals.Face:
                return AdjacentIntervals.Brick
            case AdjacentIntervals.Brick:
                return AdjacentIntervals.Cables
        }
    }

    return {...selectedFace, adjacentIntervals: nextIntervals(selectedFace.adjacentIntervals)}
}

export interface ISelectedFace {
    readonly face: IFace
    readonly adjacentIntervals: AdjacentIntervals
}

export enum StressSelectMode {
    TighterCables = "Tighter Cables",
    SlackerCables = "Slacker Cables",
    TighterBars = "Tighter Bars",
    SlackerBars = "Slacker Bars",
}

export function selectModeBars(mode: StressSelectMode): boolean {
    return mode === StressSelectMode.TighterBars || mode === StressSelectMode.SlackerBars
}

export function selectModeSlack(mode: StressSelectMode): boolean {
    return mode === StressSelectMode.SlackerBars || mode === StressSelectMode.SlackerCables
}

export interface ISelectedStress {
    stressSelectMode: StressSelectMode
    stressValue: number
}

export interface ISelection {
    selectedFace?: ISelectedFace
    selectedStress?: ISelectedStress
}

export function bySelectedFace(selectedFace: ISelectedFace): (interval: IInterval) => boolean {
    return interval => {
        const matchesInterval = (faceInterval: IInterval) => (
            !faceInterval.removed && faceInterval.index === interval.index
        )
        const touchesInterval = (joint: IJoint) => (
            interval.alpha.index === joint.index || interval.omega.index === joint.index
        )
        switch (selectedFace.adjacentIntervals) {
            case AdjacentIntervals.Bars:
                return selectedFace.face.bars.some(matchesInterval)
            case AdjacentIntervals.Cables:
                return selectedFace.face.cables.some(matchesInterval)
            case AdjacentIntervals.Face:
                return selectedFace.face.joints.some(touchesInterval)
            case AdjacentIntervals.Brick:
                const brick: IBrick = selectedFace.face.brick
                return [...brick.bars, ...brick.cables].some(matchesInterval)
            default:
                return false
        }
    }
}

export function setFabricDisplacementThreshold(fabric: TensegrityFabric, threshold: number, mode?: StressSelectMode): void {
    const engine = fabric.instance.engine
    switch (mode) {
        case StressSelectMode.SlackerBars:
            return engine.setDisplacementThreshold(true, false, false, threshold)
        case StressSelectMode.SlackerCables:
            return engine.setDisplacementThreshold(false, true, false, threshold)
        case StressSelectMode.TighterBars:
            return engine.setDisplacementThreshold(true, false, true, threshold)
        case StressSelectMode.TighterCables:
            return engine.setDisplacementThreshold(false, true, true, threshold)
        default:
            return engine.setDisplacementThreshold(false, false, false, threshold)
    }
}

export function byDisplacementTreshold(fabric: TensegrityFabric, threshold: number, mode: StressSelectMode): (interval: IInterval) => boolean {
    return interval => {
        const directionalDisp = fabric.instance.getIntervalDisplacement(interval.index)
        const selectIf = (selectBars: boolean, greaterThan: boolean): boolean => {
            if (interval.isBar !== selectBars) {
                return false
            }
            const intervalDisp = interval.isBar ? -directionalDisp : directionalDisp
            return greaterThan ? intervalDisp > threshold : intervalDisp < threshold
        }
        switch (mode) {
            case StressSelectMode.SlackerBars:
                return selectIf(true, false)
            case StressSelectMode.SlackerCables:
                return selectIf(false, false)
            case StressSelectMode.TighterBars:
                return selectIf(true, true)
            case StressSelectMode.TighterCables:
                return selectIf(false, true)
            default:
                return false
        }
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

export function codeTreeToString(codeTree: ICodeTree): string {
    return JSON.stringify(codeTree)
        .replace(/[_.:"]/g, "")
        .replace(/[{]/g, "[")
        .replace(/[}]/g, "]")
}

export function stringToCodeTree(code: string): ICodeTree {

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

    function codeToTree(c: string): ICodeTree {
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
                    tree._X = codeToTree(bracketed)
                    break
                case "A":
                    tree.A = codeToTree(bracketed)
                    break
                case "B":
                    tree.B = codeToTree(bracketed)
                    break
                case "C":
                    tree.C = codeToTree(bracketed)
                    break
                case "S":
                    tree.S = {_: parseInt(bracketed.substring(1, bracketed.length-1), 10)}
                    break
            }
            index += bracketed.length + 1
        }
        return tree
    }

    return codeToTree(code)
}

export interface IActiveCode {
    codeTree: ICodeTree
    brick: IBrick
}

export interface IGrowth {
    growing: IActiveCode []
    optimizationStack: string[]
}

