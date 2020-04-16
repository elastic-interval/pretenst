/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaBaby, FaDna, FaHourglassHalf, FaRunning, FaYinYang } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"

import { stageName } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { Life } from "../fabric/life"

import { Evolution } from "./evolution"
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
    const [satoshiTrees] = useState(() => island.patches
        .filter(patch => patch.patchCharacter === PatchCharacter.FloraPatch)
        .map(patch => patch.createNewSatoshiTree(createInstance(true))))
    const [gotchi, setGotchi] = useState(() => homePatch.createGotchi(createInstance(false)))
    const [happening, setHappening] = useState(Happening.Developing)
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

    const onEvolve = (toEvolve: Gotchi) => {
        toEvolve.recycled(toEvolve.instance)
        setEvolution(new Evolution(createInstance, toEvolve))
    }
    const startEvolution = () => {
        setHappening(Happening.Evolving)
        if (gotchi) {
            onEvolve(gotchi)
        }
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
                        <FaBaby/> {stageName(life.stage)} <FaHourglassHalf/>
                    </div>
                )
            case Happening.Resting:
                return !gotchi ? undefined : (
                    <ButtonGroup style={{margin: undefined}}>
                        <Button color="success" onClick={() => {
                            setHappening(Happening.Running)
                            gotchi.autopilot = true
                        }}>
                            <FaRunning/> Run
                        </Button>
                        <Button color="success" onClick={() => {
                            setHappening(Happening.Evolving)
                            onEvolve(gotchi)
                        }}>
                            <FaDna/> Evolve
                        </Button>
                        <Button color="success" onClick={() => {
                            setGotchi(homePatch.createGotchi(createInstance(false)))
                            setHappening(Happening.Developing)
                        }}>
                            <FaBaby/> Reincarnate
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
                            setHappening(Happening.Resting)
                            gotchi.direction = Direction.Rest
                        }}>
                            <FaYinYang/> Rest
                        </Button>
                    </ButtonGroup>
                )
        }
    }
    const bottomRight = (): JSX.Element | undefined => {
        switch (happening) {
            case Happening.Developing:
            case Happening.Running:
                return undefined
            case Happening.Resting:
            case Happening.Evolving:
                return evolution ? <EvolutionView evolution={evolution} stopEvolution={stopEvolution}/> : undefined
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
            {!br ? undefined : <div id="bottom-right">{br}</div>}
        </div>
    )
}

