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

export function ToolbarLeftBottom({fabric, app$, lifePhase$, fullScreen}: {
    fabric: TensegrityFabric,
    app$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    fullScreen: boolean,
}): JSX.Element {
    const [rotating, updateRotating] = useState(app$.getValue().rotating)
    const [ellipsoids, updateEllipsoids] = useState(app$.getValue().ellipsoids)
    useEffect(() => {
        const subscription = app$.subscribe(newState => {
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
                    onClick={() => app$.next(transition(app$.getValue(), {ellipsoids: !ellipsoids}))}
                >
                    <FaCamera/>
                </Button>
                <Button
                    color={rotating ? "warning" : "secondary"}
                    onClick={() => app$.next(transition(app$.getValue(), {rotating: !rotating}))}
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
