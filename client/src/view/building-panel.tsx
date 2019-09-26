/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaArrowDown, FaArrowUp, FaRegHandPointer, FaTimes } from "react-icons/all"
import { Button, ButtonGroup, ButtonToolbar } from "reactstrap"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import {
    facePartSelectable,
    IFace,
    IInterval,
    IJoint,
    ISelection,
    Selectable,
    selectionActive,
} from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function BuildingPanel({fabric, selection, setSelection}: {
    fabric: TensegrityFabric,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {

    function adjustment(up: boolean): number {
        const factor = 1.1
        return up ? factor : (1 / factor)
    }

    function SelectableButton({selectable, disabled}: { selectable: Selectable, disabled?: boolean }): JSX.Element {
        return (
            <Button disabled={disabled} onClick={() => setSelection({...selection, selectable})}>
                <FaRegHandPointer/> {selectable}
            </Button>
        )
    }

    function Cancel(): JSX.Element {
        return (
            <ButtonGroup>
                <Button onClick={() => setSelection({})}>
                    <FaTimes/> Cancel
                </Button>
            </ButtonGroup>
        )
    }

    function Face({face}: { face: IFace }): JSX.Element {
        function MaybeSelectable({selectable}: { selectable: Selectable }): JSX.Element {
            return <SelectableButton disabled={selection.selectable === selectable} selectable={selectable}/>
        }

        const grow = () => {
            createConnectedBrick(face.brick, face.triangle)
            setSelection({})
        }
        const touchesFace = (interval: IInterval) => face.joints.some(joint => (
            interval.alpha.index === joint.index || interval.omega.index === joint.index
        ))
        const intervals =
            selection.selectable === Selectable.BAR ? face.bars
                : selection.selectable === Selectable.CABLE ? face.cables
                : selection.selectable === Selectable.JOINT ? fabric.intervals.filter(touchesFace)
                    : []
        const adjustUp = (up: boolean) => () => intervals.forEach(interval => {
            fabric.instance.multiplyRestLength(interval.index, adjustment(up))
        })

        return (
            <ButtonToolbar>
                <ButtonGroup>
                    {!face.canGrow || facePartSelectable(selection) ? undefined :
                        <Button onClick={grow}>Grow</Button>
                    }
                </ButtonGroup>
                {intervals.length === 0 ? undefined : (
                    <ButtonGroup>
                        <Button onClick={adjustUp(false)}><FaArrowDown/></Button>
                        <Button onClick={adjustUp(true)}><FaArrowUp/></Button>
                    </ButtonGroup>
                )}
                <ButtonGroup>
                    <MaybeSelectable selectable={Selectable.JOINT}/>
                    <MaybeSelectable selectable={Selectable.BAR}/>
                    <MaybeSelectable selectable={Selectable.CABLE}/>
                    <Cancel/>
                </ButtonGroup>
            </ButtonToolbar>
        )
    }

    function Joint({joint}: { joint: IJoint }): JSX.Element {
        const adjustUp = (up: boolean) => () => {
            fabric.intervals
                .filter(i => i.alpha.index === joint.index || i.omega.index === joint.index)
                .forEach(interval => fabric.instance.multiplyRestLength(interval.index, adjustment(up)))
        }
        return (
            <ButtonToolbar>
                <ButtonGroup>
                    <Button onClick={adjustUp(false)}><FaArrowDown/></Button>
                    <Button onClick={adjustUp(true)}><FaArrowUp/></Button>
                </ButtonGroup>
                <Cancel/>
            </ButtonToolbar>
        )
    }

    function Interval({interval}: { interval: IInterval }): JSX.Element {
        const adjustUp = (up: boolean) => () => {
            fabric.instance.multiplyRestLength(interval.index, adjustment(up))
        }
        return (
            <ButtonToolbar>
                <ButtonGroup>
                    <Button onClick={adjustUp(false)}><FaArrowDown/></Button>
                    <Button onClick={adjustUp(true)}><FaArrowUp/></Button>
                </ButtonGroup>
                <Cancel/>
            </ButtonToolbar>
        )
    }

    if (!selectionActive(selection)) {
        return <div/>
    }

    return (
        <div className="bottom-container">
            {!selection.selectedFace ? undefined :
                <Face face={selection.selectedFace}/>
            }
            {!selection.selectedJoint ? undefined :
                <Joint joint={selection.selectedJoint}/>
            }
            {!selection.selectedInterval ? undefined :
                <Interval interval={selection.selectedInterval}/>
            }
        </div>
    )
}
