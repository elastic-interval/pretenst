/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCamera, FaFileCsv, FaSyncAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { LifePhase } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles } from "../storage/download"
import { IStoredState, transition } from "../storage/stored-state"

export function ToolbarLeftBottom({fabric, storedState$, lifePhase$, fullScreen}: {
    fabric: TensegrityFabric,
    storedState$: BehaviorSubject<IStoredState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    fullScreen: boolean,
}): JSX.Element {
    const [rotating, updateRotating] = useState(storedState$.getValue().rotating)
    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
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
                    onClick={() => storedState$.next(transition(storedState$.getValue(), {ellipsoids: !ellipsoids}))}
                >
                    <FaCamera/>
                </Button>
                <Button
                    color={rotating ? "warning" : "secondary"}
                    onClick={() => storedState$.next(transition(storedState$.getValue(), {rotating: !rotating}))}
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
