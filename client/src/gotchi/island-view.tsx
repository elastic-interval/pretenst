/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import { useRender, useThree, useUpdate } from "react-three-fiber"
import { Geometry, PerspectiveCamera, Vector3 } from "three"

import { FORWARD, RIGHT } from "../fabric/fabric-instance"
import { DIRECTION_LINE, FACE, JOURNEY_LINE, LEAF, LINE_VERTEX_COLORS } from "../view/materials"
import { Orbit } from "../view/orbit"

import { Evolution } from "./evolution"
import { Direction, Gotchi } from "./gotchi"
import { Island, PatchCharacter } from "./island"
import {
    ALTITUDE,
    FAUNA_PATCH_COLOR,
    FLORA_PATCH_COLOR,
    HEMISPHERE_COLOR,
    SPACE_RADIUS,
    SPACE_SCALE,
    SUN_POSITION,
} from "./island-geometry"
import { SatoshiTree } from "./satoshi-tree"

const TOWARDS_POSITION = 0.003
const TOWARDS_TARGET = 0.01

export function IslandView({island, satoshiTrees, gotchi, evolution, stopEvolution}: {
    island: Island,
    satoshiTrees: SatoshiTree[],
    gotchi?: Gotchi,
    evolution?: Evolution,
    stopEvolution: () => void,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const [trigger, setTrigger] = useState(0)

    const midpoint = new Vector3()
    useRender(() => {
        let bestDistance
        if (evolution) {
            if (evolution.finished) {
                stopEvolution()
                return
            }
            evolution.iterate()
            evolution.getMidpoint(midpoint)
            bestDistance = 16
        } else if (gotchi) {
            gotchi.iterate(midpoint)
            if (gotchi.growing || gotchi.direction !== Direction.Rest) {
                bestDistance = 8
            }
        }
        const orb: Orbit = orbit.current
        const target = orb.target
        if (bestDistance !== undefined) {
            const position = orb.object.position
            const positionToTarget = new Vector3().subVectors(position, target)
            const deltaDistance = bestDistance - positionToTarget.length()
            position.add(positionToTarget.normalize().multiplyScalar(deltaDistance * TOWARDS_POSITION))
        }
        const moveTarget = new Vector3().subVectors(midpoint, target).multiplyScalar(TOWARDS_TARGET)
        target.add(moveTarget)
        orb.update()
        const treeNumber = Math.floor(Math.random() * satoshiTrees.length)
        satoshiTrees[treeNumber].iterate()
        setTrigger(trigger + 1)
    }, true, [gotchi, evolution, trigger])

    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    const orbit = useUpdate<Orbit>(orb => {
        perspective.position.set(midpoint.x, ALTITUDE, midpoint.z + 2)
        perspective.lookAt(orbit.current.target)
        perspective.fov = 60
        perspective.far = SPACE_RADIUS * 2
        perspective.near = 0.001
        orb.object = perspective
        orb.minPolarAngle = -0.98 * Math.PI / 2
        orb.maxPolarAngle = 0.8 * Math.PI
        orb.maxDistance = SPACE_RADIUS * SPACE_SCALE * 0.9
        orb.zoomSpeed = 0.5
        orb.enableZoom = true
        orb.target.set(midpoint.x, midpoint.y, midpoint.z)
        orb.update()
    }, [])

    useEffect(() => {
        orbit.current.autoRotate = !!(evolution)
    }, [evolution])

    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                {evolution ? <EvolutionScene evolution={evolution}/> : (gotchi ? (
                    <GotchiComponent gotchi={gotchi}/>) : undefined)}
                {island.patches.map(patch => {
                    const position = patch.positionArray
                    const normal = patch.normalArray
                    return (
                        <mesh key={`patch-${patch.name}`} onClick={patch.onClick}>
                            <meshPhongMaterial
                                attach="material"
                                color={patch.patchCharacter === PatchCharacter.FaunaPatch ? FAUNA_PATCH_COLOR : FLORA_PATCH_COLOR}/>
                            <bufferGeometry attach="geometry">
                                <bufferAttribute
                                    attachObject={["attributes", "position"]}
                                    array={position}
                                    count={position.length / 3}
                                    itemSize={3}
                                />
                                <bufferAttribute
                                    attachObject={["attributes", "normal"]}
                                    array={normal}
                                    count={normal.length / 3}
                                    itemSize={3}
                                />
                            </bufferGeometry>
                        </mesh>
                    )
                })}
                {satoshiTrees.map(satoshiTree => (
                    <SatoshiTreeComponent key={`tree-${satoshiTree.name}`} satoshiTree={satoshiTree}/>
                ))}
                <pointLight distance={1000} decay={0.1} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
            </scene>
        </group>
    )
}

