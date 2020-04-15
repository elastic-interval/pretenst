/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { useFrame, useThree, useUpdate } from "react-three-fiber"
import { DoubleSide, PerspectiveCamera, Vector3 } from "three"

import { Orbit } from "../view/orbit"

import { Evolution } from "./evolution"
import { Direction, Gotchi } from "./gotchi"
import { Island, PatchCharacter } from "./island"
import {
    ALTITUDE,
    ARROW_GEOMETRY,
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
        updateWhyThis(whyThis + 1)
    })

    const perspective = camera as PerspectiveCamera
    const orbit = useUpdate<Orbit>(orb => {
        perspective.position.set(midpoint.x, ALTITUDE, midpoint.z + 2)
        perspective.lookAt(orbit.current.target)
        perspective.fov = 60
        perspective.far = SPACE_RADIUS * 2
        perspective.near = 0.001
        orb.object = perspective
        orb.minPolarAngle = 0
        orb.maxPolarAngle = Math.PI / 2
        orb.minDistance = 0.1
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
                    <GotchiComponent gotchi={gotchi} faces={true}/>
                ) : undefined)}
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

function EvolutionScene({evolution}: { evolution: Evolution }): JSX.Element {
    const height = 6
    const midpoint = new Vector3()
    evolution.getMidpoint(midpoint)
    const target = evolution.target
    return (
        <group>
            {evolution.evolvers.map(({gotchi, index}) => (
                <GotchiComponent key={`evolving-gotchi-${index}`} gotchi={gotchi} faces={false}/>
            ))}
            <lineSegments>
                <bufferGeometry attach="geometry">
                    <bufferAttribute
                        attachObject={["attributes", "position"]}
                        array={new Float32Array([
                            midpoint.x, 0, midpoint.z,
                            midpoint.x, height, midpoint.z,
                            midpoint.x, height, midpoint.z,
                            target.x, height, target.z,
                            target.x, height, target.z,
                            target.x, 0, target.z,
                        ])}
                        count={6}
                        itemSize={3}
                        onUpdate={self => self.needsUpdate = true}
                    />
                </bufferGeometry>
                <lineBasicMaterial attach="material" color={"#cace02"}/>
            </lineSegments>
        </group>
    )
}

function GotchiComponent({gotchi, faces}: {
    gotchi: Gotchi,
    faces: boolean,
}): JSX.Element {
    const {topJointLocation, target, state, showDirection} = gotchi
    const floatView = state.instance.floatView
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
            {!showDirection ? undefined : (
                <group>
                    <lineSegments>
                        <bufferGeometry attach="geometry">
                            <bufferAttribute
                                attachObject={["attributes", "position"]}
                                array={new Float32Array([
                                    topJointLocation.x, topJointLocation.y, topJointLocation.z,
                                    target.x, topJointLocation.y, target.z,
                                ])}
                                count={2}
                                itemSize={3}
                                onUpdate={self => self.needsUpdate = true}
                            />
                        </bufferGeometry>
                        <lineBasicMaterial attach="material" color={"#cecb05"}/>
                    </lineSegments>
                    <lineSegments
                        geometry={ARROW_GEOMETRY}
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

function SatoshiTreeComponent({satoshiTree}: { satoshiTree: SatoshiTree }): JSX.Element {
    const floatView = satoshiTree.instance.floatView
    return (
        <mesh geometry={floatView.faceGeometry}>
            <meshPhongMaterial attach="material" side={DoubleSide} color="green"/>
        </mesh>
    )
}
