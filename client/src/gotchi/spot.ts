/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, Face3, Vector3 } from "three"

import { Hexalot } from "./hexalot"
import {
    HEXAGON_POINTS,
    ICoords,
    ISpot,
    NORMAL_SPREAD,
    SCALE_X,
    SCALE_Y,
    SIX,
    Surface,
    SURFACE_LAND_COLOR,
    SURFACE_UNKNOWN_COLOR,
    SURFACE_WATER_COLOR,
    UP,
} from "./island-logic"

export class Spot implements ISpot {
    public center: Vector3
    public adjacentSpots: Spot[] = []
    public memberOfHexalot: Hexalot[] = []
    public adjacentHexalots: Hexalot[] = []
    public centerOfHexalot?: Hexalot
    public connected = false
    public surface = Surface.Unknown
    public free = false

    constructor(public coords: ICoords) {
        this.center = new Vector3(coords.x * SCALE_X, 0, coords.y * SCALE_Y)
    }

    public isMemberOfOneHexalot(id: string): boolean {
        return this.memberOfHexalot.length === 1 && this.memberOfHexalot[0].id === id
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
