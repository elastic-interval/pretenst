/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties } from "react"
import { FaArrowDown, FaArrowUp, FaHandPointer, FaSun, FaTimes } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import {
    AdjacentIntervals,
    IFace,
    ISelectedFace,
    ISelection,
    nextAdjacent,
    StressSelectMode,
} from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { StressSelectionPanel } from "./stress-selection-panel"

const middleBottom: CSSProperties = {
    borderStyle: "solid",
    position: "absolute",
    bottom: "1em",
    left: "50%",
    transform: "translate(-50%)",
}

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
        fabric.selectByFace(nextAdjacentFace)
        setSelection({selectedFace: nextAdjacentFace})
    }

    function StressModeButtonGroup(): JSX.Element {
        const selectStressSelectMode = (stressSelectMode: StressSelectMode) => {
            setSelection({selectedStress: {stressSelectMode, stressValue: 0}})
        }

        return (
            <ButtonGroup>
                {Object.keys(StressSelectMode).map(key => {
                    const mode = StressSelectMode [key]
                    return <Button onClick={() => selectStressSelectMode(mode)} key={key}>{mode}</Button>
                })}
            </ButtonGroup>
        )
    }

    function CancelButton(): JSX.Element {
        const onCancel = () => {
            fabric.selectNone()
            setSelection({})
        }
        return (
            <Button onClick={onCancel}><FaTimes/> Cancel</Button>
        )
    }

    return (
        <div style={middleBottom}>
            {selectedFace ? (
                <ButtonGroup>
                    {!selectedFace.face.canGrow ? undefined : (
                        <Button onClick={() => grow(selectedFace.face)}><FaSun/> Grow</Button>
                    )}
                    {selectedFace.adjacentIntervals === AdjacentIntervals.None ? (
                        <Button onClick={() => faceNextAdjacent(selectedFace)}>Click sphere to select
                            bars/cables</Button>
                    ) : (
                        <>
                            <Button onClick={adjustValue(true)}><FaArrowUp/> Longer</Button>
                            <Button onClick={adjustValue(false)}><FaArrowDown/> Shorter</Button>
                            <Button onClick={() => faceNextAdjacent(selectedFace)}>Click sphere to select
                                bars/cables</Button>
                        </>
                    )}
                    <CancelButton/>
                </ButtonGroup>
            ) : selectedStress ? (
                <div>
                    <StressSelectionPanel
                        fabric={fabric}
                        stressSelectMode={selectedStress.stressSelectMode}
                        cancelSelection={() => setSelection({})}
                    />
                </div>
            ) : (
                <>
                    <ButtonGroup>
                        <Button onClick={selectLowestFace}><FaHandPointer/> Select a face by clicking it</Button>
                    </ButtonGroup>
                    &nbsp;&nbsp;
                    <StressModeButtonGroup/>
                </>
            )}
        </div>
    )
}
