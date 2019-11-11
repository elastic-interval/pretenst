/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaAnchor, FaCubes, FaFileCsv, FaSyncAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, LifePhase } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

export function ToolbarLeft({fabric, fabricState$, lifePhase$, fullScreen}: {
    fabric: TensegrityFabric,
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    fullScreen: boolean,
}): JSX.Element {
    const [rotating, updateRotating] = useState(fabricState$.getValue().rotating)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateRotating(newState.rotating)
        })
        return () => subscription.unsubscribe()
    })
    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
        return () => subscription.unsubscribe()
    })
    return (
        <div style={{
            left: fullScreen ? "2em" : "1em",
        }} id="bottom-left">
            <ButtonGroup>
                <Button
                    color={fabricState$.getValue().rotating ? "warning" : "secondary"}
                    onClick={() => {
                        const nonce = fabricState$.getValue().nonce + 1
                        fabricState$.next({...fabricState$.getValue(), nonce, rotating: !rotating})
                    }}
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
