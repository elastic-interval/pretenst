/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaAnchor, FaCamera, FaClock, FaCubes, FaFileCsv, FaSyncAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, LifePhase, transition } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

export function ToolbarLeft({fabric, fabricState$, lifePhase$, fullScreen}: {
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
    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
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
                    {ellipsoids ? <FaClock/> : <FaCamera/>}
                </Button>
                <Button
                    color={rotating ? "warning" : "secondary"}
                    onClick={() => fabricState$.next(transition(fabricState$.getValue(), {rotating: !rotating}))}
                >
                    {rotating ? <FaAnchor/> : <FaSyncAlt/>}
                </Button>
            </ButtonGroup>
            <ButtonGroup className="mx-1">
                <Button
                    disabled={lifePhase !== LifePhase.Pretenst}
                    onClick={() => saveCSVFiles(fabric)}
                >
                    <FaFileCsv/>
                </Button>
                <Button
                    disabled={lifePhase !== LifePhase.Pretenst}
                    onClick={() => saveOBJFile(fabric)}
                >
                    <FaCubes/>
                </Button>
            </ButtonGroup>

        </div>
    )
}
