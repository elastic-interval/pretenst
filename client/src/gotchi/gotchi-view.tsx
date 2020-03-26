/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo, useState } from "react"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"

import { CreateInstance } from "../fabric/fabric-instance"

import { Evolution } from "./evolution"
import { Island } from "./island"
import { IslandView } from "./island-view"

export function GotchiView({island, createInstance}: {
    island: Island,
    createInstance: CreateInstance,
}): JSX.Element {

    const gotchi = useMemo(() => island.hexalots[0].createGotchi(createInstance()), [])
    const [evolution, updateEvolution] = useState<Evolution | undefined>(undefined)

    const onClickEvolve = () => {
        if (gotchi) {
            const evo = new Evolution(createInstance, gotchi)
            console.log("Evolving gotchis", evo.evolvers.length)
            updateEvolution(evo)
        }
    }
    return (
        <div id="view-container" style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "100%",
        }}>
            <Canvas key={island.name} style={{
                backgroundColor: "black",
                borderStyle: "solid",
                borderColor: "#f0ad4e",
                borderWidth: "2px",
            }}>
                <IslandView island={island} gotchi={gotchi} evolution={evolution}/>
            </Canvas>
            <div id="bottom-middle">
                <ButtonGroup>
                    <Button key={`evolve`} onClick={onClickEvolve}>Evolve!</Button>
                </ButtonGroup>
            </div>
        </div>
    )
}

