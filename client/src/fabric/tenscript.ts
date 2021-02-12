/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Tensegrity } from "./tensegrity"
import {
    FACE_NAME_CHARS,
    FACE_NAMES,
    FaceName,
    faceNameFromChar, factorFromPercent,
    IFaceMark,
    IPercent,
    isFaceNameChar,
    jointLocation,
    omniOppositeSpin,
    oppositeSpin, percentFromFactor,
    percentOrHundred,
    reorientMatrix,
    Spin,
    spinChars,
    spinFromChars,
} from "./tensegrity-types"
import { Twist } from "./twist"

export class TenscriptNode {
    public root?: boolean

    constructor(
        public readonly forward: number,
        public readonly scale: IPercent,
        public readonly subtrees: Record<FaceName, TenscriptNode>,
        public readonly marks: Record<FaceName, IFaceMark[]>,
    ) {
    }

    public get nonEmpty(): TenscriptNode | undefined {
        const empty = this.forward === -1 && this.subtreeCode.length === 0 && this.markCode.length === 0
        return empty ? undefined : this
    }

    public get decremented(): TenscriptNode {
        if (this.forward > 0) {
            return new TenscriptNode(this.forward - 1, this.scale, this.subtrees, this.marks)
        }
        return this
    }

    public subtree(faceName: FaceName): TenscriptNode | undefined {
        return this.subtrees[faceName]
    }

    public faceMarks(faceName: FaceName): IFaceMark [] | undefined {
        return this.marks[faceName]
    }

    public deleteMark(faceName: FaceName): void {
        delete this.marks[faceName]
    }

    public get needsOmniTwist(): boolean {
        const omniFaceNames = FACE_NAMES.filter(faceName => faceName !== FaceName.A && faceName !== FaceName.a)
        return omniFaceNames.some(faceName => this.subtrees[faceName]) || omniFaceNames.some(faceName => this.marks[faceName])
    }

    public get code(): string {
        const isForward = this.forward > 0
        const hasScale = this.scale._ !== 100
        const subtreeCode = this.subtreeCode
        const markCode = this.markCode
        if (!this.root && isForward && !hasScale && subtreeCode.length === 0 && markCode.length === 0) {
            return this.forward.toString()
        }
        const parts = []
        if (isForward) {
            parts.push(this.forward.toString())
        }
        if (hasScale) {
            parts.push(`S${this.scale._}`)
        }
        parts.push(...subtreeCode)
        parts.push(...markCode)
        return `(${parts.join(",")})`
    }

    private get subtreeCode(): string [] {
        return Object.entries(this.subtrees).map(([k, v]) => `${FACE_NAME_CHARS[k]}${v.code}`)
    }

    private get markCode(): string[] {
        return Object.entries(this.marks)
            .map(([k, marks]) => marks.map(mark => `M${FACE_NAME_CHARS[k]}${mark._}`)).flat()
    }
}

export enum FaceAction {
    Subtree,
    Base,
    Join,
    Distance,
    Anchor,
    None,
}

export interface IMark {
    action: FaceAction
    tree?: TenscriptNode
    scale?: IPercent
    point?: Vector3
}

export interface ITenscript {
    name: string
    code: string
    spin: Spin
    pushesPerTwist: number
    tree: TenscriptNode
    marks: Record<number, IMark>
    fromUrl: boolean
}

