/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { TensegrityBuilder } from "./tensegrity-builder"
import {
    FACE_NAME_CHARS,
    FACE_NAMES,
    faceFromTwist,
    FaceName,
    faceNameFromChar,
    IFaceMark,
    IPercent,
    isFaceNameChar,
    ITwist,
    jointLocation,
    percentOrHundred,
    reorientMatrix,
    Spin,
    spinChars,
    spinFromChars,
} from "./tensegrity-types"

const BOOTSTRAP_TENSCRIPTS = [
    "'Phi':LR()",
    "'One':L(1)",
    "'Six':L(6)",
    "'Axoneme':L(30,S95)",
    "'Knee':L(3,b3)",
    "'Snelson Star':LR(a(15,S90),b(15,S90),c(15,S90),d(15,S90))",
    "'Tripod with Knees':RL(A5,B(7,c(5,S90),S90),C(7,c(5,S90),S90),D(7,c(5,S90),S90))",
    "'Pretenst Lander':LR(B(15,S90),C(15,S90),D(15,S90))",
    "'Zig Zag Loop':LR(d(3,MA0),c(7,b(7,d(7,d(7,d(7,d(3,MA0)))))))",
    "'Bulge Ring':L(A(15,S90, MA1), a(16, S90, MA1))",
    "'Ring':L(A(19,MA1),a(18,MA1))",
    "'Convergence':LR(a1,b(15,S92,MA1),c(15,S92,MA1),d(15,S92,MA1))",
    "'Halo by Crane':L(5,S92,b(12,S92,MA1),d(11,S92,MA1))",
    "'Thick Tripod':LR(A3,B(8,MA1),C(8,MA1),D(8,MA1)):1=face-distance-35",
    "'Diamond':RL(a(5,b(5,c(5,c(2,MA3)),d(5,b(2,MA4))),c(5,d(5,b(2,MA5)),c(5,c(2,MA1))),d(5,c(5,c(2,MA6)),d(5,b(2,MA2)))),b(5,b(5,d(2,MA3)),c(5,c(2,MA2))),c(5,b(5,d(2,MA6)),c(5,c(2,MA5))),d(5,c(5,c(2,MA4)),b(5,d(2,MA1))))",
    "'Composed':L(6,b(4,MA0),c(4,MA0),d(4,MA0)):0=subtree(b5,c5,d5)",
    "'Equus Lunae':LR(A(16,S95,Mb0),b(16,S95,Md0),a(16,S95,Md0),B(16,Mb0,S95)):0=face-distance-60",
    "'Infinity':LR(a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2))",
    "'Binfinity':LR(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA3),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2))",
    "'Mobiosity':LR(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA2),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA3))",
    "'Cup':L-24(15,S105)",
    "'Torus':L-24(A(13,S95,MA1),a(14,S95,MA1))",
    "'Pretenst Squared':L(a(3,MA1),A(2,MA1)):1=face-distance-70",
]

export class TenscriptNode {
    public root?: boolean
    public forward = -1
    public scale = percentOrHundred()
    private subtrees = {} as Record<FaceName, TenscriptNode>
    private marks = {} as Record<FaceName, IFaceMark>

    public get nonEmpty(): TenscriptNode | undefined {
        const empty = this.forward === -1 && this.subtreeCode.length === 0 && this.markCode.length === 0
        return empty ? undefined : this
    }

    public get decremented(): TenscriptNode {
        if (this.forward > 0) {
            const clone = new TenscriptNode()
            clone.forward = this.forward - 1
            clone.root = this.root
            clone.scale = this.scale
            clone.subtrees = this.subtrees
            clone.marks = this.marks
            return clone
        }
        return this
    }

    public addSubtree(faceName: FaceName, tree: TenscriptNode): void {
        this.subtrees[faceName] = tree
    }

    public addMark(faceName: FaceName, mark: number): void {
        this.marks[faceName] = {_: mark}
    }

    public subtree(faceName: FaceName): TenscriptNode | undefined {
        return this.subtrees[faceName]
    }

    public mark(faceName: FaceName): IFaceMark | undefined {
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
        return Object.entries(this.marks).map(([k, v]) => `M${FACE_NAME_CHARS[k]}${v._}`)
    }
}

export enum MarkAction {
    Subtree,
    BaseFace,
    JoinFaces,
    FaceDistance,
    AddTip,
    Anchor,
}

