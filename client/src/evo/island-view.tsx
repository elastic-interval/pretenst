/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls } from "@react-three/drei"
import * as React from "react"
import { useEffect, useState } from "react"
import { useFrame } from "react-three-fiber"

import { Happening } from "./evo-view"
import { Island, PatchCharacter } from "./island"
import { FAUNA_PATCH_COLOR, FLORA_PATCH_COLOR, HEMISPHERE_COLOR, SUN_POSITION } from "./island-geometry"
import { EvolutionPhase, Population } from "./population"
import { PopulationView } from "./population-view"
import { Runner } from "./runner"
import { RunnerView } from "./runner-view"

// const TOWARDS_POSITION = 0.003
// const TOWARDS_TARGET = 0.01
// const TARGET_HEIGHT = 3
// const TOWARDS_HEIGHT = 0.01
const SECONDS_UNTIL_EVOLUTION = 20

export function IslandView({island, happening, runner, population, evolutionPhase, countdownToEvolution, stopEvolution}: {
    island: Island,
    happening: Happening,
    runner?: Runner,
    population?: Population,
    evolutionPhase: (phase: EvolutionPhase) => void,
    countdownToEvolution: (countdown: number) => void,
    stopEvolution: (nextEvolution?: Population) => void,
}): JSX.Element {
    const [happeningChanged, updateHappeningChanged] = useState(Date.now())
    const [now, updateNow] = useState(Date.now())
    // const midpoint = new Vector3()

    // function developing(g: Runner): number {
    //     g.iterate(midpoint)
    //     return 6
    // }
    //
    // function resting(g: Runner): number {
    //     g.iterate(midpoint)
    //     return 10
    // }
    //
    // function running(g: Runner): number {
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
        //         if (runner) {
        //             approachDistance(developing(runner))
        //         }
        //         break
        //     case Happening.Resting:
        //         if (runner) {
        //             approachDistance(resting(runner))
        //         }
        //         break
        //     case Happening.Running:
        //         if (runner) {
        //             approachDistance(running(runner))
        //         }
        //         break
        //     case Happening.Evolving:
        //         if (evolution) {
        //             approachDistance(evolving(evolution))
        //             evolutionPhase(evolution.phase)
        //         }
        //         break
        // }
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
            {/*todo: chase the runner*/}
            <scene>
                {(population && happening === Happening.Evolving) ? (
                    <PopulationView population={population}/>
                ) : (runner ? (
                    <RunnerView runner={runner}/>
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
                <pointLight distance={1000} decay={0.1} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
            </scene>
        </group>
    )
}


