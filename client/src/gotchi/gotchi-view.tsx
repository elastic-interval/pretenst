/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Canvas } from "react-three-fiber"

import { IStoredState } from "../storage/stored-state"

import { IGotchiFactory } from "./gotchi"
import { Island } from "./island"
import { IslandComponent } from "./island-component"
import { IIslandData } from "./island-logic"

export function GotchiView({eig, storedState}: {
    eig: typeof import("eig"),
    storedState: IStoredState,
}): JSX.Element {

    const islandData: IIslandData = {
        name: "Testing",
        hexalots: "",
        spots: "010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101",
    }

    const gotchiFactory: IGotchiFactory = {
        createGotchi: (hexalot, rotation, genome) => {
            throw new Error("Not implemented")
        },
    }

    const island = new Island(islandData, gotchiFactory)

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
                <IslandComponent island={island}/>
            </Canvas>
        </div>
    )
}
