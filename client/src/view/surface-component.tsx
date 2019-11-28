/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo } from "react"
import { Face3, Geometry, Vector3 } from "three"

import { MeshKey } from "../gotchi-view/selector"
import { HEXAGON_POINTS, LAND_NORMAL_SPREAD, SIX, SURFACE_LAND_COLOR, UP } from "../island/constants"

import { SURFACE, SURFACE_GHOST } from "./materials"

export function SurfaceComponent({ghost}: { ghost: boolean }): JSX.Element {
    const spots = useMemo(() => spotsGeometry(), [])
    return (
        <mesh name="Spots" geometry={spots} material={ghost ? SURFACE_GHOST : SURFACE}/>
    )
}

function spotsGeometry(): Geometry {
    const geometry = new Geometry()
    addSurfaceGeometry(MeshKey.SPOTS_KEY, 0, geometry.vertices, geometry.faces)
    geometry.vertices.forEach(v => v.sub(new Vector3(0, 0.01, 0)))
    geometry.computeBoundingSphere()
    return geometry
}

function addSurfaceGeometry(meshKey: MeshKey, index: number, vertices: Vector3[], faces: Face3[]): void {
    vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3(hexPoint.x, hexPoint.y, hexPoint.z)))
    vertices.push(new Vector3())
    for (let a = 0; a < SIX; a++) {
        const offset = index * (HEXAGON_POINTS.length + 1)
        const b = (a + 1) % SIX
        const vertexNormals = [
            UP,
            new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], LAND_NORMAL_SPREAD).normalize(),
            new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], LAND_NORMAL_SPREAD).normalize(),
        ]
        faces.push(new Face3(offset + SIX, offset + a, offset + b, vertexNormals, SURFACE_LAND_COLOR))
    }
}

