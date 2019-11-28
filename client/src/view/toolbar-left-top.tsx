/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaHandPointUp, FaTimesCircle } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace } from "../fabric/tensegrity-types"
import { IStoredState, transition } from "../storage/stored-state"

export function ToolbarLeftTop({fabric, selectedFaces, clearSelectedFaces, storedState$, fullScreen}: {
    fabric?: TensegrityFabric,
    selectedFaces: IFace[],
    clearSelectedFaces: () => void,
    storedState$: BehaviorSubject<IStoredState>,
    fullScreen: boolean,
}): JSX.Element {

    const [selectionMode, updateSelectionMode] = useState(storedState$.getValue().selectionMode)

    useEffect(() => {
        const subscription = storedState$.subscribe(newState => updateSelectionMode(newState.selectionMode))
        return () => subscription.unsubscribe()
    }, [])

    return (
        <div style={{
            left: fullScreen ? "2em" : "1em",
        }} id="top-left">
            <ButtonGroup>
                <Button
                    color={selectionMode ? "warning" : "secondary"}
                    onClick={() => storedState$.next(transition(storedState$.getValue(), {selectionMode: !selectionMode}))}
                >
                    <FaHandPointUp/>
                </Button>
                <Button
                    disabled={selectedFaces.length === 0}
                    onClick={() => clearSelectedFaces()}
                >
                    {selectedFaces.length > 0 ? (
                        selectedFaces.map(({index}) => (
                            <span key={`Dot${index}`}><FaTimesCircle/> </span>
                        ))
                    ) : (
                        <FaTimesCircle/>
                    )}
                </Button>
            </ButtonGroup>
        </div>
    )
}
