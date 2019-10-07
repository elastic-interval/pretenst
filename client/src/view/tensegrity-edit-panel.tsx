/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties } from "react"
import { FaArrowDown, FaArrowUp, FaSun, FaTimes } from "react-icons/all"
import { Badge, Button, ButtonGroup } from "reactstrap"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import { FaceSelection, IFace, ISelectedFace } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function TensegrityEditPanel({fabric, selectedFace, setSelectedFace}: {
    fabric?: TensegrityFabric,
    selectedFace?: ISelectedFace,
    setSelectedFace: (face: ISelectedFace | undefined) => void,
}): JSX.Element {

    function adjustment(up: boolean): number {
        const factor = 1.03
        return up ? factor : (1 / factor)
    }

    function CancelButton(): JSX.Element {
        const onCancel = () => {
            if (fabric) {
                fabric.selectNone()
            }
            setSelectedFace(undefined)
        }
        return (
            <Button onClick={onCancel}><FaTimes/> Cancel</Button>
        )
    }

    const adjustValue = (up: boolean) => () => {
        if (!fabric) {
            return
        }
        fabric.selectedIntervals.forEach(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment(up))
        })
    }
    const grow = (face: IFace) => {
        createConnectedBrick(face.brick, face.triangle)
        setSelectedFace(undefined)
    }

    const middleBottom: CSSProperties = {
        borderStyle: "solid",
        position: "absolute",
        bottom: "1em",
        left: "50%",
        transform: "translate(-50%)",
    }
    return (
        <div style={middleBottom}>
            {selectedFace ? (
                <ButtonGroup>
                    {!selectedFace.face.canGrow ? undefined : (
                        <Button onClick={() => grow(selectedFace.face)}><FaSun/> Grow</Button>
                    )}
                    {selectedFace.faceSelection === FaceSelection.None ? undefined : (
                        <>
                            <Button onClick={adjustValue(true)}><FaArrowUp/> Longer</Button>
                            <Button onClick={adjustValue(false)}><FaArrowDown/> Shorter</Button>
                        </>
                    )}
                    <CancelButton/>
                </ButtonGroup>
            ) : (
                <Badge>Select a face to start editing</Badge>
            )}
        </div>
    )
}
