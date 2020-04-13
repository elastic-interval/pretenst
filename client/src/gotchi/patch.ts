/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, Face3, Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"

import { emptyGenome, fromGenomeData, Genome } from "./genome"
import { Gotchi } from "./gotchi"
import { ICoords, Island, Surface } from "./island"
import {
    HEXAGON_POINTS,
    NORMAL_SPREAD,
    SCALE_X,
    SCALE_Y,
    SIX,
    SURFACE_LAND_COLOR,
    SURFACE_UNKNOWN_COLOR,
    SURFACE_WATER_COLOR,
    UP,
} from "./island-geometry"

export class Patch {
    public readonly center: Vector3
    public readonly name: string
    public adjacent: (Patch|undefined)[] = []
    private _genome?: Genome

    constructor(
        public readonly island: Island,
        public readonly coords: ICoords,
        public surface: Surface,
    ) {
        this.center = new Vector3(coords.x * SCALE_X, 0, coords.y * SCALE_Y)
        this.name = `(${coords.x},${coords.y})`
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
        return this.island.createNewGotchi(this, instance, genome, this.rotation)
    }

    public get rotation(): number {
        return 1 // TODO
    }

    public addSurfaceGeometry(meshKey: string, index: number, vertices: Vector3[], faces: Face3[]): void {
        vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3().copy(this.center).addScaledVector(hexPoint, 0.99)))
        vertices.push(this.center)
        const normalSpread = this.normalSpread
        for (let a = 0; a < SIX; a++) {
            const offset = index * (HEXAGON_POINTS.length + 1)
            const b = (a + 1) % SIX
            const vertexNormals = [
                UP,
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], normalSpread).normalize(),
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], normalSpread).normalize(),
            ]
            faces.push(new Face3(offset + SIX, offset + a, offset + b, vertexNormals, this.color))
        }
    }

    private get color(): Color {
        switch (this.surface) {
            case Surface.Land:
                return SURFACE_LAND_COLOR
            case Surface.Water:
                return SURFACE_WATER_COLOR
            default:
                return SURFACE_UNKNOWN_COLOR
        }
    }

    private get normalSpread(): number {
        switch (this.surface) {
            case Surface.Land:
                return NORMAL_SPREAD
            case Surface.Water:
                return -NORMAL_SPREAD
            default:
                return 0
        }
    }
}
