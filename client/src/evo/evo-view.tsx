/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { PerspectiveCamera } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Stage, SurfaceCharacter } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaBaby, FaDna, FaRunning, FaSignOutAlt, FaYinYang } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState, useRecoilValue } from "recoil"
import { Vector3 } from "three"

import { GlobalMode, reloadGlobalMode, stageName } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { compileTenscript, TenscriptBuilder } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"

import { destinationAtom, homePatchSelector, islandAtom, RUNNER_CODE, showDetailsAtom } from "./evo-state"
import { emptyGenome, fromGeneData } from "./genome"
import { IslandView } from "./island-view"
import { Patch } from "./patch"
import { EvolutionPhase, EVO_PARAMETERS, IEvolutionSnapshot, Population } from "./population"
import { Runner } from "./runner"
import { Direction, IRunnerState } from "./runner-logic"
import { EvolutionInfo, StatsView } from "./stats-view"

export enum Happening {
    Developing,
    Resting,
    Running,
    Evolving,
}

export function EvoView({createBodyInstance}: { createBodyInstance: CreateInstance }): JSX.Element {
    const [island] = useRecoilState(islandAtom)
    const homePatch = useRecoilValue(homePatchSelector)
    const destination = useRecoilValue(destinationAtom)
    const [showStats, setShowStats] = useRecoilState(showDetailsAtom)
    // const [cyclePattern, setCyclePattern] = useState<number[]>(EVO_PARAMETERS.cycle)
    const [runner, setRunner] = useState(() => newRunner(homePatch))
    const [happening, setHappening] = useState(Happening.Developing)
    const [snapshots, setSnapshots] = useState<IEvolutionSnapshot[]>([])
    const [evolutionCountdown, setEvolutionCountdown] = useState(-1)
    const [population, setPopulation] = useState<Population | undefined>(undefined)
    const [phase, setPhase] = useState(EvolutionPhase.SurvivorsAdvance)
    const [stage, updateStage] = useState<Stage | undefined>(undefined)

    function newRunner(patch: Patch): Runner {
        const targetPatch = patch.adjacent[0]
        if (!targetPatch) {
            throw new Error("No adjacent")
        }
        const storedGenome = patch.storedGenes[0]
        const genome = storedGenome ? fromGeneData(storedGenome) : emptyGenome()
        const instance = createBodyInstance(RUNNER_CODE.featureValues)
        instance.world.set_surface_character(SurfaceCharacter.Sticky)
        const state: IRunnerState = {
            patch,
            targetPatch,
            instance,
            midpoint: new Vector3().copy(patch.center),
            genome,
            loopMuscles: [],
            direction: Direction.ToA,
            directionHistory: [],
            autopilot: false,
            timeSlice: 10,
            twitchesPerCycle: 10,
        }
        const tree = compileTenscript(RUNNER_CODE, (err) => {
            throw new Error("unable to compile runner: " + err)
        })
        if (!tree) {
            throw new Error("no tree")
        }
        const builder = new TenscriptBuilder(patch.center, RUNNER_CODE, tree)
        const embryo = new Tensegrity(instance, 1000, builder)
        return new Runner(state, embryo)
    }

    // function newFlora(patch: Patch, instance: FabricInstance): Flora {
    //     const tree = compileTenscript(FLORA_CODE, (err) => {
    //         throw new Error("unable to compile sat tree: " + err)
    //     })
    //     if (!tree) {
    //         throw new Error("no tree")
    //     }
    //     const tensegrity = new Tensegrity(patch.center, percentOrHundred(), instance, 1000, FLORA_CODE, tree)
    //     return new Flora(patch.name, tensegrity)
    // }

    useEffect(() => {
        if (runner) {
            const adjacent = runner.state.patch.adjacent[destination]
            if (adjacent) {
                runner.state.targetPatch = adjacent
            }
        }
    }, [destination])

    useEffect(() => {
        if (!runner || !runner.embryo) {
            updateStage(undefined)
            return
        }
        const sub = runner.embryo.stage$.subscribe((newStage: Stage) => {
            if (newStage === Stage.Pretenst) {
                setHappening(Happening.Resting)
            }
            updateStage(newStage)
        })
        return () => sub.unsubscribe()
    }, [runner])

    useEffect(() => {
        if (!population) {
            return
        }
        const sub = population.snapshotsSubject.subscribe(setSnapshots)
        return () => sub.unsubscribe()
    }, [population])

    const evolveWithPattern = (toEvolve: Runner, pattern: number[]) => {
        if (population) {
            setPopulation(population.withReducedCyclePattern)
            // todo: free up current evolution?
        } else {
            setPopulation(new Population(toEvolve, createBodyInstance, false, pattern))
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
        setPopulation(nextEvolution)
        if (!nextEvolution) {
            setRunner(newRunner(homePatch))
            setHappening(Happening.Developing)
        }
    }

    const RecoilBridge = useRecoilBridgeAcrossReactRoots_UNSTABLE()
    return (
        <div style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "100%",
        }}>
            <Canvas key={island.name} style={{backgroundColor: "black"}}>
                <RecoilBridge>
                    <PerspectiveCamera makeDefault={true}/>
                    <IslandView
                        island={island}
                        happening={happening}
                        runner={runner}
                        population={population}
                        evolutionPhase={evolutionPhase => {
                            if (evolutionPhase !== phase) {
                                setPhase(evolutionPhase)
                            }
                        }}
                        countdownToEvo={countdownToEvolution}
                        stopEvo={stopEvolution}
                    />
                </RecoilBridge>
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
                    evoCountdown={evolutionCountdown}
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
                        setRunner(newRunner(homePatch))
                        setHappening(Happening.Developing)
                    }}
                    toRest={() => {
                        setHappening(Happening.Resting)
                        runner.direction = Direction.Rest
                    }}
                />
            )}
            {!population ? undefined : (
                <>
                    <div id="top-middle">
                        {showStats ? undefined : (
                            <Button color="info" onClick={() => setShowStats(true)}>
                                Phase: {phase}<br/>
                                {snapshots.length === 0 ? undefined :
                                    <EvolutionInfo snapshot={snapshots[snapshots.length - 1]}/>
                                }
                            </Button>
                        )}
                    </div>
                    {!showStats ? undefined : (
                        <EvolutionStatsView happening={happening} snapshots={snapshots}/>
                    )}
                </>
            )}
            <div id="bottom-right">
                <ButtonGroup vertical={false} className="w-100">
                    <Button color="warning" onClick={() => reloadGlobalMode(GlobalMode.Choice)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
        </div>
    )
}

function ControlButtons({
                            runner,
                            happening,
                            evoCountdown,
                            toRunning,
                            toRest,
                            toEvolving,
                            toRebirth,
                        }: {
    runner?: Runner,
    happening: Happening,
    evoCountdown: number,
    toRunning: () => void,
    toEvolving: () => void,
    toRebirth: () => void,
    toRest: () => void,
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
                            <FaDna/> {evoCountdown >= 0 ? evoCountdown : ""}
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

function EvolutionStatsView({happening, snapshots}: {
    happening: Happening,
    snapshots: IEvolutionSnapshot[],
}): JSX.Element {
    switch (happening) {
        case Happening.Developing:
        case Happening.Running:
        case Happening.Resting:
            return <div/>
        case Happening.Evolving:
            return (
                <div id="evolution-stats">
                    {snapshots.length > 0 ? (
                        <StatsView snapshots={snapshots}/>
                    ) : (
                        <h2 className="p-2">First round, please wait</h2>
                    )}
                </div>
            )
    }
}
