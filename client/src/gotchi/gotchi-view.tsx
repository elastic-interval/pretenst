/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"

import { CreateInstance } from "../fabric/fabric-instance"
import { Grouping } from "../view/control-tabs"

import { Evolution } from "./evolution"
import { EvolutionView } from "./evolution-view"
import { emptyGenome } from "./genome"
import { Direction, DIRECTIONS } from "./gotchi"
import { Island } from "./island"
import { IslandView } from "./island-view"

export function GotchiView({island, createInstance}: {
    island: Island,
    createInstance: CreateInstance,
}): JSX.Element {

    const [gotchi, setGotchi] = useState(() => island.hexalots[0].createNewGotchi(createInstance()))
    const [gotchiDirection, setGotchiDirection] = useState(Direction.Rest)
    useEffect(() => setGotchiDirection(gotchi ? gotchi.direction : Direction.Rest), [gotchi])
    const [evolution, setEvolution] = useState<Evolution | undefined>(undefined)

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
                    direction={gotchiDirection}
                    setDirection={setGotchiDirection}
                    evolution={evolution}
                />
            </Canvas>
            {!evolution ? undefined : (
                <EvolutionView evolution={evolution}/>
            )}
            <div id="bottom-middle">
                <Grouping>
                    <ButtonGroup className="mx-1">
                        {DIRECTIONS.map(nextDirection => (
                            <Button key={`direction-${nextDirection}`}
                                    disabled={gotchiDirection === nextDirection}
                                    onClick={() => {
                                        if (gotchi) {
                                            gotchi.direction = nextDirection
                                        }
                                    }}
                            >
                                {nextDirection}
                            </Button>
                        ))}
                    </ButtonGroup>
                    <ButtonGroup className="mx-1">
                        <Button disabled={!!evolution} onClick={() => {
                            if (!gotchi) {
                                return
                            }
                            if (!gotchi.isMature) {
                                console.error("immature")
                                return
                            }
                            if (gotchi.direction !== Direction.Rest) {
                                console.error("not at rest")
                                return
                            }
                            const evo = new Evolution(createInstance, gotchi)
                            console.log("Evolving gotchis", evo.evolvers.length)
                            setEvolution(evo)
                        }}>
                            Evolve!
                        </Button>
                        <Button disabled={!evolution} onClick={() => {
                            if (evolution) {
                                setTimeout(() => evolution.free(), 1000)
                            }
                            setEvolution(undefined)
                            if (gotchi) {
                                setGotchi(gotchi.recycled(gotchi.instance))
                            }
                        }}>
                            Stop!
                        </Button>
                        <Button onClick={() => {
                            if (gotchi) {
                                gotchi.saveGenome(emptyGenome())
                                setGotchi(gotchi.recycled(gotchi.instance))
                            }
                        }}>
                            Delete!
                        </Button>
                    </ButtonGroup>
                </Grouping>
            </div>
        </div>
    )
}

