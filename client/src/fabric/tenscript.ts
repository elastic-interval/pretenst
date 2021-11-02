/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter } from "eig"
import { Vector3 } from "three"

import { TenscriptNode } from "./tenscript-node"
import { PostGrowthOp, Tensegrity } from "./tensegrity"
import {
    FACE_NAMES,
    FaceName,
    faceNameFromChar,
    factorFromPercent,
    IMarkNumber,
    IPercent,
    isFaceNameChar,
    percentFromFactor,
    percentOrHundred,
    reorientMatrix,
    Spin,
    spinChange,
} from "./tensegrity-types"
import { Twist } from "./twist"

export interface INamedJob {
    todo: string
    age: number
}

export interface ITenscript {
    name: string
    spin: Spin
    postGrowthOp: PostGrowthOp
    surfaceCharacter: SurfaceCharacter
    code: string[]
    scale?: number
    jobs?: INamedJob[]
    markDefStrings?: Record<number, string>
    featureValues?: Record<string, number>
}

export enum FaceAction {
    Subtree,
    Join,
    ShapingDistance,
    PretenstDistance,
    None,
}

export interface IMarkAction {
    action: FaceAction
    tree?: TenscriptNode
    scale?: IPercent
    point?: Vector3
}

export function compileTenscript(tenscript: ITenscript, error: (message: string) => void): TenscriptNode | undefined {
    try {
        const code = tenscript.code.join()
        const root = codeToNode(code)
        if (!root) {
            error("Nothing to compile")
            return undefined
        }
        root.root = true
        return root
    } catch (e) {
        error(e.message)
        return undefined
    }
}

export type RunTenscript = (tenscript: ITenscript, error: (message: string) => void) => boolean

export interface IBud {
    tree: TenscriptNode
    twist: Twist
    markActions: Record<number, IMarkAction>
    reorient: boolean
}

export function createBud(tensegrity: Tensegrity, location: Vector3, tenscript: ITenscript, tree: TenscriptNode): IBud {
    const reorient = tree.forward === undefined
    const {spin, markDefStrings} = tenscript
    const twist = tensegrity.createTwist(spin, percentOrHundred(), [location])
    return {tree, twist, markActions: markDefStringsToActions(markDefStrings), reorient}
}

export function markDefStringsToActions(markStrings?: Record<number, string>): Record<number, IMarkAction> {
    const markActions: Record<number, IMarkAction> = {}
    if (markStrings) {
        Object.keys(markStrings).forEach(key => {
            const c: string = markStrings[key]
            if (c.startsWith("subtree")) {
                const subtree = codeToNode(c.substring("subtree".length))
                markActions[key] = <IMarkAction>{action: FaceAction.Subtree, tree: subtree}
            } else if (c.startsWith("join")) {
                markActions[key] = <IMarkAction>{action: FaceAction.Join}
            } else if (c.startsWith("shaping-distance-")) {
                const scale: IPercent = {_: parseInt(c.split("-")[2], 10)}
                markActions[key] = <IMarkAction>{action: FaceAction.ShapingDistance, scale}
            } else if (c.startsWith("pretenst-distance-")) {
                const scale: IPercent = {_: parseInt(c.split("-")[2], 10)}
                markActions[key] = <IMarkAction>{action: FaceAction.PretenstDistance, scale}
            }
        })
    }
    return markActions
}

function codeToNode(codeFragment: string): TenscriptNode | undefined {
    const initialCode = argument(codeFragment, true)
    const codeString = initialCode.content
    let forward: string | undefined
    let scale = percentOrHundred()
    const subtrees = {} as Record<FaceName, TenscriptNode>
    const faceMarks = {} as Record<FaceName, IMarkNumber[]>

    function subtree(index: number): { codeTree?: TenscriptNode, skip: number } {
        const {content, skip} = argument(codeString.substring(index), false)
        const codeTree = codeToNode(content)
        return {codeTree, skip}
    }

    function addMark(faceName: FaceName, mark: number): void {
        const found = faceMarks[faceName]
        const markNumber: IMarkNumber = {_: mark}
        if (found) {
            found.push(markNumber)
        } else {
            faceMarks[faceName] = [markNumber]
        }
    }

    for (let index = 0; index < codeString.length; index++) {
        const char = codeString.charAt(index)
        if (isFaceNameChar(char)) {
            const direction = subtree(index + 1)
            const codeTree = direction.codeTree
            if (!codeTree) {
                throw new Error(`No subtree: ${codeString.substring(index)}`)
            }
            subtrees[faceNameFromChar(char)] = codeTree
            index += direction.skip
        } else if (isDigit(char)) {
            const forwardArg = argument(codeString, false)
            const forwardCount = toNumber(forwardArg.content)
            forward = "X".repeat(forwardCount)
            index += forwardArg.skip
        } else if (char === "X" || char === "O") {
            const forwardArg = argument(codeString, false)
            forward = forwardArg.content
            index += forwardArg.skip
        } else {
            switch (char) {
                case "S":
                    const scaleArg = argument(codeString.substring(index + 1), true)
                    scale = {_: toNumber(scaleArg.content)}
                    index += scaleArg.skip
                    break
                case "M":
                    const faceNameChar = codeString.charAt(index + 1)
                    const markNumber = argument(codeString.substring(index + 2), true)
                    addMark(faceNameFromChar(faceNameChar), toNumber(markNumber.content))
                    index += markNumber.skip + 1
                    break
                case ",":
                case " ":
                case "\n":
                    break
                default:
                    throw new Error(`Unexpected character: ${char}`)
            }
        }
    }
    return new TenscriptNode(forward, scale, subtrees, faceMarks).nonEmpty
}

