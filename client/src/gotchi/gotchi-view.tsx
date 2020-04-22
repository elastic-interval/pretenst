/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { FaBaby, FaDna, FaEye, FaEyeSlash, FaRunning, FaYinYang } from "react-icons/all"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { PerspectiveCamera } from "three"

import { stageName } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { Life } from "../fabric/life"

import { EVO_PARAMETERS, Evolution, EvolutionPhase, IEvolutionSnapshot } from "./evolution"
import { EvolutionStats } from "./evolution-stats"
import { Direction, Gotchi } from "./gotchi"
import { Island, PatchCharacter } from "./island"
import { IslandView } from "./island-view"
import { Patch } from "./patch"

export enum Happening {
    Developing,
    Resting,
    Running,
    Evolving,
}

export function GotchiView({island, homePatch, createInstance}: {
    island: Island,
    homePatch: Patch,
    createInstance: CreateInstance,
}): JSX.Element {
    // const [cyclePattern, setCyclePattern] = useState<number[]>(EVO_PARAMETERS.cycle)
    const [satoshiTrees] = useState(() => island.patches
        .filter(patch => patch.patchCharacter === PatchCharacter.FloraPatch)
        .map(patch => patch.createNewSatoshiTree(createInstance(true))))
    const [gotchi, setGotchi] = useState(() => homePatch.createGotchi(createInstance(false)))
    const [happening, setHappening] = useState(Happening.Developing)
    const [evoDetails, setEvoDetails] = useState(true)
    const [snapshots, setSnapshots] = useState<IEvolutionSnapshot[]>([])
    const [evolutionCountdown, setEvolutionCountdown] = useState(-1)
    const [evolution, setEvolution] = useState<Evolution | undefined>(undefined)
    const [phase, setPhase] = useState(EvolutionPhase.WinnersRun)
    const [life, updateLife] = useState<Life | undefined>(undefined)

    useEffect(() => {
        if (!gotchi || !gotchi.embryo) {
            updateLife(undefined)
            return
        }
        setHappening(Happening.Developing)
        const sub = gotchi.embryo.life$.subscribe((latestLife) => {
            if (latestLife.stage === Stage.Pretenst) {
                setHappening(Happening.Resting)
            }
            updateLife(latestLife)
        })
        return () => sub.unsubscribe()
    }, [gotchi])

    useEffect(() => {
        if (!evolution) {
            return
        }
        const sub = evolution.snapshotsSubject.subscribe(setSnapshots)
        return () => sub.unsubscribe()
    }, [evolution])

    const evolveWithPattern = (toEvolve: Gotchi, pattern: number[]) => {
        if (evolution) {
            setEvolution(evolution.withReducedCyclePattern)
            // todo: free up current evolution?
        } else {
            setEvolution(new Evolution(toEvolve, createInstance, pattern))
        }
        setHappening(Happening.Evolving)
    }

    const countdownToEvolution = (countdown: number) => {
        setEvolutionCountdown(countdown)
        if (gotchi && countdown === 0) {
            evolveWithPattern(gotchi, EVO_PARAMETERS.cyclePattern)
        }
    }

    const stopEvolution = (nextEvolution: Evolution) => {
        // todo: free up current evolution?
        setEvolution(nextEvolution)
        if (!nextEvolution) {
            setGotchi(homePatch.createGotchi(createInstance(false)))
            setHappening(Happening.Developing)
        }
    }

    return (
        <div id="view-container" style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "100%",
        }}>
            <Canvas key={island.name} style={{backgroundColor: "black"}}>
                <Camera/>
                <IslandView
                    island={island}
                    satoshiTrees={satoshiTrees}
                    happening={happening}
                    gotchi={gotchi}
                    evolution={evolution}
                    evolutionPhase={evolutionPhase => {
                        if (evolutionPhase !== phase) {
                            setPhase(evolutionPhase)
                        }
                    }}
                    countdownToEvolution={countdownToEvolution}
                    stopEvolution={stopEvolution}
                />
            </Canvas>
            {!gotchi ? <h1>no gotchi</h1> : (happening === Happening.Developing) ? (
                !life ? <h1>no life</h1> : (
                    <div id="bottom-middle">
                        <div className="py-2 px-3 text-center">
                            <FaBaby/> {stageName(life.stage)}
                        </div>
                    </div>
                )
            ) : (
                <ControlButtons
                    gotchi={gotchi}
                    happening={happening}
                    evolutionCountdown={evolutionCountdown}
                    evoDetails={evoDetails}
                    toRunning={() => {
                        setHappening(Happening.Running)
                        gotchi.autopilot = true
                    }}
                    toEvolving={() => {
                        setHappening(Happening.Evolving)
                        setEvolutionCountdown(-1)
                        evolveWithPattern(gotchi, EVO_PARAMETERS.cyclePattern)
                    }}
                    toRebirth={() => {
                        setGotchi(homePatch.createGotchi(createInstance(false)))
                        setHappening(Happening.Developing)
                    }}
                    toRest={() => {
                        setHappening(Happening.Resting)
                        gotchi.direction = Direction.Rest
                    }}
                    toggleEvoDetails={() => setEvoDetails(!evoDetails)}
                />
            )}
            {!evolution ? undefined : (
                <>
                    <div id="evolution-phase">
                        <h6>{phase}</h6>
                    </div>
                    <EvolutionStatsView
                        happening={happening}
                        evolution={evolution}
                        snapshots={snapshots}
                        evoDetails={evoDetails}
                    />
                </>
            )}
        </div>
    )
}

