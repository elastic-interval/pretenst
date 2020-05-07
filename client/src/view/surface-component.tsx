/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo } from "react"
import { Color, Face3, Geometry, Vector3 } from "three"

import { SURFACE } from "./materials"

export const KINDA = 0.866
export const SURFACE_SCALE = 20
export const HEXAGON_POINTS = [
    new Vector3(0, 0, -SURFACE_SCALE),
    new Vector3(-KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
    new Vector3(-KINDA * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(0, 0, SURFACE_SCALE),
    new Vector3(KINDA * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
]
export const SURFACE_LAND_COLOR = new Color("tan")
export const SIX = 6
export const UP = new Vector3(0, 1, 0)
export const LAND_NORMAL_SPREAD = 0.03

export function SurfaceComponent(): JSX.Element {
    const geometry = useMemo(() => patchesGeometry(), [])
    return (
        <mesh name="Patches" geometry={geometry} material={SURFACE}/>
    )
}

function patchesGeometry(): Geometry {
    const geometry = new Geometry()
    addSurfaceGeometry(geometry.vertices, geometry.faces)
    geometry.vertices.forEach(v => v.sub(new Vector3(0, 0.01, 0)))
    return geometry
}

function addSurfaceGeometry(vertices: Vector3[], faces: Face3[]): void {
    vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3(hexPoint.x, hexPoint.y, hexPoint.z).multiplyScalar(4)))
    vertices.push(new Vector3())
    for (let a = 0; a < SIX; a++) {
        const b = (a + 1) % SIX
        const vertexNormals = [
            UP,
            new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], LAND_NORMAL_SPREAD).normalize(),
            new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], LAND_NORMAL_SPREAD).normalize(),
        ]
        faces.push(new Face3(SIX, a, b, vertexNormals, SURFACE_LAND_COLOR))
    }
}

