/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls } from "@react-three/drei"
import * as React from "react"
import { useEffect, useState } from "react"
import { useFrame } from "react-three-fiber"
import { Vector3 } from "three"

import { Happening } from "./evo-view"
import { Island, PatchCharacter } from "./island"
import { FAUNA_PATCH_COLOR, FLORA_PATCH_COLOR, HEMISPHERE_COLOR, SUN_POSITION } from "./island-geometry"
import { EvolutionPhase, Population } from "./population"
import { PopulationView } from "./population-view"
import { Runner } from "./runner"
import { RunnerView } from "./runner-view"

const TOWARDS_POSITION = 0.003
const TOWARDS_TARGET = 0.01
const TARGET_HEIGHT = 3
const TOWARDS_HEIGHT = 0.01
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
    const [target, updateTarget] = useState(new Vector3(0, 1, 0))
    const [position, updatePosition] = useState(new Vector3(0, 1, 10))

    useFrame(() => {
        const approachDistance = (distance: number) => {
            const positionToTarget = new Vector3().subVectors(position, target)
            const deltaDistance = distance - positionToTarget.length()
            positionToTarget.normalize()
            position.y += (TARGET_HEIGHT - position.y) * TOWARDS_HEIGHT
            updatePosition(position.add(positionToTarget.multiplyScalar(deltaDistance * TOWARDS_POSITION)))
        }
        const midpoint = new Vector3()
        switch (happening) {
            case Happening.Developing:
                if (runner) {
                    runner.iterate(midpoint)
                    approachDistance(6)
                }
                break
            case Happening.Resting:
                if (runner) {
                    runner.iterate(midpoint)
                    approachDistance(10)
                }
                break
            case Happening.Running:
                if (runner) {
                    runner.iterate(midpoint)
                    approachDistance(6)
                }
                break
            case Happening.Evolving:
                if (population) {
                    switch (population.iterate()) {
                        case EvolutionPhase.EvolutionDone:
                            console.log("Evolution DONE")
                            stopEvolution()
                            break
                        case EvolutionPhase.EvolutionHarder:
                            console.log("Evolution advance...")
                            stopEvolution(population.withReducedCyclePattern)
                            break
                    }
                    approachDistance(15)
                    evolutionPhase(population.phase)
                }
                break
        }
        updateTarget(new Vector3().subVectors(midpoint, target).multiplyScalar(TOWARDS_TARGET))
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
            <OrbitControls target={target} enableKeys={false} enablePan={false} position={position}
                           enableDamping={false} minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.8}
                           onPointerMissed={undefined}
            />
            <scene>
                {(population && happening === Happening.Evolving) ? (
                    <PopulationView population={population}/>
                ) : (runner ? (
                    <RunnerView runner={runner}/>
                ) : undefined)}
                {island.patches.map(patch => {
                    const array = patch.positionArray
                    const normal = patch.normalArray
                    return (
                        <mesh key={`patch-${patch.name}`} onClick={patch.onClick}>
                            <meshPhongMaterial
                                attach="material"
                                color={patch.patchCharacter === PatchCharacter.FaunaPatch ? FAUNA_PATCH_COLOR : FLORA_PATCH_COLOR}/>
                            <bufferGeometry attach="geometry">
                                <bufferAttribute
                                    attachObject={["attributes", "position"]}
                                    array={array}
                                    count={array.length / 3}
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


