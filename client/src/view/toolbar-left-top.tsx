/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaHandPointUp, FaTimesCircle } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, transition } from "../fabric/fabric-state"
import { IFace } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function ToolbarLeftTop({fabric, clearSelectedFaces, fabricState$, fullScreen}: {
    fabric?: TensegrityFabric,
    clearSelectedFaces: () => void,
    fabricState$: BehaviorSubject<IFabricState>,
    fullScreen: boolean,
}): JSX.Element {

    const [selectionMode, updateSelectionMode] = useState(fabricState$.getValue().selectionMode)
    const [selectedFaces, updateSelectedFaces] = useState<IFace[]>([])

    useEffect(() => {
        updateSelectedFaces(fabric ? fabric.selectedFaces : [])
    }, [fabric])
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => updateSelectionMode(newState.selectionMode))
        return () => subscription.unsubscribe()
    }, [])

    return (
        <div style={{
            left: fullScreen ? "2em" : "1em",
        }} id="top-left">
            <ButtonGroup>
                <Button
                    color={selectionMode ? "warning" : "secondary"}
                    onClick={() => fabricState$.next(transition(fabricState$.getValue(), {selectionMode: !selectionMode}))}
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
