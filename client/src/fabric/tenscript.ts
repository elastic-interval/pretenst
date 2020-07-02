/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { TensegrityBuilder } from "./tensegrity-builder"
import {
    FACE_DIRECTIONS,
    FACE_NAMES,
    faceFromTwist,
    FaceName,
    IFaceMark,
    IPercent,
    ITwist,
    percentOrHundred,
} from "./tensegrity-types"

const BOOTSTRAP_TENSCRIPTS = [
    "'Zero':(0)",
    "'One':(1)",
    "'Six':(6)",
    "'Axoneme':(30,S95)",
    "'Knee':(b3,a3)",
    "'Snelson Star':(a(15,S90),b(15,S90),c(15,S90),d(15,S90))",
    "'Tripod with Knees':(A5,B(7,c(5,S90),S90),C(7,c(5,S90),S90),D(7,c(5,S90),S90))",
    "'Pretenst Lander':(B(15,S90),C(15,S90),D(15,S90))",
    "'Zig Zag Loop':(d(3,MA0),c(7,b(7,d(7,d(7,d(7,d(3,MA0)))))))",
    "'Bulge Ring':(A(15,S90, MA1), a(16, S90, MA1))",
    "'Ring':(A(19,MA1),a(18,MA1))",
    "'Convergence':(a1,b(15,S90,MA1),c(15,S90,MA1),d(15,S90,MA1))",
    "'Halo by Crane':(B(14,S90,MA1),C(5,S110,MA0),D(15,S90,MA1))",
    "'Thick Tripod':(A3,B(8,MA1),C(8,MA1),D(8,MA1)):1=face-distance-35",
    "'Diamond':(a(5,b(5,c(5,c(2,MA3)),d(5,b(2,MA4))),c(5,d(5,b(2,MA5)),c(5,c(2,MA1))),d(5,c(5,c(2,MA6)),d(5,b(2,MA2)))),b(5,b(5,d(2,MA3)),c(5,c(2,MA2))),c(5,b(5,d(2,MA6)),c(5,c(2,MA5))),d(5,c(5,c(2,MA4)),b(5,d(2,MA1))))",
    "'Composed':(3,b(2,MA0),c(2,MA0),d(2,MA0)):0=subtree(b2,c2,d2)",
    "'Equus Lunae':(A(16,S95,Mb0),b(16,S95,Mb0),a(16,S95,Md0),B(16,Md0,S95)):0=face-distance-60:9=symmetrical",
    "'Infinity':(a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2))",
    "'Binfinity':(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA3),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2))",
    "'Mobiosity':(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA2),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA3))",
]

export interface ITenscriptTree {
    _?: number, // forward steps
    S?: IPercent, // scale
    A?: ITenscriptTree, // directions: up
    b?: ITenscriptTree, // kinda up
    c?: ITenscriptTree,
    d?: ITenscriptTree,
    B?: ITenscriptTree, // kinda down
    C?: ITenscriptTree,
    D?: ITenscriptTree,
    a?: ITenscriptTree, // down
    MA?: IFaceMark, // marks: reference
    MB?: IFaceMark,
    MC?: IFaceMark,
    MD?: IFaceMark,
    Ma?: IFaceMark,
    Mb?: IFaceMark,
    Mc?: IFaceMark,
    Md?: IFaceMark,
}

export function treeNeedsOmniTwist({_, b, c, d, B, C, D, Mb, Mc, Md, MB, MC, MD}: ITenscriptTree): boolean {
    return !!(b || c || d || B || C || D || Mb || Mc || Md || MB || MC || MD)
}

export enum MarkAction {
    Subtree,
    BaseFace,
    JoinFaces,
    FaceDistance,
    Anchor,
    Symmetrical,
}

export interface IMark {
    action: MarkAction
    tree?: ITenscriptTree
    scale?: IPercent
    point?: Vector3
}

export interface ITenscript {
    name: string
    code: string
    symmetrical: boolean
    tree: ITenscriptTree
    marks: Record<number, IMark>
    fromUrl: boolean
}

