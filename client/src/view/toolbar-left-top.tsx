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
import { IOperations } from "../fabric/tensegrity-brick-types"

export function ToolbarLeftTop({app$, operations$, fullScreen}: {
    app$: BehaviorSubject<IFabricState>,
    operations$: BehaviorSubject<IOperations>,
    fullScreen: boolean,
}): JSX.Element {

    const [selectedFaces, updateSelectedFaces] = useState(operations$.getValue().selectedFaces)
    const [selectionMode, updateSelectionMode] = useState(app$.getValue().selectionMode)

    useEffect(() => {
        const subscriptions = [
            app$.subscribe(newState => updateSelectionMode(newState.selectionMode)),
            operations$.subscribe(newOps => updateSelectedFaces(newOps.selectedFaces)),
        ]
        return () => subscriptions.forEach(sub => sub.unsubscribe())
    }, [])

    return (
        <div style={{
            left: fullScreen ? "2em" : "1em",
        }} id="top-left">
            <ButtonGroup>
                <Button
                    color={selectionMode ? "warning" : "secondary"}
                    onClick={() => app$.next(transition(app$.getValue(), {selectionMode: !selectionMode}))}
                >
                    <FaHandPointUp/>
                </Button>
                <Button
                    disabled={selectedFaces.length === 0}
                    onClick={() => operations$.next({...operations$.getValue(), selectedFaces: []})}
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
