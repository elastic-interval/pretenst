/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, SurfaceCharacter } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { FaBaby, FaDna, FaEye, FaEyeSlash, FaRunning, FaSignOutAlt, FaYinYang } from "react-icons/all"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"
import { PerspectiveCamera } from "three"

import { GlobalMode, reloadGlobalMode, stageName } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"

import { homePatchAtom, islandAtom } from "./evo-state"
import { IslandView } from "./island-view"
import { EVO_PARAMETERS, EvolutionPhase, IEvolutionSnapshot, Population } from "./population"
import { Runner } from "./runner"
import { Direction } from "./runner-logic"
import { EvolutionInfo, StatsView } from "./stats-view"

export enum Happening {
    Developing,
    Resting,
    Running,
    Evolving,
}

export function EvoView({createBodyInstance}: {
    createBodyInstance: CreateInstance,
}): JSX.Element {
    const [island] = useRecoilState(islandAtom)
    const [homePatch] = useRecoilState(homePatchAtom)
    // const [cyclePattern, setCyclePattern] = useState<number[]>(EVO_PARAMETERS.cycle)
    const [runner, setRunner] = useState(() => homePatch.createRunner(createBodyInstance(SurfaceCharacter.Sticky)))
    const [happening, setHappening] = useState(Happening.Developing)
    const [evoDetails, setEvoDetails] = useState(true)
    const [snapshots, setSnapshots] = useState<IEvolutionSnapshot[]>([])
    const [evolutionCountdown, setEvolutionCountdown] = useState(-1)
    const [evolution, setEvolution] = useState<Population | undefined>(undefined)
    const [phase, setPhase] = useState(EvolutionPhase.WinnersRun)
    const [stage, updateStage] = useState<Stage | undefined>(undefined)

    useEffect(() => {
        if (!runner || !runner.embryo) {
            updateStage(undefined)
            return
        }
        setHappening(Happening.Developing)
        // const sub = runner.embryo.stage$.subscribe((latestStage) => {
        //     if (stage === Stage.Pretenst) {
        //         setHappening(Happening.Resting)
        //     }
        //     updateStage(latestStage)
        // })
        // return () => sub.unsubscribe()
    }, [runner])

    useEffect(() => {
        if (!evolution) {
            return
        }
        const sub = evolution.snapshotsSubject.subscribe(setSnapshots)
        return () => sub.unsubscribe()
    }, [evolution])

    const evolveWithPattern = (toEvolve: Runner, pattern: number[]) => {
        if (evolution) {
            setEvolution(evolution.withReducedCyclePattern)
            // todo: free up current evolution?
        } else {
            setEvolution(new Population(toEvolve, createBodyInstance, false, pattern))
        }
        setHappening(Happening.Evolving)
    }

    const countdownToEvolution = (countdown: number) => {
        setEvolutionCountdown(countdown)
        if (runner && countdown === 0) {
            evolveWithPattern(runner, EVO_PARAMETERS.cyclePattern)
        }
    }

    const stopEvolution = (nextEvolution: Population) => {
        // todo: free up current evolution?
        setEvolution(nextEvolution)
        if (!nextEvolution) {
            setRunner(homePatch.createRunner(createBodyInstance(SurfaceCharacter.Sticky)))
            setHappening(Happening.Developing)
        }
    }

    return (
        <div style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "100%",
        }}>
            <Canvas key={island.name} style={{backgroundColor: "black"}}>
                <Camera/>
                <IslandView
                    island={island}
                    happening={happening}
                    runner={runner}
                    population={evolution}
                    evolutionPhase={evolutionPhase => {
                        if (evolutionPhase !== phase) {
                            setPhase(evolutionPhase)
                        }
                    }}
                    countdownToEvolution={countdownToEvolution}
                    stopEvolution={stopEvolution}
                />
            </Canvas>
            {!runner ? <h1>no runner</h1> : (happening === Happening.Developing) ? (
                !stage ? <h1>nothing</h1> : (
                    <div id="bottom-middle">
                        <div className="py-2 px-3 text-center">
                            <FaBaby/> {stageName(stage)}
                        </div>
                    </div>
                )
            ) : (
                <ControlButtons
                    runner={runner}
                    happening={happening}
                    evolutionCountdown={evolutionCountdown}
                    evoDetails={evoDetails}
                    toRunning={() => {
                        setHappening(Happening.Running)
                        runner.autopilot = true
                    }}
                    toEvolving={() => {
                        setHappening(Happening.Evolving)
                        setEvolutionCountdown(-1)
                        evolveWithPattern(runner, EVO_PARAMETERS.cyclePattern)
                    }}
                    toRebirth={() => {
                        setRunner(homePatch.createRunner(createBodyInstance(SurfaceCharacter.Sticky)))
                        setHappening(Happening.Developing)
                    }}
                    toRest={() => {
                        setHappening(Happening.Resting)
                        runner.direction = Direction.Rest
                    }}
                    toggleEvoDetails={() => setEvoDetails(!evoDetails)}
                />
            )}
            {!evolution ? undefined : (
                <>
                    <div id="top-middle">
                        {snapshots.length <= 0 || evoDetails ? (
                            <strong className="p-2">{phase}</strong>
                        ) : (
                            <EvolutionInfo snapshot={snapshots[snapshots.length - 1]}/>
                        )}
                    </div>
                    <EvolutionStatsView
                        happening={happening}
                        evolution={evolution}
                        snapshots={snapshots}
                        evoDetails={evoDetails}
                    />
                </>
            )}
            <div id="bottom-right">
                <ButtonGroup vertical={false} className="w-100">
                    <Button onClick={() => reloadGlobalMode(GlobalMode.Design)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
        </div>
    )
}

function ControlButtons({
                            runner,
                            happening,
                            evoDetails,
                            evolutionCountdown,
                            toRunning,
                            toRest,
                            toEvolving,
                            toRebirth,
                            toggleEvoDetails,
                        }: {
    runner?: Runner,
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
                return !runner ? undefined : (
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
                return !runner ? undefined : (
                    <ButtonGroup className="w-100">
                        <Button color="success" onClick={toRest}>
                            <FaYinYang/> Rest
                        </Button>
                    </ButtonGroup>
                )
            case Happening.Evolving:
                return !runner ? undefined : (
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
    evolution: Population,
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
                    <StatsView snapshots={snapshots}/>
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
        camera.position.set(-4, 5, 10)
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

