/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, Face3, Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"

import { emptyGenome, fromGenomeData, Genome } from "./genome"
import { Gotchi } from "./gotchi"
import { ICoords, Island, PatchCharacter } from "./island"
import {
    FAUNA_PATCH_COLOR,
    FLORA_PATCH_COLOR,
    HEXAGON_POINTS,
    NORMAL_SPREAD,
    SCALE_X,
    SCALE_Y,
    SIX,
    UP,
} from "./island-geometry"

export class Patch {
    public readonly center: Vector3
    public readonly name: string
    public adjacent: (Patch | undefined)[] = []
    public rotation = 2
    private _genome?: Genome

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

    public get genome(): Genome {
        if (!this._genome) {
            const item = localStorage.getItem(this.name)
            this._genome = item ? fromGenomeData(JSON.parse(item)) : emptyGenome()
            console.log(`Loading genome from ${this.name}`, this._genome)
        }
        return fromGenomeData(this._genome.genomeData)
    }

    public set genome(genome: Genome) {
        this._genome = genome
        const data = genome.genomeData
        localStorage.setItem(this.name, JSON.stringify(data))
    }

    public createNewGotchi(instance: FabricInstance, genome?: Genome): Gotchi | undefined {
        if (!genome) {
            genome = this.genome
        }
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

    public addSurfaceGeometry(vertices: Vector3[], faces: Face3[]): void {
        vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3().copy(this.center).addScaledVector(hexPoint, 0.99)))
        vertices.push(this.center)
        for (let a = 0; a < SIX; a++) {
            const b = (a + 1) % SIX
            const vertexNormals = [
                UP,
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], NORMAL_SPREAD).normalize(),
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], NORMAL_SPREAD).normalize(),
            ]
            faces.push(new Face3(SIX, a, b, vertexNormals, this.color))
        }
    }

    private get color(): Color {
        switch (this.patchCharacter) {
            case PatchCharacter.FaunaPatch:
                return FAUNA_PATCH_COLOR
            default:
                return FLORA_PATCH_COLOR
        }
    }
}