export function treeToTenscript(
    name: string,
    spin: Spin,
    pushesPerTwist: number,
    tree: TenscriptNode,
    marks: Record<number, IMark>,
    fromUrl: boolean,
): ITenscript {
    const optionalPushes = pushesPerTwist > 3 ? pushesPerTwist.toFixed(0) : ""
    const mainCode = spinChars(spin) + optionalPushes + tree.code
    const markSections: string[] = []
    Object.entries(marks).forEach(([keyNumber, mark]) => {
        const key = keyNumber === "-1" ? "*" : keyNumber
        switch (mark.action) {
            case FaceAction.Subtree:
                const subtree = mark.tree
                if (!subtree) {
                    throw new Error("Missing tree")
                }
                markSections.push(`${key}=subtree${subtree.code}`)
                break
            case FaceAction.Base:
                markSections.push(`${key}=base`)
                break
            case FaceAction.Join:
                markSections.push(`${key}=join`)
                break
            case FaceAction.Distance:
                if (!mark.scale) {
                    throw new Error("Missing scale")
                }
                markSections.push(`${key}=distance-${mark.scale._}`)
                break
            case FaceAction.Anchor:
                const point = mark.point
                const scale = mark.scale
                if (!point || !scale) {
                    throw new Error("Bad anchor")
                }
                const format = (x: number) => x.toFixed(1)
                markSections.push(`${key}=anchor-(${format(point.x)},${format(point.z)})-${-point.y}-${scale._}`)
                break
        }
    })
    const subtreesCode = markSections.length > 0 ? `:${markSections.join(":")}` : ""
    return {
        name, tree, spin, pushesPerTwist, marks, fromUrl,
        code: `'${name}':${mainCode}${subtreesCode}`,
    }
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

const MAIN_CODE = /([LR]*)(\d*)(\(.*\))/

function parseMain(main: string): { mainCode: string, spin: Spin, pushesPerTwist: number } {
    const parsed = MAIN_CODE.exec(main)
    if (!parsed) {
        throw new Error("Couldn't parse")
    }
    const spin = spinFromChars(parsed[1])
    const pushesPerTwist = parsed[2].length === 0 ? 3 : parseInt(parsed[2], 10)
    const mainCode = parsed[3]
    return {mainCode, spin, pushesPerTwist}
}

function parseCode(code: string): {
    name: string,
    spin: Spin,
    pushesPerTwist: number,
    mainCode: string,
    markCode: Record<number, string>,
} {
    const parts = code.replace(/[\n\r\t]/g, "").split(":")
    const foundName = parts.find(part => part.startsWith("'") && part.endsWith("'"))
    const foundMain = parts.find(part => MAIN_CODE.test(part)) || "LR()"
    const {mainCode, spin, pushesPerTwist} = parseMain(foundMain)
    const markCode: Record<number, string> = {}
    parts.filter(part => part.match(/^(\d+|\*)=.*$/)).forEach(part => {
        const eq = part.indexOf("=")
        const key = part.substring(0, eq)
        const mark = key === "*" ? -1 : Number(key)
        markCode[mark] = part.substring(eq + 1)
    })
    const name = foundName ? foundName.replace(/'/g, "") : ""
    return {name, spin, pushesPerTwist, mainCode, markCode}
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

export function codeToTenscript(
    error: (message: string) => void,
    fromUrl: boolean,
    code?: string,
): ITenscript | undefined {

    function fragmentToNode(codeFragment: string): TenscriptNode | undefined {
        const initialCode = argument(codeFragment, true)
        const codeString = initialCode.content

        let forward = -1
        let scale = percentOrHundred()
        const subtrees = {} as Record<FaceName, TenscriptNode>
        const marks = {} as Record<FaceName, IFaceMark[]>

        function subtree(index: number): { codeTree?: TenscriptNode, skip: number } {
            const {content, skip} = argument(codeString.substring(index), false)
            const codeTree = fragmentToNode(content)
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
                        break
                    default:
                        throw new Error(`Unexpected character: ${char}`)
                }
            }
        }
        return new TenscriptNode(forward, scale, subtrees, marks).nonEmpty
    }

    try {
        if (!code || code.length === 0) {
            error("No code to parse")
            return undefined
        }
        const {name, spin, pushesPerTwist, mainCode, markCode} = parseCode(code)
        if (!name.length) {
            error("No name")
            return undefined
        }
        const root = fragmentToNode(mainCode)
        if (!root) {
            return undefined
        }
        root.root = true
        const marks: Record<number, IMark> = {}
        Object.keys(markCode).forEach(key => {
            const c: string = markCode[key]
            if (c.startsWith("subtree")) {
                const subtree = fragmentToNode(c.substring("subtree".length))
                marks[key] = <IMark>{action: FaceAction.Subtree, tree: subtree}
            } else if (c.startsWith("base")) {
                marks[key] = <IMark>{action: FaceAction.Base}
            } else if (c.startsWith("join")) {
                marks[key] = <IMark>{action: FaceAction.Join}
            } else if (c.startsWith("distance-")) {
                const scale: IPercent = {_: parseInt(c.split("-")[1], 10)}
                marks[key] = <IMark>{action: FaceAction.Distance, scale}
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
                marks[key] = <IMark>{action: FaceAction.Anchor, point, scale}
            }
        })
        return treeToTenscript(name, spin, pushesPerTwist, root, marks, fromUrl)
    } catch (e) {
        console.error("err", e)
        error(e.message)
        return undefined
    }
}

export interface IBud {
    tree: TenscriptNode
    twist: Twist
    marks: Record<number, IMark>
    reorient: boolean
}

export function createBud(tensegrity: Tensegrity, {spin, tree, marks}: ITenscript): IBud {
    const reorient = tree.forward === -1
    const twist = new Twist(tensegrity, spin, percentOrHundred(), [new Vector3()])
    return {tree, twist, marks, reorient}
}

function markTwist(twistToMark: Twist, treeWithMarks: TenscriptNode): void {
    FACE_NAMES.forEach(thisFace => {
        const marks = treeWithMarks.faceMarks(thisFace)
        if (!marks) {
            return
        }
        twistToMark.face(thisFace).marks.push(...marks)
    })
}

function grow({twist, marks}: IBud,
              afterTree: TenscriptNode, faceName: FaceName, omni: boolean, scaleChange: IPercent): IBud {
    const baseFace = twist.face(faceName)
    const spin = omni ? omniOppositeSpin(baseFace.spin) : oppositeSpin(baseFace.spin)
    const scale = percentFromFactor(factorFromPercent(baseFace.scale) * factorFromPercent(scaleChange))
    const newTwist = twist.tensegrity.createTwistOn(baseFace, spin, scale)
    if (afterTree.forward === 0) {
        markTwist(newTwist, afterTree)
    }
    return {tree: afterTree, twist: newTwist, marks, reorient: false}
}

export function execute(before: IBud[]): IBud[] {
    const activeBuds: IBud[] = []
    before.forEach(bud => {
        const {tree, marks, reorient, twist} = bud
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
                        const markFound = marks[twistMark._]
                        const mark = markFound ? markFound : marks[-1]
                        if (mark.action === FaceAction.Subtree) {
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

