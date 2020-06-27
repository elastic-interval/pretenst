/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Tensegrity } from "./tensegrity"
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
    "'Axoneme':(16,S90)",
    "'Knee':(b1,a1)",
    "'Leg':(b3,a3)",
    "'Nexus':(a1,b1,c1,d1)",
    "'Tripod with Knees':(A2,B(3,b(2,S90),S80),C(3,c(2,S90),S80),D(3,d(2,S90),S80))",
    "'Pretenst Lander':(B(5,S75),C(5,S75),D(5,S75))",
    "'Zig Zag Loop':(a(1,MA0),c(3,b(3,d(3,c(3,b(3,d(1,MA0)))))))",
    "'Bulge Ring':(A(8, S85, MA1), a(8, S85, MA1))",
    "'Ring':(A(10,MA1),a(10,MA1))",
    "'Convergence Three':(a1,b(3,S85,MA1),c(3,S85,MA1),d(3,S85,MA1))",
    "'Convergence Ten':(a1,b(10,S85,MA1),c(10,S85,MA1),d(10,S85,MA1))",
    "'Halo by Crane':(B(7,S80,MA1),C(2,S120,MA0),D(7,S80,MA1))",
    "'Thick Tripod':(A1,B(3,MA1),C(3,MA1),D(3,MA1)):1=face-distance-35",
    "'Ankh':(A(3,S90,Mb0),b(3,S90,Mb0),a(5,S80,MA1),B(5,MA1,S80)):0=face-distance-30",
    "'Diamond':(a(2,b(2,c(2,d(1,MA1)),d(2,c(1,MA0))),c(2,d(2,b(1,MA3)),b(2,d(1,MA2))),d(2,b(2,c(1,MA5)),c(2,b(1,MA4)))),b(2,d(2,Mc3),c(2,Md4)),c(2,b(2,Md5),d(2,Mb0)),d(2,c(2,Mb1),b(2,Mc2)))",
    "'Composed':(3,b(2,MA0),c(2,MA0),d(2,MA0)):0=subtree(b2,c2,d2)",
    "'Minigotchi':(A(3,S90,Mb0),b(3,S90,Mb0),a(2,S90,Md0),B(2,Md0,S90)):0=face-distance-60:9=symmetrical",
    "'Mesogotchi':(A(2,c(2,MA0)),b(2,c(2,MA0)),a(2,d(2,MA0)),B(2,d(2,MA0))):0=face-distance-115:9=symmetrical",
    "'Gorillagotchi':(A(5,S80,Mb0),b(5,S80,Mb0),a(3,S70,Md0),B(3,Md0,S70)):0=face-distance-60:9=symmetrical",
    "'Equus Lunae':(A(8,S90,Mb0),b(8,S90,Mb0),a(8,S90,Md0),B(8,Md0,S90)):0=face-distance-60:9=symmetrical",
    "'Infinity':(a(5,S80,MA1),b(5,S80,MA2),B(5,S80,MA1),A(5,S80,MA2))",
    "'Binfinity':(d(6,S80,MA4),C(6,S80,MA4),c(6,S80,MA3),D(6,S80,MA3),a(6,S80,MA1),b(6,S80,MA2),B(6,S80,MA1),A(6,S80,MA2))",
    "'Mobiosity':(d(6,S80,MA4),C(6,S80,MA4),c(6,S80,MA3),D(6,S80,MA2),a(6,S80,MA1),b(6,S80,MA2),B(6,S80,MA1),A(6,S80,MA3))",
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
    tensegrity: Tensegrity
}

export function execute(before: IActiveTenscript[], marks: Record<number, IMark>): IActiveTenscript[] {
    const active: IActiveTenscript[] = []

    before.forEach(({twist, tree, tensegrity}) => {

        function markTwist(twistToMark: ITwist, treeWithMarks: ITenscriptTree): void {
            FACE_NAMES.forEach(thisFace => {
                const mark = faceMark(thisFace, treeWithMarks)
                if (!mark) {
                    return
                }
                // TODO: this stuff
                // const brickFace = twistToMark.base === FaceName.NNN ? twistToMark.faces[thisFace] : twistToMark.faces[oppositeFace(thisFace)]
                // if (brickFace.removed) {
                //     throw new Error("!! trying to use a face that was removed")
                // }
                // brickFace.mark = mark
            })
        }

        function grow(previous: ITwist, newTree: ITenscriptTree, faceName: FaceName, treeScale: IPercent): IActiveTenscript {
            const connectFace = faceFromTwist(previous, faceName)
            const newTwist = new TensegrityBuilder(tensegrity).createTwistOn(connectFace, treeScale)
            if (newTree._ === 0) {
                markTwist(newTwist, newTree)
            }
            return {tree: newTree, twist: newTwist, tensegrity}
        }

        const forward = tree._
        if (forward) {
            const _ = forward - 1
            active.push(grow(twist, {...tree, _}, FaceName.PPP, percentOrHundred(tree.S)))
            return
        }

        FACE_NAMES.forEach(faceName => {
            const subtree = childTree(faceName, tree)
            const brickMark = faceMark(faceName, tree)
            if (subtree) {
                const _ = subtree._ ? subtree._ - 1 : undefined
                const decremented = {...subtree, _}
                active.push(grow(twist, decremented, faceName, percentOrHundred(subtree.S)))
            } else if (brickMark) {
                const mark = marks[brickMark._]
                if (mark && mark.action === MarkAction.Subtree) {
                    const markTree = mark.tree
                    if (!markTree) {
                        throw new Error("Missing subtree")
                    }
                    deleteFaceMark(faceName, tree)
                    active.push(grow(twist, markTree, faceName, percentOrHundred(markTree.S)))
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
