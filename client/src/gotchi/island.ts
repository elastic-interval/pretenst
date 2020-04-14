/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"

import { Genome } from "./genome"
import { Gotchi } from "./gotchi"
import { ADJACENT, PATCH_SURROUNDING_SHAPE } from "./island-geometry"
import { Patch } from "./patch"
import { SatoshiTree } from "./satoshi-tree"

export interface ICoords {
    x: number
    y: number
}


export enum PatchCharacter {
    FaunaPatch = "Fauna",
    FloraPatch = "Flora",
}

export interface ISource {
    newGotchi(patch: Patch, instance: FabricInstance, genome: Genome): Gotchi
    newSatoshiTree(patch: Patch, instance: FabricInstance): SatoshiTree
}

function equals(a: ICoords, b: ICoords): boolean {
    return a.x === b.x && a.y === b.y
}

function plus(a: ICoords, b: ICoords): ICoords {
    return {x: a.x + b.x, y: a.y + b.y}
}

export class Island {
    public patches: Patch[] = []

    private _seed: number

    constructor(private source: ISource, public readonly name: string, seed: number) {
        this._seed = seed % 2147483647
        this.fill()
    }

    public get midpoint(): Vector3 {
        return this.patches
            .reduce((sum: Vector3, patch: Patch) => sum.add(patch.center), new Vector3())
            .multiplyScalar(1 / this.patches.length)
    }

    public createNewGotchi(patch: Patch, instance: FabricInstance, genome: Genome): Gotchi | undefined {
        return this.source.newGotchi(patch, instance, genome)
    }

    public createNewSatoshiTree(patch: Patch, instance: FabricInstance, tenscript: string): SatoshiTree {
        return this.source.newSatoshiTree(patch, instance)
    }

    public findPatch(coords: ICoords): Patch | undefined {
        return this.patches.find(p => equals(p.coords, coords))
    }

    // ================================================================================================

    private fill(): void {
        this.createSurroundedPatch({x: 0, y: 0})
        // todo: random walk/tree?
        this.patches.forEach(patch => {
            const coords = patch.coords
            ADJACENT.forEach(({x, y}) => {
                patch.adjacent.push(this.findPatch({x: x + coords.x, y: y + coords.y}))
            })
        })
    }

    private createSurroundedPatch(coords: ICoords): Patch {
        const patch = this.getOrCreatePatch(coords)
        PATCH_SURROUNDING_SHAPE.map(c => this.getOrCreatePatch(plus(c, coords)))
        return patch
    }

    private getOrCreatePatch(coords: ICoords): Patch {
        const existing = this.findPatch(coords)
        if (existing) {
            return existing
        }
        const surface = (this.next() > 0.5) ? PatchCharacter.FaunaPatch : PatchCharacter.FloraPatch
        const patch = new Patch(this, coords, surface)
        this.patches.push(patch)
        return patch
    }

    private next(): number {
        this._seed = this._seed * 16807 % 2147483647
        return (this._seed - 1) / 2147483646
    }
}
