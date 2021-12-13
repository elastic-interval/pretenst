/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls, Sky } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as React from "react"
import { useEffect, useState } from "react"
import { useRecoilState } from "recoil"
import { DoubleSide, Vector3 } from "three"

import { destinationAtom } from "./evo-state"
import { Happening } from "./evo-view"
import { Island, PatchCharacter } from "./island"
import { FAUNA_PATCH_COLOR, FLORA_PATCH_COLOR, SIX, SUN_POSITION } from "./island-geometry"
import { Patch } from "./patch"
import { EvolutionPhase, Population } from "./population"
import { PopulationView } from "./population-view"
import { Runner } from "./runner"
import { Direction } from "./runner-logic"
import { RunnerView } from "./runner-view"

const TOWARDS_POSITION = 0.003
const TOWARDS_TARGET = 0.05
const TARGET_HEIGHT = 3
const TOWARDS_HEIGHT = 0.01
const SECONDS_UNTIL_EVOLUTION = 5

export function IslandView({island, happening, runner, population, evolutionPhase, countdownToEvo, stopEvo}: {
    island: Island,
    happening: Happening,
    runner?: Runner,
    population?: Population,
    evolutionPhase: (phase: EvolutionPhase) => void,
    countdownToEvo: (countdown: number) => void,
    stopEvo: (nextEvolution?: Population) => void,
}): JSX.Element {
    const [rotating, setRotating] = useState(false)
    const [destination, setDestination] = useRecoilState(destinationAtom)
    const [happeningChanged, updateHappeningChanged] = useState(Date.now())
    const [now, updateNow] = useState(Date.now())
    const [target, updateTarget] = useState(new Vector3(0, 1, 0))
    const [position, updatePosition] = useState(new Vector3(0, 1, 10))

    function adjustTarget(midpoint: Vector3): void {
        updateTarget(new Vector3().subVectors(midpoint, target).multiplyScalar(TOWARDS_TARGET).add(target))
    }

    useFrame(() => {
        const approachDistance = (distance: number) => {
            const positionToTarget = new Vector3().subVectors(position, target)
            const deltaDistance = distance - positionToTarget.length()
            positionToTarget.normalize()
            position.y += (TARGET_HEIGHT - position.y) * TOWARDS_HEIGHT
            updatePosition(position.add(positionToTarget.multiplyScalar(deltaDistance * TOWARDS_POSITION)))
        }
        switch (happening) {
            case Happening.Developing:
                if (runner) {
                    runner.iterate()
                    adjustTarget(runner.state.midpoint)
                    approachDistance(6)
                }
                break
            case Happening.Resting:
                if (runner) {
                    runner.iterate()
                    adjustTarget(runner.state.midpoint)
                    approachDistance(8)
                }
                break
            case Happening.Running:
                if (runner) {
                    runner.iterate()
                    adjustTarget(runner.state.midpoint)
                    approachDistance(6)
                }
                break
            case Happening.Evolving:
                if (population) {
                    switch (population.iterate()) {
                        case EvolutionPhase.EvolutionDone:
                            console.log("Evolution DONE")
                            stopEvo()
                            break
                        case EvolutionPhase.EvolutionHarder:
                            console.log("Evolution advance...")
                            stopEvo(population.withReducedCyclePattern)
                            break
                    }
                    adjustTarget(population.midpoint)
                    approachDistance(15)
                    evolutionPhase(population.phase)
                }
                break
        }
        const wasSeconds = Math.floor((now - happeningChanged) / 1000)
        const time = Date.now()
        updateNow(time)
        const isSeconds = Math.floor((time - happeningChanged) / 1000)
        if (happening === Happening.Resting && wasSeconds < isSeconds) {
            countdownToEvo(SECONDS_UNTIL_EVOLUTION - isSeconds)
        }
    })

    useEffect(() => {
        updateHappeningChanged(Date.now())
        updateNow(Date.now())
        setRotating(happening === Happening.Evolving)
    }, [happening])

    function clickPatch(patch: Patch): void {
        if (patch.flora) {
            patch.flora.removeRandomInterval()
            console.log("remove", patch.name)
        } else if (runner && runner.direction === Direction.Rest) {
            setDestination((destination + 1) % SIX)
        }
    }

    return (
        <group>
            <OrbitControls target={target} autoRotate={rotating}
                           enablePan={false} position={position}
                           autoRotateSpeed={0.6}
                           enableDamping={false} minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.8}
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
                        <mesh key={`patch-${patch.name}`} onClick={() => clickPatch(patch)}>
                            <meshPhongMaterial
                                attach="material"
                                side={DoubleSide}
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
                <Sky
                    distance={1000000}
                    rayleigh={3}
                    inclination={0.505}
                    mieCoefficient={0.001}
                    mieDirectionalG={0.93}
                    turbidity={7.5}
                />
                <pointLight distance={1000} decay={0.1} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi"/>
            </scene>
        </group>
    )
}


