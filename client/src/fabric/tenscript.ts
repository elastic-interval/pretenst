/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Tensegrity } from "./tensegrity"
import { TensegrityBuilder } from "./tensegrity-builder"
import {
    IBrick,
    IFaceMark,
    IPercent,
    oppositeTriangle,
    percentOrHundred,
    Triangle,
    TRIANGLE_DIRECTIONS,
    TRIANGLES,
} from "./tensegrity-types"

const BOOTSTRAP_TENSCRIPTS = [
    "'Zen':(0)",
    "'One':(1)",
    "'Six':(6)",
    "'Axoneme':(16,S90)",
    "'Knee':(b1,a1)",
    "'Leg':(b3,a3)",
    "'Nexus':(a1,b1,c1,d1)",
    "'Tripod with Knees':(A2,B(3,b(2,S90),S80),C(3,c(2,S90),S80),D(3,d(2,S90),S80))",
    "'Ring':(A(10,MA1),a(10,MA1))",
    "'Bulge Ring':(A(8, S85, MA1), a(8, S85, MA1))",
    "'Convergence Three':(a1,b(3,S85,MA1),c(3,S85,MA1),d(3,S85,MA1))",
    "'Convergence Ten':(a1,b(10,S85,MA1),c(10,S85,MA1),d(10,S85,MA1))",
    "'Halo by Crane':(B(7,S80,MA1),C(2,S120,MA0),D(7,S80,MA1))",
    "'Pretenst Lander':(B(5,S75),C(5,S75),D(5,S75))",
    "'Zig Zag Loop':(a(1,MA0),c(3,b(3,d(3,c(3,b(3,d(1,MA0)))))))",
    "'Crystal Interstitial':(B2, C2, D2, A(2, b2, c2, d2))",
    "'Diamond':(a(2,b(2,c(2,d(1,MA1)),d(2,c(1,MA0))),c(2,d(2,b(1,MA3)),b(2,d(1,MA2))),d(2,b(2,c(1,MA5)),c(2,b(1,MA4)))),b(2,d(2,Mc3),c(2,Md4)),c(2,b(2,Md5),d(2,Mb0)),d(2,c(2,Mb1),b(2,Mc2)))",
    "'Composed':(3,b(2,MA0),c(2,MA0),d(2,MA0)):0=subtree(b2,c2,d2)",
    "'Galapagotchi1':(A(3,S90,Mb0),b(3,S90,Mb0),a(2,S90,Md0),B(2,Md0,S90)):0=face-distance-60",
    "'Galapagotchi2':(A(2,c(2,MA0)),b(2,c(2,MA0)),a(2,d(2,MA0)),B(2,d(2,MA0))):0=face-distance-115",
    "'Galapagotchi3':(A(5,S80,Mb0),b(5,S80,Mb0),a(3,S70,Md0),B(3,Md0,S70)):0=face-distance-60",
    "'Thick Tripod':(A1,B(3,MA1),C(3,MA1),D(3,MA1)):1=face-distance-35",
    "'Bug Big':(A(8,S90,Mb0),b(8,S90,Mb0),a(8,S90,Md0),B(8,Md0,S90)):0=face-distance-60",
    "'Ankh':(A(3,S90,Mb0),b(3,S90,Mb0),a(5,S80,MA1),B(5,MA1,S80)):0=face-distance-30",
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
}

export interface IMark {
    action: MarkAction
    tree?: ITenscriptTree
    scale?: IPercent
}

export interface ITenscript {
    name: string
    code: string
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
                const scale = mark.scale
                if (!scale) {
                    throw new Error("Missing scale")
                }
                markSections.push(`${key}=face-distance-${scale._}`)
                break
        }
    })
    const subtreesCode = markSections.length > 0 ? `:${markSections.join(":")}` : ""
    return {name, tree: mainTree, marks, code: `'${name}':${mainCode}${subtreesCode}`, fromUrl}
}

function isDirection(char: string): boolean {
    return TRIANGLE_DIRECTIONS.indexOf(char) >= 0
}

function childTree(triangle: Triangle, tree: ITenscriptTree): ITenscriptTree | undefined {
    return tree[TRIANGLE_DIRECTIONS[triangle]]
}

function faceMark(triangle: Triangle, tree: ITenscriptTree): IFaceMark | undefined {
    return tree[`M${TRIANGLE_DIRECTIONS[triangle]}`]
}

function deleteFaceMark(triangle: Triangle, tree: ITenscriptTree): void {
    tree[`M${TRIANGLE_DIRECTIONS[triangle]}`] = undefined
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
        name: foundName ? foundName.replace(/'/g, "") : new Date().toDateString(),
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
            } else {
                throw new Error(`Unrecognized mark code: [${c}]`)
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
    brick: IBrick
    tensegrity: Tensegrity
}

export function execute(before: IActiveTenscript[], marks: Record<number, IMark>): IActiveTenscript[] {
    const active: IActiveTenscript[] = []

    before.forEach(({brick, tree, tensegrity}) => {

        function markBrick(brickToMark: IBrick, treeWithMarks: ITenscriptTree): void {
            TRIANGLES.forEach(triangle => {
                const mark = faceMark(triangle, treeWithMarks)
                if (!mark) {
                    return
                }
                const brickFace = brickToMark.base === Triangle.NNN ? brickToMark.faces[triangle] : brickToMark.faces[oppositeTriangle(triangle)]
                if (brickFace.removed) {
                    throw new Error("!! trying to use a face that was removed")
                }
                brickFace.mark = mark
            })
        }

        function grow(previous: IBrick, newTree: ITenscriptTree, triangle: Triangle, treeScale: IPercent): IActiveTenscript {
            const connectTriangle = previous.base === Triangle.PPP ? oppositeTriangle(triangle) : triangle
            const newBrick = new TensegrityBuilder(tensegrity).createConnectedBrick(previous, connectTriangle, treeScale)
            if (newTree._ === 0) {
                markBrick(newBrick, newTree)
            }
            return {tree: newTree, brick: newBrick, tensegrity}
        }

        const forward = tree._
        if (forward) {
            const _ = forward - 1
            active.push(grow(brick, {...tree, _}, Triangle.PPP, percentOrHundred(tree.S)))
            return
        }

        TRIANGLES.forEach(triangle => {
            const subtree = childTree(triangle, tree)
            const triangleMark = faceMark(triangle, tree)
            if (subtree) {
                const _ = subtree._ ? subtree._ - 1 : undefined
                const decremented = {...subtree, _}
                active.push(grow(brick, decremented, triangle, percentOrHundred(subtree.S)))
            } else if (triangleMark) {
                const mark = marks[triangleMark._]
                if (mark && mark.action === MarkAction.Subtree) {
                    const markTree = mark.tree
                    if (!markTree) {
                        throw new Error("Missing subtree")
                    }
                    deleteFaceMark(triangle, tree)
                    active.push(grow(brick, markTree, triangle, percentOrHundred(markTree.S)))
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
