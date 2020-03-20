/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Canvas } from "react-three-fiber"

import { Island } from "./island"
import { IslandView } from "./island-view"

export function GotchiView({eig, island}: {
    eig: typeof import("eig"),
    island: Island,
}): JSX.Element {

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
                <IslandView island={island}/>
            </Canvas>
        </div>
    )
}

