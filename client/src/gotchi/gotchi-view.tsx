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

import { Evolution, IEvolutionParameters } from "./evolution"
import { Direction, DIRECTIONS } from "./gotchi"
import { Island } from "./island"
import { IslandView } from "./island-view"

const EVOLUTION_PARAMETERS: IEvolutionParameters = {
    maxPopulation: 10,
    minCycleCount: 3,
    maxCycleCount: 8,
    mutationCount: 3,
    survivalRate: 0.5,
}

export function GotchiView({island, createInstance}: {
    island: Island,
    createInstance: CreateInstance,
}): JSX.Element {

    const [gotchi, setGotchi] = useState(() => island.hexalots[0].newGotchi(createInstance()))
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
                            gotchi.reorient()
                            if (gotchi.direction === Direction.Rest) {
                                console.error("still at rest after reorient")
                                return
                            }
                            const evo = new Evolution(createInstance, gotchi, EVOLUTION_PARAMETERS)
                            console.log("Evolving gotchis", evo.evolvers.length)
                            setEvolution(evo)
                        }}>
                            Evolve!
                        </Button>
                        <Button disabled={!evolution} onClick={() => {
                            setEvolution(undefined)
                            if (gotchi) {
                                setGotchi(gotchi.recycled(gotchi.instance))
                            }
                        }}>
                            Stop!
                        </Button>
                    </ButtonGroup>
                </Grouping>
            </div>
        </div>
    )
}

