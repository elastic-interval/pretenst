/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */


import * as React from "react"
import { useMemo } from "react"
import { useThree } from "react-three-fiber"
import { BufferGeometry, Float32BufferAttribute, Geometry, PerspectiveCamera, Vector3 } from "three"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { LINE_VERTEX_COLORS, SCALE_LINE } from "./materials"

const SCALE_WIDTH = 0.01
const NEEDLE_WIDTH = 2
const SCALE_MAX = 0.45

export function VisualScale({fabric, target, maxStiffness}: {
    fabric: TensegrityFabric,
    target: Vector3
    maxStiffness: number,
}): JSX.Element {
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    const toTarget = new Vector3().subVectors(target, camera.position).normalize()
    const leftDistance = perspective.fov * perspective.aspect / 132
    const toDaLeft = new Vector3().crossVectors(camera.up, toTarget).normalize().multiplyScalar(leftDistance)
    const targetPull = 0.85
    const needlePosition = new Vector3().copy(camera.position).addScaledVector(toTarget, targetPull).add(toDaLeft)
    const scalePosition = new Vector3().copy(camera.position).addScaledVector(toTarget, targetPull + 0.001).add(toDaLeft)

    const scaleGeometry = useMemo(() => {
        const geometry = new Geometry()
        const v = (x: number, y: number) => new Vector3(x, y, 0)
        geometry.vertices = [
            v(0, -SCALE_MAX), v(0, SCALE_MAX),
            v(-SCALE_WIDTH, SCALE_MAX), v(SCALE_WIDTH, SCALE_MAX),
            v(-SCALE_WIDTH, 0), v(SCALE_WIDTH, 0),
            v(-SCALE_WIDTH, -SCALE_MAX), v(SCALE_WIDTH, -SCALE_MAX),
        ]
        return geometry
    }, [])

    function needleGeometry(): BufferGeometry {
        const instance = fabric.instance
        const position = new Float32Array(instance.engine.getIntervalCount() * 2 * 3)
        const stiffnesses = instance.stiffnesses
        let offset = 0
        fabric.intervals.forEach(interval => {
            const stiffness = stiffnesses[interval.index]
            const height = stiffness / maxStiffness * (interval.isPush ? SCALE_MAX : -SCALE_MAX)
            position[offset++] = -SCALE_WIDTH * NEEDLE_WIDTH
            position[offset++] = height
            position[offset++] = 0
            position[offset++] = SCALE_WIDTH * NEEDLE_WIDTH
            position[offset++] = height
            position[offset++] = 0
        })
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", new Float32BufferAttribute(position, 3))
        geometry.addAttribute("color", new Float32BufferAttribute(fabric.instance.lineColors, 3))
        return geometry
    }

    return (
        <group>
            <lineSegments geometry={needleGeometry()} material={LINE_VERTEX_COLORS}
                          position={needlePosition} rotation={camera.rotation}/>
            <lineSegments geometry={scaleGeometry} material={SCALE_LINE}
                          position={scalePosition} rotation={camera.rotation}/>
        </group>
    )
}

