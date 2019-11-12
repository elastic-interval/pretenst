/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { createConnectedBrick } from "./tensegrity-brick"
import { IBrick, IPercent, percentOrHundred, Triangle, TRIANGLE_DEFINITIONS } from "./tensegrity-brick-types"

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
}

export function codeTreeToTenscript(codeTree: ITenscriptTree): ITenscript {
    const replacer = (s: string, ...args: object[]) => `${args[0]}${args[1]}`
    const codeString = JSON.stringify(codeTree)
        .replace(/[_.:"]/g, "")
        .replace(/[{]/g, "(")
        .replace(/[}]/g, ")")
        .replace(/([ABCDabcdS])\((\d*)\)/g, replacer)
    return {tree: codeTree, code: codeString}
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

export function codeToTenscriptTree(error: (message: string) => void, code?: string): ITenscriptTree | undefined {
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
            switch (char) {
                case "A":
                case "B":
                case "C":
                case "D":
                case "a":
                case "b":
                case "c":
                case "d":
                    const direction = subtree(index + 1)
                    if (!direction.codeTree) {
                        throw new Error(`No subtree: ${codeString.substring(index)}`)
                    }
                    assignSubtree(tree, char, direction.codeTree)
                    index += direction.skip
                    break
                case "S":
                    const number = codeString.substring(index + 1)
                    const percent = argument(number, true)
                    tree.S = {_: parseInt(percent.content, 10)}
                    index += percent.skip
                    break
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                    const forward = argument(codeString, false)
                    tree._ = parseInt(forward.content, 10)
                    index += forward.skip
                    break
                case ",":
                    break
                default:
                    throw new Error(`Unexpected: ${char}`)
            }
        }
        return Object.keys(tree).length === 0 ? undefined : tree
    }

    try {
        if (!code || code.length === 0) {
            error("No code to parse")
            return undefined
        }
        return _fragmentToTree(code)
    } catch (e) {
        error(e.message)
        return undefined
    }
}

export interface IActiveTenscript {
    tree: ITenscriptTree
    brick: IBrick
}

export function execute(before: IActiveTenscript[]): IActiveTenscript[] {
    const active: IActiveTenscript[] = []

    function grow(previousBrick: IBrick, tree: ITenscriptTree, triangle: Triangle, scale: IPercent): IActiveTenscript {
        const connectTriangle = previousBrick.base === Triangle.PPP ? TRIANGLE_DEFINITIONS[triangle].opposite : triangle
        const brick = createConnectedBrick(previousBrick, connectTriangle, scale)
        return {tree, brick}
    }

    function maybeGrow(previousBrick: IBrick, triangle: Triangle, tree?: ITenscriptTree): void {
        if (!tree) {
            return
        }
        const scale = percentOrHundred(tree.S)
        const _ = tree._ ? tree._ - 1 : undefined
        const decremented = {...tree, _}
        active.push(grow(previousBrick, decremented, triangle, scale))
    }

    before.forEach(beforeCode => {
        const {brick, tree} = beforeCode
        const scale = percentOrHundred(tree.S)
        const forward = tree._
        if (forward) {
            const _ = forward - 1
            active.push(grow(beforeCode.brick, {...tree, _}, Triangle.PPP, scale))
        } else {
            maybeGrow(brick, Triangle.PPP, tree.A)
            maybeGrow(brick, Triangle.NPP, tree.B)
            maybeGrow(brick, Triangle.PNP, tree.C)
            maybeGrow(brick, Triangle.PPN, tree.D)
            maybeGrow(brick, Triangle.PNN, tree.b)
            maybeGrow(brick, Triangle.NPN, tree.c)
            maybeGrow(brick, Triangle.NNP, tree.d)
            maybeGrow(brick, Triangle.NNN, tree.a)
        }
    })
    return active
}

