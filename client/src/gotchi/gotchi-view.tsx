/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"

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
        createGotchi: (hexalot, rotation, genome) =>  {
            throw new Error("Not implemented")
        },
    }

    const island = new Island(islandData, gotchiFactory)

    return (
            <div style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "100%",
            }}>
                <IslandComponent island={island}/>
            </div>
    )
}