function directionGeometry(): Geometry {
    const v = () => new Vector3(0, 0, 0)
    const ARROW_LENGTH = 5
    const ARROW_WIDTH = 0.15
    const ARROW_TIP_LENGTH_FACTOR = 1.3
    const ARROW_TIP_WIDTH_FACTOR = 1.5
    const origin = v()
    const arrowToLx = v().addScaledVector(RIGHT, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowToL = v().addScaledVector(RIGHT, -ARROW_WIDTH).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowToR = v().addScaledVector(RIGHT, ARROW_WIDTH).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowToRx = v().addScaledVector(RIGHT, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowTip = v().addScaledVector(FORWARD, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
    const geometry = new Geometry()
    geometry.vertices = [
        origin, arrowToL, origin, arrowToR,
        arrowToRx, arrowTip, arrowToLx, arrowTip,
        arrowToRx, arrowToR, arrowToLx, arrowToL,
    ]
    geometry.computeBoundingBox()
    return geometry
}

const DIRECTION_GEOMETRY = directionGeometry()

function EvolutionScene({evolution}: { evolution: Evolution }): JSX.Element {
    const midpoint = new Vector3()
    return (
        <group>
            {evolution.evolvers.map(({gotchi, index}) => (
                <GotchiComponent key={`evolving-gotchi-${index}`} gotchi={gotchi}/>
            ))}
            <lineSegments
                geometry={evolutionTargetGeometry(evolution.getMidpoint(midpoint), evolution.target)}
                material={JOURNEY_LINE}
            />
        </group>
    )
}

function GotchiComponent({gotchi}: { gotchi: Gotchi }): JSX.Element {
    const floatView = gotchi.state.instance.floatView
    const update = useCallback(self => {
        self.needsUpdate = true
        self.parent.computeBoundingSphere()
    }, [])
    return (
        <group>
            <lineSegments material={LINE_VERTEX_COLORS}>
                <bufferGeometry attach="geometry">
                    <bufferAttribute
                        attachObject={["attributes", "position"]}
                        array={floatView.lineLocations}
                        count={floatView.lineLocations.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                    <bufferAttribute
                        attachObject={["attributes", "color"]}
                        array={floatView.lineColors}
                        count={floatView.lineColors.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
            </lineSegments>
            <mesh material={FACE}>
                <bufferGeometry attach="geometry">
                    <bufferAttribute
                        attachObject={["attributes", "position"]}
                        array={floatView.faceLocations}
                        count={floatView.faceLocations.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                    <bufferAttribute
                        attachObject={["attributes", "normal"]}
                        array={floatView.faceNormals}
                        count={floatView.faceNormals.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
            </mesh>
            {!gotchi.showDirection ? undefined : (
                <group>
                    <lineSegments
                        geometry={gotchiToTargetGeometry(gotchi.topJointLocation, gotchi.target)}
                        material={JOURNEY_LINE}
                    />
                    <lineSegments
                        geometry={DIRECTION_GEOMETRY}
                        material={DIRECTION_LINE}
                        quaternion={gotchi.directionQuaternion}
                        position={gotchi.topJointLocation}
                    />
                </group>
            )}
        </group>
    )
}

function gotchiToTargetGeometry(gotchiLocation: Vector3, target: Vector3): Geometry {
    const geom = new Geometry()
    geom.vertices = [gotchiLocation, new Vector3(target.x, gotchiLocation.y, target.z)]
    return geom
}

function evolutionTargetGeometry(evoMidpoint: Vector3, target: Vector3): Geometry {
    const geom = new Geometry()
    const height = 10
    geom.vertices = [
        new Vector3(evoMidpoint.x, 0, evoMidpoint.z), new Vector3(evoMidpoint.x, height, evoMidpoint.z),
        new Vector3(evoMidpoint.x, height / 2, evoMidpoint.z), new Vector3(target.x, height / 2, target.z),
    ]
    return geom
}

function SatoshiTreeComponent({satoshiTree}: { satoshiTree: SatoshiTree }): JSX.Element {
    const floatView = satoshiTree.instance.floatView
    const update = useCallback(self => {
        self.needsUpdate = true
        self.parent.computeBoundingSphere()
    }, [])
    return (
        <mesh material={LEAF}>
            <bufferGeometry attach="geometry">
                <bufferAttribute
                    attachObject={["attributes", "position"]}
                    array={floatView.faceLocations}
                    count={floatView.faceLocations.length / 3}
                    itemSize={3}
                    onUpdate={update}
                />
                <bufferAttribute
                    attachObject={["attributes", "normal"]}
                    array={floatView.faceNormals}
                    count={floatView.faceNormals.length / 3}
                    itemSize={3}
                    onUpdate={update}
                />
            </bufferGeometry>
        </mesh>
    )
}
