/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties } from "react"
import { FaArrowDown, FaArrowUp, FaHandPointer, FaSun, FaTimesCircle } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import {
    AdjacentIntervals,
    bySelectedFace,
    IFace,
    ISelectedFace,
    ISelection,
    nextAdjacent,
} from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { DEFAULT_SELECTED_STRESS, DisplacementPanel } from "./displacement-panel"

export function EditPanel({fabric, selection, setSelection}: {
    fabric: TensegrityFabric,
    selection: ISelection,
    setSelection: (selection: ISelection) => void,
}): JSX.Element {

    const selectedFace = selection.selectedFace
    const selectedStress = selection.selectedStress

    function adjustment(up: boolean): number {
        const factor = 1.03
        return up ? factor : (1 / factor)
    }

    const adjustValue = (up: boolean) => () => {
        fabric.selectedIntervals.forEach(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment(up))
        })
    }

    const grow = (face: IFace) => {
        createConnectedBrick(face.brick, face.triangle)
        setSelection({})
    }

    const selectLowestFace = () => {
        const lowestFace = fabric.faces.reduce((faceA: IFace, faceB: IFace) => {
            const a = fabric.instance.getFaceMidpoint(faceA.index)
            const b = fabric.instance.getFaceMidpoint(faceB.index)
            return (a.y < b.y) ? faceA : faceB
        })
        setSelection({selectedFace: {face: lowestFace, adjacentIntervals: AdjacentIntervals.None}})
    }

    const faceNextAdjacent = (face: ISelectedFace) => {
        const nextAdjacentFace = nextAdjacent(face)
        fabric.selectIntervals(bySelectedFace(nextAdjacentFace))
        setSelection({selectedFace: nextAdjacentFace})
    }

    function CancelButton(): JSX.Element {
        const onCancel = () => {
            fabric.selectIntervals()
            setSelection({})
        }
        return (
            <Button onClick={onCancel}><FaTimesCircle/></Button>
        )
    }

    return (
        <div style={MIDDLE_BOTTOM}>
            {selectedFace ? (
                <ButtonGroup size="sm">
                    {!selectedFace.face.canGrow ? undefined : (
                        <Button onClick={() => grow(selectedFace.face)}><FaSun/> Grow</Button>
                    )}
                    {selectedFace.adjacentIntervals === AdjacentIntervals.None ? (
                        <Button onClick={() => faceNextAdjacent(selectedFace)}>Click sphere to select
                            bars/cables</Button>
                    ) : (
                        <>
                            <Button onClick={adjustValue(true)}>L<FaArrowUp/></Button>
                            <Button onClick={adjustValue(false)}>L<FaArrowDown/></Button>
                            <Button onClick={() => faceNextAdjacent(selectedFace)}>
                                Click sphere to make selections
                            </Button>
                        </>
                    )}
                    <CancelButton/>
                </ButtonGroup>
            ) : selectedStress ? (
                <DisplacementPanel
                    fabric={fabric}
                    selectedStress={selectedStress}
                    setSelection={setSelection}
                />
            ) : (
                <>
                    <ButtonGroup size="sm">
                        <Button color="secondary" onClick={selectLowestFace}>
                            <FaHandPointer/> Select a face by clicking it
                        </Button>
                    </ButtonGroup>
                    &nbsp;&nbsp;
                    <ButtonGroup size="sm">
                        <Button color="secondary" onClick={() => setSelection(DEFAULT_SELECTED_STRESS)}>
                            <FaHandPointer/> Select by stress
                        </Button>
                    </ButtonGroup>
                </>
            )}
        </div>
    )
}

const MIDDLE_BOTTOM: CSSProperties = {
    position: "absolute",
    paddingRight: "1em",
    paddingLeft: "1em",
    bottom: "1em",
    left: "50%",
    transform: "translate(-50%)",
}