function ControlButtons({gotchi, happening, evoDetails, evolutionCountdown, toRunning, toRest, toEvolving, toRebirth, toggleEvoDetails}: {
    gotchi?: Gotchi,
    happening: Happening,
    evolutionCountdown: number,
    evoDetails: boolean,
    toRunning: () => void,
    toEvolving: () => void,
    toRebirth: () => void,
    toRest: () => void,
    toggleEvoDetails: () => void,
}): JSX.Element {
    const createContent = () => {
        switch (happening) {
            case Happening.Developing:
                return <h1>developing</h1>
            case Happening.Resting:
                return !gotchi ? undefined : (
                    <ButtonGroup className="w-100">
                        <Button color="success" onClick={toRunning}>
                            <FaRunning/>
                        </Button>
                        <Button color="success" onClick={toEvolving}>
                            <FaDna/> {evolutionCountdown >= 0 ? evolutionCountdown : ""}
                        </Button>
                        <Button color="success" onClick={toRebirth}>
                            <FaBaby/>
                        </Button>
                    </ButtonGroup>
                )
            case Happening.Running:
                return !gotchi ? undefined : (
                    <ButtonGroup className="w-100">
                        <Button color="success" onClick={toRest}>
                            <FaYinYang/> Rest
                        </Button>
                    </ButtonGroup>
                )
            case Happening.Evolving:
                return !gotchi ? undefined : (
                    <ButtonGroup className="w-100">
                        <Button color="success" onClick={toRebirth}>
                            <FaBaby/>
                        </Button>
                        <Button color={evoDetails ? "success" : "secondary"} onClick={toggleEvoDetails}>
                            <FaDna/>&nbsp;{evoDetails ? <FaEye/> : <FaEyeSlash/>}
                        </Button>
                    </ButtonGroup>
                )
        }
    }
    const content = createContent()
    if (!content) {
        return <h1>{happening}</h1>
    }
    return (
        <div id="bottom-middle">{content}</div>
    )
}

function EvolutionStatsView({happening, evolution, snapshots, evoDetails}: {
    happening: Happening,
    evolution: Evolution,
    snapshots: IEvolutionSnapshot[],
    evoDetails: boolean,
}): JSX.Element {
    switch (happening) {
        case Happening.Developing:
        case Happening.Running:
        case Happening.Resting:
            return <div/>
        case Happening.Evolving:
            return !(evolution && snapshots.length > 0 && evoDetails) ? <div/> : (
                <div id="evolution-stats">
                    <EvolutionStats snapshots={snapshots}/>
                </div>
            )
    }
}

function Camera(props: object): JSX.Element {
    const ref = useRef<PerspectiveCamera>()
    const {setDefaultCamera} = useThree()
    // Make the camera known to the system
    useEffect(() => {
        const camera = ref.current
        if (!camera) {
            throw new Error("No camera")
        }
        camera.fov = 50
        camera.position.set(10, 10, 10)
        setDefaultCamera(camera)
    }, [])
    // Update it every frame
    useFrame(() => {
        const camera = ref.current
        if (!camera) {
            throw new Error("No camera")
        }
        camera.updateMatrixWorld()
    })
    return <perspectiveCamera ref={ref} {...props} />
}

