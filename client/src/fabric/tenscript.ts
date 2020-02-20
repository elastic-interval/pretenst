/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { TensegrityFabric } from "./tensegrity-fabric"
import { IBrick, IFace, IFaceMark, IPercent, oppositeTriangle, percentOrHundred, Triangle } from "./tensegrity-types"

const BOOTSTRAP_TENSCRIPTS = [
    "(0):Zen",
    "(1):One",
    "(6):Six",
    "(16,S90):Axoneme",
    "(b1,a1):Knee",
    "(b3,a3):Leg",
    "(a1,b1,c1,d1):Nexus",
    "(A2,B(3,b(2,S90),S80),C(3,c(2,S90),S80),D(3,d(2,S90),S80)):Tripod with Knees",
    "(A(8, S85, MA1), a(8, S85, MA1)):Bulge Ring",
    "(a1,b(3,S85,MA1),c(3,S85,MA1),d(3,S85,MA1)):Convergence Three",
    "(a1,b(10,S85,MA1),c(10,S85,MA1),d(10,S85,MA1)):Convergence Ten",
    "(B(7,S80,MA1),C(2,S120,MA0),D(7,S80,MA1)):Halo by Crane",
    "(B(5,S75),C(5,S75),D(5,S75)):Pretenst Lander",
    "(a(1,MA0),c(3,b(3,d(3,c(3,b(3,d(1,MA0))))))):Zig Zag Loop",
    "(B2, C2, D2, A(2, b2, c2, d2)):Crystal Interstitial",
    "(a(2,b(2,c(2,d(1,MA11)),d(2,c(1,MA10))),c(2,d(2,b(1,MA13)),b(2,d(1,MA12))),d(2,b(2,c(1,MA15)),c(2,b(1,MA14)))),b(2,d(2,Mc13),c(2,Md14)),c(2,b(2,Md15),d(2,Mb10)),d(2,c(2,Mb11),b(2,Mc12))): Diamond",
    "(a(3,b(3,c(3,d(2,MA11)),d(3,c(2,MA10))),c(3,d(3,b(2,MA13)),b(3,d(2,MA12))),d(3,b(3,c(2,MA15)),c(3,b(2,MA14)))),b(3,d(3,Mc13),c(3,Md14)),c(3,b(3,Md15),d(3,Mb10)),d(3,c(3,Mb11),b(3,Mc12))):Diamond2",
]

/*
(
    a(2,
        b(2, c(2, d(1, MA11)), d(2, c(1, MA10))),
        c(2, d(2, b(1, MA13)), b(2, d(1, MA12))),
        d(2, b(2, c(1, MA15)), c(2, b(1, MA14)))
    ),
    b(2, d(2, Mc13), c(2, Md14)),
    c(2, b(2, Md15), d(2, Mb10)),
    d(2, c(2, Mb11), b(2, Mc12))
)
*/

function purify(code: string): string {
    return code.replace(/[\n\r\t ]/g, "")
}

export interface ITenscript {
    name: string,
    code: string
    tree: ITenscriptTree
    fromUrl: boolean
}

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
    MA?: IFaceMark, // marks
    MB?: IFaceMark,
    MC?: IFaceMark,
    MD?: IFaceMark,
    Ma?: IFaceMark,
    Mb?: IFaceMark,
    Mc?: IFaceMark,
    Md?: IFaceMark,
}

