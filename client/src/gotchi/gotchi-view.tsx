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
import { Island } from "./island"
import { IslandView } from "./island-view"

export function GotchiView({island, createInstance}: {
    island: Island,
    createInstance: CreateInstance,
}): JSX.Element {

    const [gotchi, setGotchi] = useState(() => island.hexalots[0].createNewGotchi(createInstance()))
    const [gotchiActive, setGotchiActive] = useState(false)
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

    const stopEvolution = () => {
        setEvolution(undefined)
        setGotchiActive(false)
        if (gotchi) {
            setGotchi(gotchi.recycled(gotchi.instance))
        }
    }
    const onEvolve = (toEvolve: Gotchi) => setEvolution(new Evolution(createInstance, toEvolve))
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
                    gotchi={gotchi}
                    evolution={evolution}
                    stopEvolution={stopEvolution}
                />
            </Canvas>
            {
                evolution ? (
                    <EvolutionView evolution={evolution} stopEvolution={stopEvolution}/>
                ) : gotchi ? (
                    <div id="bottom-middle">
                        {!life || life.stage === Stage.Mature ? (
                            <ButtonGroup className="mx-1">
                                <Button disabled={!gotchiActive} onClick={() => {
                                    setGotchiActive(false)
                                    gotchi.direction = Direction.Rest
                                }}>
                                    <FaYinYang/> Rest
                                </Button>
                                <Button disabled={gotchiActive} onClick={() => {
                                    setGotchiActive(true)
                                    gotchi.autopilot = true
                                }}>
                                    <FaRunning/> Run
                                </Button>
                                <Button disabled={gotchiActive} onClick={() => {
                                    setGotchiActive(true)
                                    onEvolve(gotchi)
                                }}>
                                    <FaDna/> Evolve
                                </Button>
                            </ButtonGroup>
                        ) : (
                            <h6 style={{
                                color: "white",
                                backgroundColor: "#53a455",
                                borderRadius: "1em",
                                padding: "0.4em",
                            }}><FaBaby/> {stageName(life.stage)} <FaHourglassHalf/></h6>
                        )}
                    </div>
                ) : undefined
            }
        </div>
    )
}

