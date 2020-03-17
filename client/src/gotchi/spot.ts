/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, Face3, Vector3 } from "three"

import { Hexalot } from "./hexalot"
import { HEXAGON_POINTS, ICoords, ISpot, isSpotLegal, SIX, Surface, UP } from "./island-logic"
import {
    LAND_NORMAL_SPREAD,
    SCALE_X,
    SCALE_Y,
    SURFACE_LAND_COLOR,
    SURFACE_UNKNOWN_COLOR,
    SURFACE_WATER_COLOR,
    WATER_NORMAL_SPREAD,
} from "./island-logic"

export class Spot implements ISpot {
    public center: Vector3
    public adjacentSpots: Spot[] = []
    public memberOfHexalot: Hexalot[] = []
    public adjacentHexalots: Hexalot[] = []
    public centerOfHexalot?: Hexalot
    public connected = false
    public faceNames: string[] = []
    public surface = Surface.Unknown
    public free = false

    constructor(public coords: ICoords) {
        this.center = new Vector3(coords.x * SCALE_X, 0, coords.y * SCALE_Y)
    }

    public isMemberOfOneHexalot(id: string): boolean {
        return this.memberOfHexalot.length === 1 && this.memberOfHexalot[0].id === id
    }

    public addSurfaceGeometry(meshKey: string, index: number, vertices: Vector3[], faces: Face3[]): void {
        const sizeFactor = isSpotLegal(this) ? 1 : 0.9
        vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3(
            hexPoint.x * sizeFactor + this.center.x,
            hexPoint.y * sizeFactor + this.center.y,
            hexPoint.z * sizeFactor + this.center.z,
        )))
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
            this.faceNames.push(`${meshKey}:${faces.length}`)
            faces.push(new Face3(offset + SIX, offset + a, offset + b, vertexNormals, this.color))
        }
    }

    public addRaisedHexagon(vertices: Vector3[], height: number): void {
        const vertex = (hexPoint: Vector3) => vertices.push(new Vector3(0, height, 0).add(this.center).add(hexPoint))
        for (let a = 0; a < SIX; a++) {
            const b = (a + 1) % SIX
            vertex(HEXAGON_POINTS[a])
            vertex(HEXAGON_POINTS[b])
        }
    }

    public addRaisedHexagonParts(vertices: Vector3[], height: number, outerIndex: number, side: number): void {
        const direction = (Math.floor(outerIndex / side) + 5) % 6
        const corner = outerIndex % side === 0
        const vertex = (hexPoint: Vector3) => vertices.push(new Vector3(0, height, 0).add(this.center).add(hexPoint))
        for (let a = 0; a < SIX; a++) {
            const b = (a + 1) % SIX
            if (direction === a || direction === b || (corner && direction === (b + 1) % SIX)) {
                vertex(HEXAGON_POINTS[a])
                vertex(HEXAGON_POINTS[b])
            }
        }
    }

    public isCandidateHexalot(vacantHexalot?: Hexalot): boolean {
        if (this.surface !== Surface.Land) {
            return false
        }
        const centerOfHexalot = this.centerOfHexalot
        if (centerOfHexalot) {
            if (!vacantHexalot) {
                return false
            }
            return centerOfHexalot.id === vacantHexalot.id
        }
        if (vacantHexalot) {
            return this.adjacentHexalots.some(hexalot => hexalot.id !== vacantHexalot.id)
        }
        return this.adjacentHexalots.length > 0
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
                return LAND_NORMAL_SPREAD
            case Surface.Water:
                return WATER_NORMAL_SPREAD
            default:
                return 0
        }
    }
}
