/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo } from "react"
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshPhongMaterial, Vector3 } from "three"

const SURFACE = new MeshPhongMaterial({
    color: new Color("#101010"),
    side: DoubleSide,
    transparent: true,
    opacity: 0.5,
})
export const KINDA = 0.866
export const SURFACE_SCALE = 20
export const HEXAGON_POINTS = [
    new Vector3(0, 0, -SURFACE_SCALE),
    new Vector3(-KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
    new Vector3(-KINDA * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(0, 0, SURFACE_SCALE),
    new Vector3(KINDA * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
    new Vector3(),
]
export const SURFACE_LAND_COLOR = new Color("tan")
export const SIX = 6
export const UP = new Vector3(0, 1, 0)
export const LAND_NORMAL_SPREAD = 0.01

export function SurfaceComponent(): JSX.Element {
    const geometry = useMemo(() => patchesGeometry(), [])
    return <mesh name="Patches" geometry={geometry} material={SURFACE}/>
}

function patchesGeometry(): BufferGeometry {
    const geometry = new BufferGeometry()
    const positionF32 = new Float32Array(HEXAGON_POINTS.length * 3)
    HEXAGON_POINTS.forEach((point, index) => {
        const faceOffset = index * 3
        positionF32[faceOffset] = point.x
        positionF32[faceOffset + 1] = point.y - 0.01
        positionF32[faceOffset + 2] = point.z
    })
    const normalF32 = new Float32Array(SIX * 3 * 3)
    const colorF32 = new Float32Array(SIX * 3 * 3)
    const indexU16 = new Uint16Array(SIX * 3)
    for (let a = 0; a < SIX; a++) {
        const b = (a + 1) % SIX
        const vertexNormals = [
            UP,
            new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], LAND_NORMAL_SPREAD).normalize(),
            new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], LAND_NORMAL_SPREAD).normalize(),
        ]
        const faceOffset = a * 3
        vertexNormals.forEach((normal, normalIndex) => {
            const normalOffset = faceOffset + normalIndex * 3
            normalF32[normalOffset] = normal.x
            normalF32[normalOffset + 1] = normal.y
            normalF32[normalOffset + 2] = normal.z
        })
        indexU16[faceOffset] = SIX
        indexU16[faceOffset+1] = a
        indexU16[faceOffset+2] = b
    }
    geometry.setAttribute("position", new BufferAttribute(positionF32, 3))
    geometry.setAttribute("normal", new BufferAttribute(normalF32, 3))
    geometry.setAttribute("color", new BufferAttribute(colorF32, 3))
    return geometry
}
