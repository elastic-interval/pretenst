/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { useFrame, useThree, useUpdate } from "react-three-fiber"
import { DoubleSide, Geometry, PerspectiveCamera, Vector3 } from "three"

import { FORWARD, RIGHT } from "../fabric/fabric-instance"
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

    const {camera} = useThree()
    const viewContainer = document.getElementById("view-container") as HTMLElement
    const [whyThis, updateWhyThis] = useState(0)
    const midpoint = new Vector3()
    useFrame(() => {
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
            const mature = gotchi.iterate(midpoint)
            if (!mature) {
                updateWhyThis(whyThis + 1)
            }
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
        if (!satoshiTrees[treeNumber].iterate()) {
            updateWhyThis(whyThis + 1)
        }
    })

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
                    <GotchiComponent gotchi={gotchi} faces={true}/>) : undefined)}
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
                <GotchiComponent key={`evolving-gotchi-${index}`} gotchi={gotchi} faces={false}/>
            ))}
            <lineSegments
                geometry={evolutionTargetGeometry(evolution.getMidpoint(midpoint), evolution.target)}
            >
                <lineBasicMaterial attach="material" color={"#cace02"}/>
            </lineSegments>
        </group>
    )
}

function GotchiComponent({gotchi, faces}: { gotchi: Gotchi, faces: boolean }): JSX.Element {
    const floatView = gotchi.state.instance.floatView
    return (
        <group>
            <lineSegments geometry={floatView.lineGeometry}>
                <lineBasicMaterial attach="material" vertexColors={true}/>
            </lineSegments>
            {!faces ? undefined : (
                <mesh geometry={floatView.faceGeometry}>
                    <meshPhongMaterial
                        attach="material"
                        transparent={true}
                        side={DoubleSide}
                        opacity={0.6}
                        color="white"/>
                </mesh>
            )}
            {!gotchi.showDirection ? undefined : (
                <group>
                    <lineSegments geometry={gotchiToTargetGeometry(gotchi.topJointLocation, gotchi.target)}>
                        <lineBasicMaterial attach="material" color={"#cecb05"}/>
                    </lineSegments>
                    <lineSegments
                        geometry={DIRECTION_GEOMETRY}
                        quaternion={gotchi.directionQuaternion}
                        position={gotchi.topJointLocation}
                    >
                        <lineBasicMaterial attach="material" color={"#05cec0"}/>
                    </lineSegments>
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
    const height = 6
    geom.vertices = [
        new Vector3(evoMidpoint.x, 0, evoMidpoint.z), new Vector3(evoMidpoint.x, height, evoMidpoint.z),
        new Vector3(evoMidpoint.x, height, evoMidpoint.z), new Vector3(target.x, height, target.z),
    ]
    return geom
}

function SatoshiTreeComponent({satoshiTree}: { satoshiTree: SatoshiTree }): JSX.Element {
    const floatView = satoshiTree.instance.floatView
    return (
        <mesh geometry={floatView.faceGeometry}>
            <meshPhongMaterial attach="material" side={DoubleSide} color="green"/>
        </mesh>
    )
}
