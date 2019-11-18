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

export function ToolbarLeftTop({app$, fullScreen, selectedFaces, clearSelectedFaces}: {
    app$: BehaviorSubject<IFabricState>,
    fullScreen: boolean,
    selectedFaces: IFace[]
    clearSelectedFaces: () => void,
}): JSX.Element {

    const [faceSelection, updateFaceSelection] = useState(app$.getValue().faceSelection)

    useEffect(() => {
        const subscription = app$.subscribe(newState => {
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
                    onClick={() => app$.next(transition(app$.getValue(), {faceSelection: !faceSelection}))}
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
