/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FACE_NAME_CHARS, FACE_NAMES, FaceName, IFaceMark, IPercent } from "./tensegrity-types"

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
