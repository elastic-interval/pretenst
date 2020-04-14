/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"

import { emptyGenome, fromGeneData, IGeneData } from "./genome"
import { Gotchi } from "./gotchi"
import { ICoords, Island, PatchCharacter } from "./island"
import { HEXAGON_POINTS, NORMAL_SPREAD, SCALE_X, SCALE_Y, SIX, UP } from "./island-geometry"
import { SatoshiTree } from "./satoshi-tree"

export class Patch {
    // public gotchi?: Gotchi
    public satoshiTree?: SatoshiTree
    public readonly center: Vector3
    public readonly name: string
    public adjacent: (Patch | undefined)[] = []
    public rotation = 2
    private geneData?: IGeneData[]

    constructor(
        public readonly island: Island,
        public readonly coords: ICoords,
        public patchCharacter: PatchCharacter,
    ) {
        this.center = new Vector3(coords.x * SCALE_X, 0, coords.y * SCALE_Y)
        this.name = `(${coords.x},${coords.y})`
    }

    public get onClick(): () => void {
        return () => {
            this.rotation++
            console.log("clicked", this.name, this.rotation)
        }
    }

    public get storedGenes(): IGeneData[] {
        const current = this.geneData
        if (!current) {
            const item = localStorage.getItem(this.name)
            const geneData = item ? JSON.parse(item) : emptyGenome()
            console.log(`Loading genome from ${this.name}`, geneData)
            this.geneData = geneData
            return geneData
        }
        return current
    }

    public set storedGenes(geneData: IGeneData[]) {
        this.geneData = geneData
        localStorage.setItem(this.name, JSON.stringify(this.geneData))
    }

    public createNewGotchi(instance: FabricInstance, mutant?: IGeneData[]): Gotchi | undefined {
        const genome = fromGeneData(mutant || this.storedGenes)
        return this.island.createNewGotchi(this, instance, genome)
    }

    public get positionArray(): Float32Array {
        const array = new Float32Array(SIX * 3 * 3)
        let index = 0
        const add = (point: Vector3) => {
            const {x, y, z} = new Vector3().copy(this.center).addScaledVector(point, 0.99)
            array[index++] = x
            array[index++] = y
            array[index++] = z
        }
        for (let a = 0; a < SIX; a++) {
            const b = (a + 1) % SIX
            add(new Vector3())
            add(HEXAGON_POINTS[a])
            add(HEXAGON_POINTS[b])
        }
        return array
    }

    public get normalArray(): Float32Array {
        const array = new Float32Array(SIX * 3 * 3)
        let index = 0
        const add = ({x, y, z}: Vector3) => {
            array[index++] = x
            array[index++] = y
            array[index++] = z
        }
        for (let a = 0; a < SIX; a++) {
            const b = (a + 1) % SIX
            add(UP)
            add(new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], NORMAL_SPREAD).normalize())
            add(new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], NORMAL_SPREAD).normalize())
        }
        return array
    }
}
