/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FaceName, FACE_NAMES, FACE_NAME_CHARS, IMarkNumber, IPercent } from "./tensegrity-types"

export class TenscriptNode {
    public root?: boolean

    constructor(
        public readonly forward: string | undefined,
        public readonly scale: IPercent,
        public readonly subtrees: Record<FaceName, TenscriptNode>,
        public readonly markNumbers: Record<FaceName, IMarkNumber[]>,
    ) {
    }

    public get nonEmpty(): TenscriptNode | undefined {
        const empty = this.forward === undefined && this.subtreeCode.length === 0 && this.markCode.length === 0
        return empty ? undefined : this
    }

    public get decremented(): { afterNode: TenscriptNode, action: string } {
        if (this.forward !== undefined && this.forward.length > 0) {
            const action = this.forward.substring(0, 1)
            return {
                afterNode: new TenscriptNode(this.forward.substring(1), this.scale, this.subtrees, this.markNumbers),
                action,
            }
        }
        return {afterNode: this, action: ""}
    }

    public subtree(faceName: FaceName): TenscriptNode | undefined {
        return this.subtrees[faceName]
    }

    public faceMarks(faceName: FaceName): IMarkNumber [] | undefined {
        return this.markNumbers[faceName]
    }

    public deleteMark(faceName: FaceName): void {
        delete this.markNumbers[faceName]
    }

    public get needsOmniTwist(): boolean {
        const omniFaceNames = FACE_NAMES.filter(faceName => faceName !== FaceName.A && faceName !== FaceName.a)
        return omniFaceNames.some(faceName => this.subtrees[faceName]) || omniFaceNames.some(faceName => this.markNumbers[faceName])
    }

    public get code(): string {
        const hasScale = this.scale._ !== 100
        const subtreeCode = this.subtreeCode
        const markCode = this.markCode
        if (!this.root && this.forward && this.forward.length > 0 && !hasScale && subtreeCode.length === 0 && markCode.length === 0) {
            return this.forward.toString()
        }
        const parts = []
        if (this.forward && this.forward.length > 0) {
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
        return Object.entries(this.markNumbers)
            .map(([k, marks]) => marks.map(mark => `M${FACE_NAME_CHARS[k]}${mark._}`)).flat()
    }
}