export interface IMark {
    action: MarkAction
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
    mainTree: TenscriptNode,
    marks: Record<number, IMark>,
    fromUrl: boolean,
): ITenscript {
    const optionalPushes = pushesPerTwist > 3 ? pushesPerTwist.toFixed(0) : ""
    const mainCode = spinChars(spin) + optionalPushes + mainTree.code
    const markSections: string[] = []
    Object.keys(marks).forEach(key => {
        const mark: IMark = marks[key]
        switch (mark.action) {
            case MarkAction.Subtree:
                const tree = mark.tree
                if (!tree) {
                    throw new Error("Missing tree")
                }
                markSections.push(`${key}=subtree${tree.code}`)
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
            case MarkAction.AddTip:
                markSections.push(`${key}=add-tip`)
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
        }
    })
    const subtreesCode = markSections.length > 0 ? `:${markSections.join(":")}` : ""
    return {name, tree: mainTree, spin, pushesPerTwist, marks, code: `'${name}':${mainCode}${subtreesCode}`, fromUrl}
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
    parts.filter(part => part.match(/^\d+=.*$/)).forEach(part => {
        const eq = part.indexOf("=")
        const mark = Number(part.substring(0, eq))
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
        const tenscriptNode = new TenscriptNode()

        function subtree(index: number): { codeTree?: TenscriptNode, skip: number } {
            const {content, skip} = argument(codeString.substring(index), false)
            const codeTree = fragmentToNode(content)
            return {codeTree, skip}
        }

        for (let index = 0; index < codeString.length; index++) {
            const char = codeString.charAt(index)
            if (isFaceNameChar(char)) {
                const direction = subtree(index + 1)
                if (!direction.codeTree) {
                    throw new Error(`No subtree: ${codeString.substring(index)}`)
                }
                tenscriptNode.addSubtree(faceNameFromChar(char), direction.codeTree)
                index += direction.skip
            } else if (isDigit(char)) {
                const forward = argument(codeString, false)
                tenscriptNode.forward = toNumber(forward.content)
                index += forward.skip
            } else {
                switch (char) {
                    case "S":
                        const scaleArg = argument(codeString.substring(index + 1), true)
                        tenscriptNode.scale = {_: toNumber(scaleArg.content)}
                        index += scaleArg.skip
                        break
                    case "M":
                        const faceNameChar = codeString.charAt(index + 1)
                        const markNumber = argument(codeString.substring(index + 2), true)
                        tenscriptNode.addMark(faceNameFromChar(faceNameChar), toNumber(markNumber.content))
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
        return tenscriptNode.nonEmpty
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
                marks[key] = <IMark>{action: MarkAction.Subtree, tree: subtree}
            } else if (c.startsWith("base-face")) {
                marks[key] = <IMark>{action: MarkAction.BaseFace}
            } else if (c.startsWith("add-tip")) {
                marks[key] = <IMark>{action: MarkAction.AddTip}
            } else if (c.startsWith("join-faces")) {
                marks[key] = <IMark>{action: MarkAction.JoinFaces}
            } else if (c.startsWith("face-distance-")) {
                const scale: IPercent = {_: parseInt(c.split("-")[2], 10)}
                marks[key] = <IMark>{action: MarkAction.FaceDistance, scale}
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
        return treeToTenscript(name, spin, pushesPerTwist, root, marks, fromUrl)
    } catch (e) {
        error(e.message)
        return undefined
    }
}


export const BOOTSTRAP = BOOTSTRAP_TENSCRIPTS.map(script => {
    const tenscript = codeToTenscript(message => {
        throw new Error(`Bootstrap parse error in "${script}"! ${message}`)
    }, false, script)
    if (!tenscript) {
        throw new Error(`Unable to parse [${script}]`)
    }
    return tenscript
})

export interface IBud {
    builder: TensegrityBuilder
    tree: TenscriptNode
    twist: ITwist
    marks: Record<number, IMark>
    reorient: boolean
}

function markTwist(twistToMark: ITwist, treeWithMarks: TenscriptNode): void {
    FACE_NAMES.forEach(thisFace => {
        const mark = treeWithMarks.mark(thisFace)
        if (!mark) {
            return
        }
        faceFromTwist(twistToMark, thisFace).mark = mark
    })
}

function grow({builder, twist, marks}: IBud, afterTree: TenscriptNode, faceName: FaceName, omni: boolean, scale: IPercent): IBud {
    const baseFace = faceFromTwist(twist, faceName)
    const newTwist = builder.createTwistOn(baseFace, scale, omni)
    if (afterTree.forward === 0) {
        markTwist(newTwist, afterTree)
    }
    return {tree: afterTree, twist: newTwist, builder, marks, reorient: false}
}

export function execute(before: IBud[]): IBud[] {
    const activeBuds: IBud[] = []
    before.forEach(bud => {
        const {twist, tree, marks, builder, reorient} = bud
        if (tree.forward > 0) {
            const afterTree = tree.decremented
            const omni = tree.needsOmniTwist && afterTree.forward === 0
            activeBuds.push(grow(bud, afterTree, FaceName.A, omni, tree.scale))
            return
        }
        if (reorient) {
            const abOrientation = ![FaceName.A, FaceName.a, FaceName.B, FaceName.b].some(f => !tree.subtree(f))
            if (abOrientation) {
                const points = builder.tensegrity.joints.map(jointLocation)
                builder.tensegrity.instance.apply(reorientMatrix(points, 0))
            }
        }
        FACE_NAMES.forEach(faceName => {
            const subtree = tree.subtree(faceName)
            const twistMark = tree.mark(faceName)
            if (subtree) {
                const afterTree = subtree.decremented
                const omni = subtree.needsOmniTwist && subtree.forward === 0
                activeBuds.push(grow(bud, afterTree, faceName, omni, subtree.scale))
            } else if (twistMark) {
                markTwist(twist, tree)
                const mark = marks[twistMark._]
                if (mark && mark.action === MarkAction.Subtree) {
                    const markTree = mark.tree
                    if (!markTree) {
                        throw new Error("Missing subtree")
                    }
                    tree.deleteMark(faceName)
                    const omni = markTree.needsOmniTwist
                    activeBuds.push(grow(bud, markTree, faceName, omni, percentOrHundred(markTree.scale)))
                }
            }
        })
    })
    return activeBuds
}

export function getCodeFromUrl(): ITenscript | undefined {
    const urlCode = location.hash.substring(1)
    try {
        return codeToTenscript(message => console.error("code from URL", message), true, decodeURIComponent(urlCode))
    } catch (e) {
        console.error("Code error", e)
    }
    return undefined
}
