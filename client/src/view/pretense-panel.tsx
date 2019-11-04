/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { Button, ButtonGroup } from "reactstrap"

import { SurfaceCharacter } from "../fabric/fabric-engine"

enum GravityCharacter {
    Light = "Light",
    Heavy = "Heavy",
    Space = "Space",
}

enum DragCharacter {
    Light = "Light",
    Heavy = "Heavy",
    Free = "Free",
}

enum DensityCharacter {
    Push5Pull1 = "Push5Pull1",
    Push2Pull1 = "Push2Pull1",
    Push1Pull1 = "Push1Pull1",
}

export function PretensePanel({}: {}): JSX.Element {

    const [gravityCharacter, setGravityCharacter] = useState(GravityCharacter.Light)
    const [surfaceCharacter, setSurfaceCharacter] = useState(SurfaceCharacter.Sticky)
    const [dragCharacter, setDragCharacter] = useState(DragCharacter.Light)
    const [densityCharacter, setDensityCharacter] = useState(DensityCharacter.Push5Pull1)

    return (
        <div className="m-5">
            <div className="my-2">
                <h6>Gravity</h6>
                <ButtonGroup>
                    {Object.keys(GravityCharacter).map(key => (
                        <Button
                            key={key}
                            active={gravityCharacter === GravityCharacter[key]}
                            onClick={() => setGravityCharacter(GravityCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Surface</h6>
                <ButtonGroup>
                    {Object.keys(SurfaceCharacter).filter(k => k.length > 1).map(key => (
                        <Button
                            key={key}
                            active={surfaceCharacter === SurfaceCharacter[key]}
                            onClick={() => setSurfaceCharacter(SurfaceCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Drag</h6>
                <ButtonGroup>
                    {Object.keys(DragCharacter).map(key => (
                        <Button
                            key={key}
                            active={dragCharacter === DragCharacter[key]}
                            onClick={() => setDragCharacter(DragCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Density</h6>
                <ButtonGroup>
                    {Object.keys(DensityCharacter).map(key => (
                        <Button
                            key={key}
                            active={densityCharacter === DensityCharacter[key]}
                            onClick={() => setDensityCharacter(DensityCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
        </div>
    )
}