export function treeToTenscript(name: string, tree: ITenscriptTree, fromUrl: boolean): ITenscript {
    const replacer = (s: string, ...args: object[]) => `${args[0]}${args[1]}`
    const code = JSON.stringify(tree)
        .replace(/[_.:"]/g, "")
        .replace(/[{]/g, "(")
        .replace(/[}]/g, ")")
        .replace(/([ABCDabcdSM])\((\d*)\)/g, replacer)
    return {name, tree, code, fromUrl}
}

const DIRECTIONS = "ABCDabcd"

function isDirection(char: string): boolean {
    return DIRECTIONS.indexOf(char) >= 0
}

const DIGITS = "0123456789"

function isDigit(char: string): boolean {
    return DIGITS.indexOf(char) >= 0
}

function assignSubtree(tree: ITenscriptTree, directionChar: string, child: ITenscriptTree): void {
    switch (directionChar) {
        case "A":
            tree.A = child
            break
        case "B":
            tree.B = child
            break
        case "C":
            tree.C = child
            break
        case "D":
            tree.D = child
            break
        case "b":
            tree.b = child
            break
        case "c":
            tree.c = child
            break
        case "d":
            tree.d = child
            break
        case "a":
            tree.a = child
            break
        default:
            throw new Error("Unexpected direction directionChar: " + directionChar)
    }
}

function assignMark(tree: ITenscriptTree, directionChar: string, faceMark: IFaceMark): void {
    switch (directionChar) {
        case "A":
            tree.MA = faceMark
            break
        case "B":
            tree.MB = faceMark
            break
        case "C":
            tree.MC = faceMark
            break
        case "D":
            tree.MD = faceMark
            break
        case "a":
            tree.Ma = faceMark
            break
        case "b":
            tree.Mb = faceMark
            break
        case "c":
            tree.Mc = faceMark
            break
        case "d":
            tree.Md = faceMark
            break
        default:
            throw new Error("Unexpected direction directionChar: " + directionChar)
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

export function codeToTenscript(error: (message: string) => void, fromUrl: boolean, code?: string): ITenscript | undefined {

    function toNumber(digits: string): number {
        if (!digits.match(/^\d+$/)) {
            throw new Error(`Not a number: ${digits}`)
        }
        return parseInt(digits, 10)
    }

    function _fragmentToTree(codeFragment: string): ITenscriptTree | undefined {

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

        const initialCode = argument(codeFragment, true)
        const codeString = initialCode.content
        const tree: ITenscriptTree = {}

        function subtree(index: number): { codeTree?: ITenscriptTree, skip: number } {
            const {content, skip} = argument(codeString.substring(index), false)
            const codeTree = _fragmentToTree(content)
            return {codeTree, skip}
        }

        for (let index = 0; index < codeString.length; index++) {
            const char = codeString.charAt(index)
            if (isDirection(char)) {
                const direction = subtree(index + 1)
                if (!direction.codeTree) {
                    throw new Error(`No subtree: ${codeString.substring(index)}`)
                }
                assignSubtree(tree, char, direction.codeTree)
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
                        assignMark(tree, directionChar, {_: toNumber(markNumber.content)})
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
        const tree = _fragmentToTree(purify(code))
        if (!tree) {
            return undefined
        }
        return treeToTenscript(getNameFromCode(code), tree, fromUrl)
    } catch (e) {
        error(e.message)
        return undefined
    }
}

function noParseErrors(message: string): void {
    throw new Error(`Unable to parse: ${message}`)
}

export function addNameToCode(code: string, name: string): string {
    const colonSplit = code.split(":")
    if (colonSplit.length === 2) {
        return `${colonSplit[0]}:${name.trim()}`
    } else {
        return `${code}:${name}`
    }
}

export function getNameFromCode(code: string): string {
    const colonSplit = code.split(":")
    if (colonSplit.length === 2) {
        return colonSplit[1]
    }
    return code.split("").filter(char => isDirection(char) || isDigit(char)).join("")
}

export const BOOTSTRAP = BOOTSTRAP_TENSCRIPTS.map(script => codeToTenscript(noParseErrors, false, script)) as ITenscript[]

export interface IActiveTenscript {
    tree: ITenscriptTree
    brick: IBrick
    fabric: TensegrityFabric
}

export function execute(before: IActiveTenscript[], markFace: (mark: number, face: IFace) => void): IActiveTenscript[] {
    const active: IActiveTenscript[] = []

    before.forEach(({brick, tree, fabric}) => {

        function markBrick(brickToMark: IBrick, treeWithMarks: ITenscriptTree): void {
            function maybeMark(triangle: Triangle, mark?: IFaceMark): void {
                if (!mark) {
                    return
                }
                const brickFace = brickToMark.base === Triangle.NNN ? brickToMark.faces[triangle] : brickToMark.faces[oppositeTriangle(triangle)]
                if (brickFace.removed) {
                    throw new Error("!! trying to use a face that was removed")
                }
                markFace(mark._, brickFace)
            }

            maybeMark(Triangle.PPP, treeWithMarks.MA)
            maybeMark(Triangle.NPP, treeWithMarks.Mb)
            maybeMark(Triangle.PNP, treeWithMarks.Mc)
            maybeMark(Triangle.PPN, treeWithMarks.Md)
            maybeMark(Triangle.PNN, treeWithMarks.MB)
            maybeMark(Triangle.NPN, treeWithMarks.MC)
            maybeMark(Triangle.NNP, treeWithMarks.MD)
            maybeMark(Triangle.NNN, treeWithMarks.Ma)
        }

        function grow(previous: IBrick, newTree: ITenscriptTree, triangle: Triangle, treeScale: IPercent): IActiveTenscript {
            const connectTriangle = previous.base === Triangle.PPP ? oppositeTriangle(triangle) : triangle
            const newBrick = fabric.builder.createConnectedBrick(previous, connectTriangle, treeScale)
            if (newTree._ === 0) {
                markBrick(newBrick, newTree)
            }
            return {tree: newTree, brick: newBrick, fabric}
        }

        const forward = tree._
        if (forward) {
            const _ = forward - 1
            active.push(grow(brick, {...tree, _}, Triangle.PPP, percentOrHundred(tree.S)))
            return
        }

        function maybeGrow(growBrick: IBrick, triangle: Triangle, subtree?: ITenscriptTree): void {
            if (!subtree) {
                return
            }
            const subtreeScale = percentOrHundred(subtree.S)
            const _ = subtree._ ? subtree._ - 1 : undefined
            const decremented = {...subtree, _}
            active.push(grow(growBrick, decremented, triangle, subtreeScale))
        }

        maybeGrow(brick, Triangle.PPP, tree.A)
        maybeGrow(brick, Triangle.NPP, tree.b)
        maybeGrow(brick, Triangle.PNP, tree.c)
        maybeGrow(brick, Triangle.PPN, tree.d)
        maybeGrow(brick, Triangle.PNN, tree.B)
        maybeGrow(brick, Triangle.NPN, tree.C)
        maybeGrow(brick, Triangle.NNP, tree.D)
        maybeGrow(brick, Triangle.NNN, tree.a)
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
