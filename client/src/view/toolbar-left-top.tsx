/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaHandPointUp } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, transition } from "../fabric/fabric-state"

export function ToolbarLeftTop({fabricState$, fullScreen}: {
    fabricState$: BehaviorSubject<IFabricState>,
    fullScreen: boolean,
}): JSX.Element {

    const [faceSelection, updateFaceSelection] = useState(fabricState$.getValue().faceSelection)

    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateFaceSelection(newState.faceSelection)
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <div style={{
            left: fullScreen ? "2em" : "1em",
        }} id="top-left">
            <ButtonGroup>
                <Button
                    color={faceSelection ? "warning" : "secondary"}
                    onClick={() => fabricState$.next(transition(fabricState$.getValue(), {faceSelection: !faceSelection}))}
                >
                    <FaHandPointUp/>
                </Button>
            </ButtonGroup>
        </div>
    )
}
