/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { FaBaby, FaDna, FaEye, FaRunning, FaYinYang } from "react-icons/all"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { PerspectiveCamera } from "three"

import { stageName } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { Life } from "../fabric/life"

import { Evolution, IEvolutionSnapshot } from "./evolution"
import { EvolutionView } from "./evolution-view"
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
    const [cyclePattern, setCyclePattern] = useState<number[]>([5, 6, 7, 8, 9, 10])
    const [reachedTarget, setReachedTarget] = useState(false)
    const [satoshiTrees] = useState(() => island.patches
        .filter(patch => patch.patchCharacter === PatchCharacter.FloraPatch)
        .map(patch => patch.createNewSatoshiTree(createInstance(true))))
    const [gotchi, setGotchi] = useState(() => homePatch.createGotchi(createInstance(false)))
    const [happening, setHappening] = useState(Happening.Developing)
    const [evoDetails, setEvoDetails] = useState(true)
    const [snapshots, setSnapshots] = useState<IEvolutionSnapshot[]>([])
    const [evolution, setEvolution] = useState<Evolution | undefined>(undefined)
    const [life, updateLife] = useState<Life | undefined>(undefined)

    useEffect(() => {
        if (!gotchi || !gotchi.embryo) {
            updateLife(undefined)
            return
        }
        const sub = gotchi.embryo.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [gotchi])

    useEffect(() => {
        if (!evolution) {
            return
        }
        const sub = evolution.snapshotsSubject.subscribe(setSnapshots)
        return () => sub.unsubscribe()
    }, [evolution])

    useEffect(() => {
        if (!reachedTarget || !evolution) {
            return
        }
        setCyclePattern(() => {
            const reduced = [...cyclePattern]
            reduced.pop()
            return reduced
        })
        setReachedTarget(false)
    }, [reachedTarget, evolution, cyclePattern])

    const onEvolve = (toEvolve: Gotchi, pattern: number[]) => {
        toEvolve = toEvolve.recycled(toEvolve.instance)
        // todo: free the previous one?
        setEvolution(new Evolution(pattern, () => setReachedTarget(true), createInstance, toEvolve))
    }
    const startEvolution = () => {
        if (gotchi) {
            onEvolve(gotchi, cyclePattern)
        }
        setHappening(Happening.Evolving)
    }
    const stopEvolution = () => {
        setHappening(Happening.Resting)
    }
    const bottomMiddle = (): JSX.Element | undefined => {
        if (!life) {
            return undefined
        }
        switch (happening) {
            case Happening.Developing:
                if (life.stage === Stage.Pretenst) {
                    setHappening(Happening.Resting)
                }
                return (
                    <div className="py-2 px-3">
                        <FaBaby/> {stageName(life.stage)}
                    </div>
                )
            case Happening.Resting:
                return !gotchi ? undefined : (
                    <ButtonGroup style={{margin: undefined}}>
                        <Button color="success" onClick={() => {
                            setHappening(Happening.Running)
                            gotchi.autopilot = true
                        }}>
                            <FaRunning/>
                        </Button>
                        <Button color="success" onClick={startEvolution}>
                            <FaDna/>
                        </Button>
                        <Button color="success" onClick={() => {
                            setGotchi(homePatch.createGotchi(createInstance(false)))
                            setHappening(Happening.Developing)
                        }}>
                            <FaBaby/>
                        </Button>
                    </ButtonGroup>
                )
            case Happening.Running:
                return !gotchi ? undefined : (
                    <ButtonGroup>
                        <Button color="success" onClick={() => {
                            setHappening(Happening.Resting)
                            gotchi.direction = Direction.Rest
                        }}>
                            <FaYinYang/> Rest
                        </Button>
                    </ButtonGroup>
                )
            case Happening.Evolving:
                return !gotchi ? undefined : (
                    <ButtonGroup>
                        <Button color="success" onClick={() => {
                            setGotchi(homePatch.createGotchi(createInstance(false)))
                            setHappening(Happening.Developing)
                        }}>
                            <FaBaby/>
                        </Button>
                        <Button color="info" onClick={() => setEvoDetails(!evoDetails)}>
                            {evoDetails ? <FaEye/> : <FaDna/>}
                        </Button>
                    </ButtonGroup>
                )
        }
    }
    const bottomRight = (): JSX.Element | undefined => {
        switch (happening) {
            case Happening.Developing:
            case Happening.Running:
            case Happening.Resting:
                return undefined
            case Happening.Evolving:
                return !(evolution && snapshots.length > 0 && evoDetails) ? undefined :
                    <EvolutionView snapshots={snapshots}/>
        }
    }
    const bm = bottomMiddle()
    const br = bottomRight()
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
                    startEvolution={startEvolution}
                    stopEvolution={stopEvolution}
                />
            </Canvas>
            {!bm ? undefined : (
                <div id="bottom-middle" style={{
                    backgroundColor: "white",
                    borderRadius: "1em",
                    borderStyle: "solid",
                    borderWidth: "0.1em",
                }}>{bm}</div>
            )}
            {!br ? undefined : <div id="middle">{br}</div>}
        </div>
    )
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

