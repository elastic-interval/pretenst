/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaAngleLeft, FaAngleRight, FaRegHandPointer, FaTimes } from "react-icons/all"
import { Button, ButtonGroup, ButtonToolbar } from "reactstrap"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import { IFace, IInterval, IJoint, ISelection, Selectable } from "../fabric/tensegrity-brick-types"
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
            <Button disabled={disabled} onClick={() => setSelection({selectable})}>
                <FaRegHandPointer/> {selectable}
            </Button>
        )
    }

    function SelectableChoice(): JSX.Element {
        function MaybeSelectable({selectable}: { selectable: Selectable }): JSX.Element {
            return <SelectableButton disabled={selection.selectable === selectable} selectable={selectable}/>
        }

        return (
            <ButtonGroup>
                <MaybeSelectable selectable={Selectable.FACE}/>
                <MaybeSelectable selectable={Selectable.JOINT}/>
                <MaybeSelectable selectable={Selectable.INTERVAL}/>
            </ButtonGroup>
        )
    }

    function ChooseSelectionType(): JSX.Element {
        return (
            <ButtonToolbar>
                <SelectableChoice/>
            </ButtonToolbar>
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
        const grow = () => {
            createConnectedBrick(face.brick, face.triangle)
            setSelection({selectable: Selectable.FACE})
        }
        const adjustUp = (up: boolean) => () => {
            face.cables.forEach(cable => fabric.instance.multiplyRestLength(cable.index, adjustment(up)))
        }
        return (
            <ButtonToolbar>
                <ButtonGroup>
                    {face.canGrow ? <Button onClick={grow}>Grow</Button> : undefined}
                    <Button onClick={adjustUp(false)}><FaAngleLeft/></Button>
                    <Button onClick={adjustUp(true)}><FaAngleRight/></Button>
                </ButtonGroup>
                <SelectableChoice/>
                <Cancel/>
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
                    <Button onClick={adjustUp(false)}><FaAngleLeft/></Button>
                    <Button onClick={adjustUp(true)}><FaAngleRight/></Button>
                </ButtonGroup>
                <SelectableChoice/>
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
                    <Button onClick={adjustUp(false)}><FaAngleLeft/></Button>
                    <Button onClick={adjustUp(true)}><FaAngleRight/></Button>
                </ButtonGroup>
                <SelectableChoice/>
                <Cancel/>
            </ButtonToolbar>
        )
    }

    function NothingSelected(): JSX.Element {
        return (
            <>
                <ButtonToolbar>
                    <SelectableChoice/>
                </ButtonToolbar>
            </>
        )
    }

    const nothingSelected = !(selection.selectedFace || selection.selectedJoint || selection.selectedInterval)

    return (
        <div className="bottom-container">
            <>
                {!selection.selectable && nothingSelected ? (
                    <ChooseSelectionType/>
                ) : nothingSelected ? (
                    <NothingSelected/>
                ) : (
                    <>
                        {!selection.selectedFace ? undefined : <Face face={selection.selectedFace}/>}
                        {!selection.selectedJoint ? undefined : <Joint joint={selection.selectedJoint}/>}
                        {!selection.selectedInterval ? undefined : <Interval interval={selection.selectedInterval}/>}
                    </>
                )}
            </>
        </div>
    )
}
