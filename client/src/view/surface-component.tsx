/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo } from "react"
import { BufferAttribute, BufferGeometry, Color, FrontSide, MeshPhongMaterial, Vector3 } from "three"

const MATERIAL = new MeshPhongMaterial({
    color: new Color("#070707"),
    specular: new Color("#110404"),
    side: FrontSide,
})
const KINDA = 0.866
const SURFACE_SCALE = 20
const HEXAGON_POINTS = [
    new Vector3(0, 0, -SURFACE_SCALE),
    new Vector3(-KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
    new Vector3(-KINDA * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(0, 0, SURFACE_SCALE),
    new Vector3(KINDA * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
    new Vector3(),
]
const TRIANGLES = [
    6, 0, 1,
    6, 1, 2,
    6, 2, 3,
    6, 3, 4,
    6, 4, 5,
    6, 5, 0,
]
const TRIANGLE_POSITION = TRIANGLES.map(t => HEXAGON_POINTS[t])

export function SurfaceComponent(): JSX.Element {
    const geometry = useMemo(() => patchesGeometry(), [])
    return <mesh name="Patches" geometry={geometry} material={MATERIAL}/>
}

function patchesGeometry(): BufferGeometry {
    const geometry = new BufferGeometry()
    const positionF32 = new Float32Array(TRIANGLE_POSITION.length * 3)
    const normalF32 = new Float32Array(TRIANGLE_POSITION.length * 3)
    TRIANGLE_POSITION.forEach((position, index) => {
        const faceOffset = index * 3
        positionF32[faceOffset] = position.x
        positionF32[faceOffset + 1] = position.y - 0.01
        positionF32[faceOffset + 2] = position.z
        const normal = new Vector3(0,300,0).add(position).normalize()
        normalF32[faceOffset] = normal.x
        normalF32[faceOffset + 1] = normal.y
        normalF32[faceOffset + 2] = normal.z
    })
    geometry.setAttribute("position", new BufferAttribute(positionF32, 3))
    geometry.setAttribute("normal", new BufferAttribute(normalF32, 3))
    return geometry
}
