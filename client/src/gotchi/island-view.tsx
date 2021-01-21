/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls } from "@react-three/drei"
import * as React from "react"
import { useEffect, useState } from "react"
import { useFrame } from "react-three-fiber"
import { DoubleSide, Vector3 } from "three"

import { Evolution, EvolutionPhase } from "./evolution"
import { Gotchi } from "./gotchi"
import { Happening } from "./gotchi-view"
import { Island, PatchCharacter } from "./island"
import {
    ARROW_GEOMETRY,
    FAUNA_PATCH_COLOR,
    FLORA_PATCH_COLOR,
    HEMISPHERE_COLOR,
    SUN_POSITION,
} from "./island-geometry"
import { SatoshiTree } from "./satoshi-tree"

// const TOWARDS_POSITION = 0.003
// const TOWARDS_TARGET = 0.01
// const TARGET_HEIGHT = 3
// const TOWARDS_HEIGHT = 0.01
const SECONDS_UNTIL_EVOLUTION = 20

export function IslandView({island, satoshiTrees, happening, gotchi, evolution, evolutionPhase, countdownToEvolution, stopEvolution}: {
    island: Island,
    satoshiTrees: SatoshiTree[],
    happening: Happening,
    gotchi?: Gotchi,
    evolution?: Evolution,
    evolutionPhase: (phase: EvolutionPhase) => void,
    countdownToEvolution: (countdown: number) => void,
    stopEvolution: (nextEvolution?: Evolution) => void,
}): JSX.Element {
    const [happeningChanged, updateHappeningChanged] = useState(Date.now())
    const [now, updateNow] = useState(Date.now())
    // const midpoint = new Vector3()

    // function developing(g: Gotchi): number {
    //     g.iterate(midpoint)
    //     return 6
    // }
    //
    // function resting(g: Gotchi): number {
    //     g.iterate(midpoint)
    //     return 10
    // }
    //
    // function running(g: Gotchi): number {
    //     g.iterate(midpoint)
    //     return 6
    // }
    //
    // function evolving(e: Evolution): number {
    //     switch (e.iterate()) {
    //         case EvolutionPhase.EvolutionDone:
    //             console.log("Evolution DONE")
    //             stopEvolution()
    //             break
    //         case EvolutionPhase.EvolutionHarder:
    //             console.log("Evolution advance...")
    //             stopEvolution(e.withReducedCyclePattern)
    //             break
    //     }
    //     e.getMidpoint(midpoint)
    //     return 15
    // }

    useFrame(() => {
        // const approachDistance = (distance: number) => {
        //     const position = control.object.position
        //     const positionToTarget = new Vector3().subVectors(position, control.target)
        //     const deltaDistance = distance - positionToTarget.length()
        //     positionToTarget.normalize()
        //     position.add(positionToTarget.multiplyScalar(deltaDistance * TOWARDS_POSITION))
        //     position.y += (TARGET_HEIGHT - position.y) * TOWARDS_HEIGHT
        // }
        // switch (happening) {
        //     case Happening.Developing:
        //         if (gotchi) {
        //             approachDistance(developing(gotchi))
        //         }
        //         break
        //     case Happening.Resting:
        //         if (gotchi) {
        //             approachDistance(resting(gotchi))
        //         }
        //         break
        //     case Happening.Running:
        //         if (gotchi) {
        //             approachDistance(running(gotchi))
        //         }
        //         break
        //     case Happening.Evolving:
        //         if (evolution) {
        //             approachDistance(evolving(evolution))
        //             evolutionPhase(evolution.phase)
        //         }
        //         break
        // }
        const treeNumber = Math.floor(Math.random() * satoshiTrees.length)
        satoshiTrees[treeNumber].iterate()
        const wasSeconds = Math.floor((now - happeningChanged) / 1000)
        const time = Date.now()
        updateNow(time)
        const isSeconds = Math.floor((time - happeningChanged) / 1000)
        if (happening === Happening.Resting && wasSeconds < isSeconds) {
            countdownToEvolution(SECONDS_UNTIL_EVOLUTION - isSeconds)
        }
    })

    useEffect(() => {
        updateHappeningChanged(Date.now())
        updateNow(Date.now())
    }, [happening])

    return (
        <group>
            <OrbitControls onPointerMissed={undefined}/>
            {/*todo: chase the gotchi*/}
            <scene>
                {(evolution && happening === Happening.Evolving) ? (
                    <EvolutionScene evolution={evolution}/>
                ) : (gotchi ? (
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
            {evolution.winners.map(({gotchi}, index) => (
                <GotchiComponent key={`evolving-${index}`} gotchi={gotchi} faces={false}/>
            ))}
            {!evolution.challengersVisible ? undefined : evolution.challengers.map(({gotchi}, index) => (
                <GotchiComponent key={`evolving-${index + evolution.winners.length}`} gotchi={gotchi} faces={false}/>
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
            <lineSegments geometry={floatView.lineGeometry} onUpdate={self => self.geometry.computeBoundingSphere()}>
                <lineBasicMaterial attach="material" vertexColors={true}/>
            </lineSegments>
            {!faces ? undefined : (
                <mesh geometry={floatView.faceGeometry} onUpdate={self => self.geometry.computeBoundingSphere()}>
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
