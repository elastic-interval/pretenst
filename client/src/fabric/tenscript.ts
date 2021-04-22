/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter, WorldFeature } from "eig"
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
    jointLocation,
    oppositeSpin,
    percentFromFactor,
    percentOrHundred,
    reorientMatrix,
    Spin,
} from "./tensegrity-types"
import { Twist } from "./twist"

export interface ITenscript {
    name: string
    spin: Spin
    postGrowthOp: PostGrowthOp
    surfaceCharacter: SurfaceCharacter
    code: string[]
    markNumbers: Record<number, string>
    featureValues: Record<WorldFeature, number>
}

export enum FaceAction {
    Subtree,
    Base,
    Join,
    Distance,
    Anchor,
    None,
}

export interface IMarkDef {
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
    markDefs: Record<number, IMarkDef>
    reorient: boolean
}

export function createBud(tensegrity: Tensegrity, location: Vector3, tenscript: ITenscript, tree: TenscriptNode): IBud {
    const reorient = tree.forward === -1
    const {spin, markNumbers} = tenscript
    const twist = tensegrity.createTwist(spin, percentOrHundred(), [location])
    return {tree, twist, markDefs: markStringsToMarkDefs(markNumbers), reorient}
}

export function markStringsToMarkDefs(markStrings?: Record<number, string>): Record<number, IMarkDef> {
    const marks: Record<number, IMarkDef> = {}
    if (markStrings) {
        Object.keys(markStrings).forEach(key => {
            const c: string = markStrings[key]
            if (c.startsWith("subtree")) {
                const subtree = codeToNode(c.substring("subtree".length))
                marks[key] = <IMarkDef>{action: FaceAction.Subtree, tree: subtree}
            } else if (c.startsWith("base")) {
                marks[key] = <IMarkDef>{action: FaceAction.Base}
            } else if (c.startsWith("join")) {
                marks[key] = <IMarkDef>{action: FaceAction.Join}
            } else if (c.startsWith("distance-")) {
                const scale: IPercent = {_: parseInt(c.split("-")[1], 10)}
                marks[key] = <IMarkDef>{action: FaceAction.Distance, scale}
            } else if (c.startsWith("anchor")) {
                const AnchorPattern = /anchor-\(([0-9.-]*),([0-9.-]*)\)-(\d*)-(\d*)/
                const matches = c.match(AnchorPattern)
                if (!matches) {
                    throw new Error(`Unrecognized mark code: [${c}]`)
                }
                const x = parseFloat(matches[1])
                const y = parseFloat(matches[2])
                const submerged = parseFloat(matches[3])
                const scale: IPercent = {_: parseInt(matches[4], 10)}
                const point = new Vector3(x, -submerged, y)
                marks[key] = <IMarkDef>{action: FaceAction.Anchor, point, scale}
            }
        })
    }
    return marks
}

function codeToNode(codeFragment: string): TenscriptNode | undefined {
    const initialCode = argument(codeFragment, true)
    const codeString = initialCode.content

    let forward = -1
    let scale = percentOrHundred()
    const subtrees = {} as Record<FaceName, TenscriptNode>
    const marks = {} as Record<FaceName, IMarkNumber[]>

    function subtree(index: number): { codeTree?: TenscriptNode, skip: number } {
        const {content, skip} = argument(codeString.substring(index), false)
        const codeTree = codeToNode(content)
        return {codeTree, skip}
    }

    function addMark(faceName: FaceName, markNumber: number): void {
        const found = marks[faceName]
        const mark = {_: markNumber}
        if (found) {
            found.push(mark)
        } else {
            marks[faceName] = [mark]
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
            forward = toNumber(forwardArg.content)
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
    return new TenscriptNode(forward, scale, subtrees, marks).nonEmpty
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

function grow({twist, markDefs}: IBud,
              afterTree: TenscriptNode, faceName: FaceName, toOmni: boolean, scaleChange: IPercent): IBud {
    const baseFace = twist.face(faceName)
    const spin = oppositeSpin(baseFace.spin, toOmni)
    const scale = percentFromFactor(factorFromPercent(baseFace.scale) * factorFromPercent(scaleChange))
    const newTwist = twist.tensegrity.createTwistOn(baseFace, spin, scale)
    if (afterTree.forward === 0) {
        markTwist(newTwist, afterTree)
    }
    return {tree: afterTree, twist: newTwist, markDefs, reorient: false}
}

export function execute(before: IBud[]): IBud[] {
    const activeBuds: IBud[] = []
    before.forEach(bud => {
        const {tree, markDefs, reorient, twist} = bud
        if (tree.forward > 0) {
            const afterTree = tree.decremented
            const omni = tree.needsOmniTwist && afterTree.forward === 0
            activeBuds.push(grow(bud, afterTree, FaceName.A, omni, tree.scale))
            return
        }
        if (reorient) {
            const abOrientation = ![FaceName.A, FaceName.a, FaceName.B, FaceName.b].some(f => !tree.subtree(f))
            if (abOrientation) {
                const points = twist.tensegrity.joints.map(jointLocation)
                twist.tensegrity.instance.apply(reorientMatrix(points, 0))
            }
        }
        FACE_NAMES.forEach(faceName => {
            const subtree = tree.subtree(faceName)
            if (subtree) {
                const afterTree = subtree.decremented
                const omni = subtree.needsOmniTwist && subtree.forward === 0
                activeBuds.push(grow(bud, afterTree, faceName, omni, subtree.scale))
            } else {
                const treeMarks = tree.faceMarks(faceName)
                if (treeMarks) {
                    treeMarks.forEach(twistMark => {
                        const mark = markDefs[twistMark._]
                        if (mark && mark.action === FaceAction.Subtree) {
                            const markTree = mark.tree
                            if (!markTree) {
                                throw new Error("Missing subtree")
                            }
                            tree.deleteMark(faceName)
                            const omni = markTree.needsOmniTwist
                            activeBuds.push(grow(bud, markTree, faceName, omni, percentOrHundred(markTree.scale)))
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

