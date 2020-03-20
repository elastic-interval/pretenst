/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo } from "react"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"

import { Limb } from "./gotchi"
import { Island } from "./island"
import { IslandView } from "./island-view"

export function GotchiView({island}: {
    island: Island,
}): JSX.Element {

    const gotchi = useMemo(() => island.hexalots[0].createNativeGotchi(), [])

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
                <IslandView island={island} gotchi={gotchi}/>
            </Canvas>
            <div id="bottom-middle">
                <ButtonGroup>
                    {Object.keys(Limb)
                        .map(key => [1, 2, 3].map(group => (
                            <Button
                                key={`key-${group}`}
                                onClick={() => {
                                    if (!gotchi) {
                                        return
                                    }
                                    gotchi.actuate(Limb[key], group)
                                }}
                            >
                                {key}-{group}
                            </Button>
                        )))}
                </ButtonGroup>
            </div>
        </div>
    )
}