function treeToCode(tree: ITenscriptTree): string {
    const replacer = (s: string, ...args: object[]) => `${args[0]}${args[1]}`
    return JSON.stringify(tree)
        .replace(/[_.:"]/g, "")
        .replace(/[{]/g, "(")
        .replace(/[}]/g, ")")
        .replace(/([ABCDabcdSM])\((\d*)\)/g, replacer)
}

export function treeToTenscript(name: string, mainTree: ITenscriptTree, marks: Record<number, IMark>, fromUrl: boolean): ITenscript {
    const mainCode = treeToCode(mainTree)
    const markSections: string[] = []
    let symmetrical = false
    Object.keys(marks).forEach(key => {
        const mark: IMark = marks[key]
        switch (mark.action) {
            case MarkAction.Subtree:
                const tree = mark.tree
                if (!tree) {
                    throw new Error("Missing tree")
                }
                markSections.push(`${key}=${treeToCode(tree)}`)
                break
            case MarkAction.BaseFace:
                break
            case MarkAction.JoinFaces:
                break
            case MarkAction.FaceDistance:
                if (!mark.scale) {
                    throw new Error("Missing scale")
                }
                markSections.push(`${key}=face-distance-${mark.scale._}`)
                break
            case MarkAction.Anchor:
                const point = mark.point
                const scale = mark.scale
                if (!point || !scale) {
                    throw new Error("Bad anchor")
                }
                const format = (x: number) => x.toFixed(1)
                markSections.push(`${key}=anchor-(${format(point.x)},${format(point.z)})-${-point.y}-${scale._}`)
                break
            case MarkAction.Symmetrical:
                symmetrical = true
                markSections.push(`${key}=symmetrical`)
                break
        }
    })
    const subtreesCode = markSections.length > 0 ? `:${markSections.join(":")}` : ""
    return {name, tree: mainTree, symmetrical, marks, code: `'${name}':${mainCode}${subtreesCode}`, fromUrl}
}

function isDirection(char: string): boolean {
    return FACE_DIRECTIONS.indexOf(char) >= 0
}

function childTree(faceName: FaceName, tree: ITenscriptTree): ITenscriptTree | undefined {
    return tree[FACE_DIRECTIONS[faceName]]
}

function faceMark(faceName: FaceName, tree: ITenscriptTree): IFaceMark | undefined {
    return tree[`M${FACE_DIRECTIONS[faceName]}`]
}

function deleteFaceMark(faceName: FaceName, tree: ITenscriptTree): void {
    tree[`M${FACE_DIRECTIONS[faceName]}`] = undefined
}

function isDigit(char: string): boolean {
    return "0123456789".indexOf(char) >= 0
}

function toNumber(digits: string): number {
    if (!digits.match(/^\d+$/)) {
        throw new Error(`Not a number: ${digits}`)
    }
    return parseInt(digits, 10)
}

function parseCode(code: string): { name: string, mainCode: string, markCode: Record<number, string> } {
    const parts = code.replace(/[\n\r\t]/g, "").split(":")
    const foundName = parts.find(part => part.startsWith("'") && part.endsWith("'"))
    const foundMain = parts.find(part => part.startsWith("(") && part.endsWith(")"))
    const markCode: Record<number, string> = {}
    parts.filter(part => part.match(/^\d+=.*$/)).forEach(part => {
        const eq = part.indexOf("=")
        const mark = Number(part.substring(0, eq))
        markCode[mark] = part.substring(eq + 1)
    })
    return {
        name: foundName ? foundName.replace(/'/g, "") : "",
        mainCode: foundMain || "(0)",
        markCode,
    }
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
    const content = stripBrackets ? maybeBracketed.substring(1, finalBracket) : maybeBracketed.substring(0, finalBracket + 1)
    return {content, skip: finalBracket + 1}
}

export function codeToTenscript(
    error: (message: string) => void,
    fromUrl: boolean,
    code?: string,
): ITenscript | undefined {

    function fragmentToTree(codeFragment: string): ITenscriptTree | undefined {
        const initialCode = argument(codeFragment, true)
        const codeString = initialCode.content
        const tree: ITenscriptTree = {}

        function subtree(index: number): { codeTree?: ITenscriptTree, skip: number } {
            const {content, skip} = argument(codeString.substring(index), false)
            const codeTree = fragmentToTree(content)
            return {codeTree, skip}
        }

        for (let index = 0; index < codeString.length; index++) {
            const char = codeString.charAt(index)
            if (isDirection(char)) {
                const direction = subtree(index + 1)
                if (!direction.codeTree) {
                    throw new Error(`No subtree: ${codeString.substring(index)}`)
                }
                tree[char] = direction.codeTree
                index += direction.skip
            } else if (isDigit(char)) {
                const forward = argument(codeString, false)
                tree._ = toNumber(forward.content)
                index += forward.skip
            } else {
                switch (char) {
                    case "S":
                        const scaleArg = argument(codeString.substring(index + 1), true)
                        tree.S = {_: toNumber(scaleArg.content)}
                        index += scaleArg.skip
                        break
                    case "M":
                        const directionChar = codeString.charAt(index + 1)
                        const markNumber = argument(codeString.substring(index + 2), true)
                        tree[`M${directionChar}`] = {_: toNumber(markNumber.content)}
                        index += markNumber.skip + 1
                        break
                    case ",":
                    case " ":
                        break
                    default:
                        throw new Error(`Unexpected character: ${char}`)
                }
            }
        }
        return Object.keys(tree).length === 0 ? undefined : tree
    }

    try {
        if (!code || code.length === 0) {
            error("No code to parse")
            return undefined
        }
        const {name, mainCode, markCode} = parseCode(code)
        if (!name.length) {
            return undefined
        }
        const tree = fragmentToTree(mainCode)
        if (!tree) {
            return undefined
        }
        const marks: Record<number, IMark> = {}
        Object.keys(markCode).forEach(key => {
            const c: string = markCode[key]
            if (c.startsWith("subtree")) {
                const subtree = fragmentToTree(c.substring("subtree".length))
                marks[key] = <IMark>{action: MarkAction.Subtree, tree: subtree}
            } else if (c.startsWith("base-face")) {
                marks[key] = <IMark>{action: MarkAction.BaseFace}
            } else if (c.startsWith("join-faces")) {
                marks[key] = <IMark>{action: MarkAction.JoinFaces}
            } else if (c.startsWith("face-distance-")) {
                const scale: IPercent = {_: parseInt(c.split("-")[2], 10)}
                marks[key] = <IMark>{action: MarkAction.FaceDistance, scale}
            } else if (c === "symmetrical") {
                marks[key] = <IMark>{action: MarkAction.Symmetrical}
            } else {
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
                marks[key] = <IMark>{action: MarkAction.Anchor, point, scale}
            }
        })
        return treeToTenscript(name, tree, marks, fromUrl)
    } catch (e) {
        error(e.message)
        return undefined
    }
}

function noParseErrors(message: string): void {
    throw new Error(`Unable to parse: ${message}`)
}

export const BOOTSTRAP = BOOTSTRAP_TENSCRIPTS.map(script => codeToTenscript(noParseErrors, false, script)) as ITenscript[]

export interface IActiveTenscript {
    tree: ITenscriptTree
    twist: ITwist
    builder: TensegrityBuilder
}

function markTwist(twistToMark: ITwist, treeWithMarks: ITenscriptTree): void {
    FACE_NAMES.forEach(thisFace => {
        const mark = faceMark(thisFace, treeWithMarks)
        if (!mark) {
            return
        }
        faceFromTwist(twistToMark, thisFace).mark = mark
    })
}

function grow({builder, twist}: IActiveTenscript, afterTree: ITenscriptTree, faceName: FaceName, omni: boolean, scale: IPercent): IActiveTenscript {
    const baseFace = faceFromTwist(twist, faceName)
    const newTwist = builder.createTwistOn(baseFace, scale, omni)
    if (afterTree._ === 0) {
        markTwist(newTwist, afterTree)
    }
    return {tree: afterTree, twist: newTwist, builder}
}

export function execute(before: IActiveTenscript[], marks: Record<number, IMark>): IActiveTenscript[] {
    const active: IActiveTenscript[] = []
    before.forEach(activeTenscript => {
        const {tree} = activeTenscript
        const forward = tree._
        if (forward) {
            const decremented = forward - 1
            const afterTree = {...tree, _: decremented}
            const omni = treeNeedsOmniTwist(tree) && decremented === 0
            active.push(grow(activeTenscript, afterTree, FaceName.PPP, omni, percentOrHundred(tree.S)))
            return
        }
        FACE_NAMES.forEach(faceName => {
            const subtree = childTree(faceName, tree)
            const brickMark = faceMark(faceName, tree)
            if (subtree) {
                const decremented = subtree._ ? subtree._ - 1 : 0
                const afterTree = {...subtree, _: decremented}
                const omni = treeNeedsOmniTwist(subtree) && decremented === 0
                active.push(grow(activeTenscript, afterTree, faceName, omni, percentOrHundred(subtree.S)))
            } else if (brickMark) {
                const mark = marks[brickMark._]
                if (mark && mark.action === MarkAction.Subtree) {
                    const markTree = mark.tree
                    if (!markTree) {
                        throw new Error("Missing subtree")
                    }
                    deleteFaceMark(faceName, tree)
                    active.push(grow(activeTenscript, markTree, faceName, false, percentOrHundred(markTree.S)))
                }
            }
        })
    })
    return active
}

export function getCodeFromUrl(): ITenscript | undefined {
    const urlCode = location.hash.substring(1)
    try {
        return codeToTenscript(message => console.error(message), true, decodeURIComponent(urlCode))
    } catch (e) {
        console.error("Code error", e)
    }
    return undefined
}