function markTwist(twistToMark: Twist, treeWithMarks: TenscriptNode): void {
    FACE_NAMES.forEach(thisFace => {
        const marks = treeWithMarks.faceMarks(thisFace)
        if (!marks) {
            return
        }
        twistToMark.face(thisFace).markNumbers.push(...marks)
    })
}

function grow(
    {twist, markActions}: IBud,
    action: string,
    afterTree: TenscriptNode,
    faceName: FaceName,
    toOmni: boolean,
    scaleChange: IPercent,
): IBud {
    const baseFace = twist.face(faceName)
    const getSpin = () => {
        switch (action) {
            case "O":
                return spinChange(baseFace.spin, false, toOmni)
            default:
                return spinChange(baseFace.spin, true, toOmni)
        }
    }
    const spin = getSpin()
    const scale = percentFromFactor(factorFromPercent(baseFace.scale) * factorFromPercent(scaleChange))
    const newTwist = twist.tensegrity.createTwistOn(baseFace, spin, scale)
    if (afterTree.forward === "") {
        markTwist(newTwist, afterTree)
    }
    return {tree: afterTree, twist: newTwist, markActions, reorient: false}
}

export function execute(before: IBud[]): IBud[] {
    const activeBuds: IBud[] = []
    before.forEach(bud => {
        const {tree, markActions, reorient, twist} = bud
        if (tree.forward !== undefined && tree.forward.length > 0) {
            const {afterNode, action} = tree.decremented
            const omni = tree.needsOmniTwist && afterNode.forward !== undefined && afterNode.forward.length === 0
            activeBuds.push(grow(bud, action, afterNode, FaceName.A, omni, tree.scale))
            return
        }
        if (reorient) {
            const abOrientation = ![FaceName.A, FaceName.a, FaceName.B, FaceName.b].some(f => !tree.subtree(f))
            if (abOrientation) {
                const points = twist.tensegrity.joints.map(joint => twist.tensegrity.instance.jointLocation(joint))
                twist.tensegrity.instance.apply(reorientMatrix(points, 0))
            }
        }
        FACE_NAMES.forEach(faceName => {
            const subtree = tree.subtree(faceName)
            if (subtree) {
                const {afterNode, action} = subtree.decremented
                const omni = subtree.needsOmniTwist && subtree.forward === ""
                activeBuds.push(grow(bud, action, afterNode, faceName, omni, subtree.scale))
            } else {
                const treeMarks = tree.faceMarks(faceName)
                if (treeMarks) {
                    treeMarks.forEach(twistMark => {
                        const mark = markActions[twistMark._]
                        if (mark && mark.action === FaceAction.Subtree) {
                            const markTree = mark.tree
                            if (!markTree) {
                                throw new Error("Missing subtree")
                            }
                            tree.deleteMark(faceName)
                            const omni = markTree.needsOmniTwist
                            activeBuds.push(grow(bud, "", markTree, faceName, omni, percentOrHundred(markTree.scale)))
                        }
                    })
                }
            }
        })
    })
    return activeBuds
}


function isDigit(char: string): boolean {
    return "0123456789".indexOf(char) >= 0
}

function toNumber(digits: string): number {
    if (!digits.match(/^\d*$/)) {
        throw new Error(`Not a number: ${digits}`)
    }
    if (digits.length === 0) {
        return 0
    }
    return parseInt(digits, 10)
}

function matchBracket(s: string): number {
    if (s.charAt(0) !== "(") {
        throw new Error(`Code must start with "(": ${s} ${s.charAt(0)}`)
    }
    let depth = 0
    for (let index = 0; index < s.length; index++) {
        const char = s.charAt(index)
        if (char === "(") {
            depth++
        } else if (char === ")") {
            depth--
            if (depth === 0) {
                return index
            }
        }
    }
    throw new Error(`No matching end bracket: |${s}|`)
}

function argument(maybeBracketed: string, stripBrackets: boolean): { content: string, skip: number } {
    const commaPos = maybeBracketed.indexOf(",")
    const commaPresent = commaPos >= 0
    if (maybeBracketed.charAt(0) !== "(") {
        if (commaPresent) {
            return {content: maybeBracketed.substring(0, commaPos), skip: commaPos}
        }
        return {content: maybeBracketed, skip: maybeBracketed.length}
    }
    const finalBracket = matchBracket(maybeBracketed)
    const contentOption = stripBrackets ? maybeBracketed.substring(1, finalBracket) : maybeBracketed.substring(0, finalBracket + 1)
    const content = contentOption.length > 0 ? contentOption : "0"
    return {content, skip: finalBracket + 1}
}

