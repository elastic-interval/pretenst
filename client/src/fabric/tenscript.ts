/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IBrick, IFace, IFaceMark, IPercent, opposite, percentOrHundred, Triangle } from "./tensegrity-brick-types"
import { TensegrityFabric } from "./tensegrity-fabric"

const BOOTSTRAP_TENSCRIPTS = [
    "(0)",
    "(1)",
    "(2)",
    "(6)",
    "(6,S85)",
    "(B1,a1)",
    "(B3,a3)",
    "(A1,b3,c3,d3)",
    "(B2,C2,D2,a2)",
    "(C(2,B(2,D(2,C2))))",
    "(C(3,B(3,D(3,C(3,B1)))))",
    "(a(1,MA0),C(3,B(3,D(3,C(3,B(3,D(1,MA0)))))))",
    "(b(5,S70),c(5,S70),d(5,S70),A1)",
    "(B2,C2,D2,a(2,B2,C2,D2))",
    "(A2,b(3,B(2,S90),S80),c(3,C(2,S90),S80),d(3,D(2,S90),S80))",
]

export interface ITenscript {
    code: string
    tree: ITenscriptTree
}

export interface ITenscriptTree {
    _?: number, // forward steps
    S?: IPercent, // scale
    A?: ITenscriptTree, // directions
    B?: ITenscriptTree, // kinda up
    C?: ITenscriptTree,
    D?: ITenscriptTree,
    b?: ITenscriptTree, // kinda down
    c?: ITenscriptTree,
    d?: ITenscriptTree,
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

export function treeToTenscript(codeTree: ITenscriptTree): ITenscript {
    const replacer = (s: string, ...args: object[]) => `${args[0]}${args[1]}`
    const codeString = JSON.stringify(codeTree)
        .replace(/[_.:"]/g, "")
        .replace(/[{]/g, "(")
        .replace(/[}]/g, ")")
        .replace(/([ABCDabcdSM])\((\d*)\)/g, replacer)
    return {tree: codeTree, code: codeString}
}

const DIRECTIONS = "ABCDabcd"

function isDirection(char: string): boolean {
    return DIRECTIONS.indexOf(char) >= 0
}

const DIGITS = "0123456789"

function isDigit(char: string): boolean {
    return DIGITS.indexOf(char) >= 0
}

export function spaceAfterComma(tenscript: string): string {
    return tenscript.replace(/[,]/g, ", ")
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

export function codeToTenscript(error: (message: string) => void, code?: string): ITenscript | undefined {
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
                tree._ = parseInt(forward.content, 10)
                index += forward.skip
            } else {
                switch (char) {
                    case "S":
                        const scaleArg = argument(codeString.substring(index + 1), true)
                        tree.S = {_: parseInt(scaleArg.content, 10)}
                        index += scaleArg.skip
                        break
                    case "M":
                        const directionChar = codeString.charAt(index + 1)
                        const markNumber = argument(codeString.substring(index + 2), true)
                        assignMark(tree, directionChar, {_: parseInt(markNumber.content, 10)})
                        index += markNumber.skip + 1
                        break
                    case ",":
                    case " ":
                        break
                    default:
                        throw new Error(`Unexpected: ${char}`)
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
        const tree = _fragmentToTree(code)
        if (!tree) {
            return undefined
        }
        return treeToTenscript(tree)
    } catch (e) {
        error(e.message)
        return undefined
    }
}

function noParseErrors(message: string): void {
    throw new Error(`Unable to parse: ${message}`)
}

export const BOOTSTRAP: ITenscript[] = BOOTSTRAP_TENSCRIPTS.map(script => codeToTenscript(noParseErrors, script)) as ITenscript[]

export interface IActiveTenscript {
    tree: ITenscriptTree
    brick: IBrick
    fabric: TensegrityFabric
    markedFaces: Record<number, IFace>
}

export function execute(before: IActiveTenscript[]): IActiveTenscript[] {
    const active: IActiveTenscript[] = []

    before.forEach(({brick, tree, fabric, markedFaces}) => {

        function markBrick(brickToMark: IBrick, treeWithMarks: ITenscriptTree): void {
            function maybeMark(triangle: Triangle, mark?: IFaceMark): void {
                if (!mark) {
                    return
                }
                const brickFace = brickToMark.base === Triangle.NNN ? brickToMark.faces[triangle] : brickToMark.faces[opposite(triangle)]
                if (brickFace.removed) {
                    throw new Error("!! trying to use a face that was removed")
                }
                const markedFace = markedFaces[mark._]
                if (markedFace) {
                    fabric.builder.addFacePair(markedFace, brickFace)
                }
                markedFaces[mark._] = brickFace
            }

            maybeMark(Triangle.PPP, treeWithMarks.MA)
            maybeMark(Triangle.NPP, treeWithMarks.MB)
            maybeMark(Triangle.PNP, treeWithMarks.MC)
            maybeMark(Triangle.PPN, treeWithMarks.MD)
            maybeMark(Triangle.PNN, treeWithMarks.Mb)
            maybeMark(Triangle.NPN, treeWithMarks.Mc)
            maybeMark(Triangle.NNP, treeWithMarks.Md)
            maybeMark(Triangle.NNN, treeWithMarks.Ma)
        }

        function grow(previous: IBrick, newTree: ITenscriptTree, triangle: Triangle, treeScale: IPercent): IActiveTenscript {
            const connectTriangle = previous.base === Triangle.PPP ? opposite(triangle) : triangle
            const newBrick = fabric.builder.createConnectedBrick(previous, connectTriangle, treeScale)
            if (newTree._ === 0) {
                markBrick(newBrick, newTree)
            }
            return {tree: newTree, brick: newBrick, fabric, markedFaces}
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
        maybeGrow(brick, Triangle.NPP, tree.B)
        maybeGrow(brick, Triangle.PNP, tree.C)
        maybeGrow(brick, Triangle.PPN, tree.D)
        maybeGrow(brick, Triangle.PNN, tree.b)
        maybeGrow(brick, Triangle.NPN, tree.c)
        maybeGrow(brick, Triangle.NNP, tree.d)
        maybeGrow(brick, Triangle.NNN, tree.a)
    })
    return active
}

