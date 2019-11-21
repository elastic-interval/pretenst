/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCamera, FaFileCsv, FaSyncAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, LifePhase, transition } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles } from "../storage/download"

export function ToolbarLeftBottom({fabric, fabricState$, lifePhase$, fullScreen}: {
    fabric: TensegrityFabric,
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    fullScreen: boolean,
}): JSX.Element {
    const [rotating, updateRotating] = useState(fabricState$.getValue().rotating)
    const [ellipsoids, updateEllipsoids] = useState(fabricState$.getValue().ellipsoids)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateRotating(newState.rotating)
            updateEllipsoids(newState.ellipsoids)
        })
        return () => subscription.unsubscribe()
    }, [])
    return (
        <div style={{
            left: fullScreen ? "2em" : "1em",
        }} id="bottom-left">
            <ButtonGroup>
                <Button
                    color={ellipsoids ? "warning" : "secondary"}
                    onClick={() => fabricState$.next(transition(fabricState$.getValue(), {ellipsoids: !ellipsoids}))}
                >
                    <FaCamera/>
                </Button>
                <Button
                    color={rotating ? "warning" : "secondary"}
                    onClick={() => fabricState$.next(transition(fabricState$.getValue(), {rotating: !rotating}))}
                >
                    <FaSyncAlt/>
                </Button>
            </ButtonGroup>
            <ButtonGroup className="mx-1">
                <Button
                    onClick={() => saveCSVFiles(fabric)}
                >
                    <FaFileCsv/>
                </Button>
            </ButtonGroup>

        </div>
    )
}
