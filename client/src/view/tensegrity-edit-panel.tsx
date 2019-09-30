/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaArrowDown, FaArrowUp, FaRegHandPointer } from "react-icons/all"
import { Alert, Button, ButtonGroup } from "reactstrap"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import { facePartSelectable, IFace, IInterval, IJoint, ISelection, Selectable } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

const buttonClass = "text-left my-2 mx-1 btn-info"
const buttonGroupClass = "w-75 align-self-center my-4"

export function TensegrityEditPanel({fabric, selection, setSelection}: {
    fabric?: TensegrityFabric,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {

    function adjustment(up: boolean): number {
        const factor = 1.1
        return up ? factor : (1 / factor)
    }

    function SelectableButton({selectable, disabled}: { selectable: Selectable, disabled?: boolean }): JSX.Element {
        return (
            <Button className={buttonClass} disabled={disabled}
                    onClick={() => setSelection({...selection, selectable})}>
                <FaRegHandPointer/> Select {selectable}s
            </Button>
        )
    }

    function MaybeSelectable({selectable}: { selectable: Selectable }): JSX.Element {
        return <SelectableButton disabled={selection.selectable === selectable} selectable={selectable}/>
    }

    function Selectables(): JSX.Element {
        return (
            <>
                <MaybeSelectable selectable={Selectable.JOINT}/>
                <MaybeSelectable selectable={Selectable.BAR}/>
                <MaybeSelectable selectable={Selectable.CABLE}/>
            </>
        )
    }

    function Face({face}: { face: IFace }): JSX.Element {

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
                : (selection.selectable === Selectable.JOINT && fabric) ? fabric.intervals.filter(touchesFace)
                    : []
        const adjustValue = (up: boolean) => () => intervals.forEach(interval => {
            if (fabric) {
                fabric.instance.multiplyRestLength(interval.index, adjustment(up))
            }
        })

        return (
            <ButtonGroup className={buttonGroupClass} vertical={true}>
                {intervals.length === 0 ? undefined : (
                    <>
                        <Button className={buttonClass} onClick={adjustValue(true)}>
                            <FaArrowUp/> Lengthen
                        </Button>
                        <Button className={buttonClass} onClick={adjustValue(false)}>
                            <FaArrowDown/> Shorten
                        </Button>
                    </>
                )}
                {!face.canGrow || facePartSelectable(selection) ? undefined :
                    <Button className={buttonClass} onClick={grow}>Grow</Button>
                }
            </ButtonGroup>
        )
    }

    function Joint({joint}: { joint: IJoint }): JSX.Element {
        const adjustValue = (up: boolean) => () => {
            if (fabric) {
                fabric.intervals
                    .filter(i => i.alpha.index === joint.index || i.omega.index === joint.index)
                    .forEach(interval => fabric.instance.multiplyRestLength(interval.index, adjustment(up)))
            }
        }
        return (
            <ButtonGroup className={buttonGroupClass} vertical={true}>
                <Button className={buttonClass} onClick={adjustValue(true)}>
                    <FaArrowUp/> Lengthen
                </Button>
                <Button className={buttonClass} onClick={adjustValue(false)}>
                    <FaArrowDown/> Shorten
                </Button>
            </ButtonGroup>
        )
    }

    function Interval({interval}: { interval: IInterval }): JSX.Element {
        const adjustValue = (up: boolean) => () => {
            if (fabric) {
                fabric.instance.multiplyRestLength(interval.index, adjustment(up))
            }
        }
        return (
            <ButtonGroup className={buttonGroupClass} vertical={true}>
                <Button className={buttonClass} onClick={adjustValue(true)}>
                    <FaArrowUp/> Lengthen
                </Button>
                <Button className={buttonClass} onClick={adjustValue(false)}>
                    <FaArrowDown/> Shorten
                </Button>
            </ButtonGroup>
        )
    }

    const nothingSelected = !(selection.selectedJoint || selection.selectedInterval || selection.selectedFace)

    return (
        <div className="text-center">
            {nothingSelected ? (
                <Alert className="my-5">Select a face to start editing</Alert>
            ) : (
                <ButtonGroup className={buttonGroupClass} vertical={true}>
                    <Selectables/>
                </ButtonGroup>
            )}
            {
                selection.selectedInterval ? (
                    <Interval interval={selection.selectedInterval}/>
                ) : selection.selectedJoint ? (
                    <Joint joint={selection.selectedJoint}/>
                ) : selection.selectedFace ? (
                    <Face face={selection.selectedFace}/>
                ) : undefined
            }
        </div>
    )
}
