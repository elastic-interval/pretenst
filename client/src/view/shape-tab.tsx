/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useState } from "react"
import { FaArrowDown, FaArrowUp, FaHandPointUp, FaList, FaMagic, FaMinusSquare, FaPlusSquare } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import {
    ADJUSTABLE_INTERVAL_ROLES,
    floatString,
    IntervalRole,
    intervalRoleName,
    roleDefaultLength,
} from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { TensegrityOptimizer } from "../fabric/tensegrity-optimizer"
import { FaceSelection, IInterval, ISelection, SelectionMode } from "../fabric/tensegrity-types"

import { Grouping } from "./control-tabs"

export function ShapeTab(
    {
        tensegrity, selection,
        selectionMode, setSelectionMode,
    }: {
        tensegrity: Tensegrity,
        selection: ISelection,
        selectionMode: SelectionMode,
        setSelectionMode: (mode: SelectionMode) => void,
    }): JSX.Element {

    const [currentRole, setCurrentRole] = useState(IntervalRole.PhiPush)

    const adjustValue = (up: boolean) => () => {
        const factor = 1.03
        selection.intervals.forEach(interval => {
            tensegrity.changeIntervalScale(interval, up ? factor : (1 / factor))
        })
    }

    function selectionCount(mode: SelectionMode): number {
        switch (mode) {
            case SelectionMode.Faces:
                return selection.faces.length
            case SelectionMode.Intervals:
                return selection.intervals.length
            default:
                return 0
        }
    }

    function isEmptySelection(mode?: SelectionMode): boolean {
        if (mode) {
            return selectionCount(mode) === 0
        } else {
            return selection.intervals.length === 0 && selection.faces.length === 0
        }
    }

    function ModeButton({mode, setMode}: {
        mode: SelectionMode, setMode: (mode: SelectionMode) => void,
    }): JSX.Element {
        return (
            <Button
                color={mode === selectionMode ? "success" : "secondary"}
                onClick={() => setMode(mode)}
            >
                <span>{mode}</span>
            </Button>
        )
    }

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaHandPointUp/> Manual</h6>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <ModeButton mode={SelectionMode.SelectNone} setMode={setSelectionMode}/>
                    <ModeButton mode={SelectionMode.Faces} setMode={setSelectionMode}/>
                    <ModeButton mode={SelectionMode.Intervals} setMode={setSelectionMode}/>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button disabled={isEmptySelection(SelectionMode.Intervals)}
                            onClick={adjustValue(true)}>
                        <FaArrowUp/> Lengthen
                    </Button>
                    <Button disabled={isEmptySelection(SelectionMode.Intervals)}
                            onClick={adjustValue(false)}>
                        <FaArrowDown/> Shorten
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        onClick={() => tensegrity.do(t => t.builder
                            .createRadialPulls(selection.faces.filter(f => f.faceSelection === FaceSelection.Face)))}>
                        <span>Distance-75</span>
                    </Button>
                    <Button
                        onClick={() => new TensegrityOptimizer(tensegrity)
                            .replaceCrosses(tensegrity.numericFeature(WorldFeature.IntervalCountdown))
                        }>
                        <FaMagic/><span> Optimize</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaList/> Interval Lengths</h6>
                <ButtonGroup className="my-2 w-100">{
                    ADJUSTABLE_INTERVAL_ROLES
                        .map((intervalRole, index) => (
                            <Button size="sm" key={`IntervalRole[${index}]`}
                                    onClick={() => setCurrentRole(intervalRole)}
                                    color={currentRole === intervalRole ? "success" : "secondary"}
                            >
                                {intervalRoleName(intervalRole)}
                            </Button>
                        ))
                }</ButtonGroup>
                <RoleLengthAdjuster tensegrity={tensegrity} intervalRole={currentRole}/>
            </Grouping>
        </div>
    )
}

function RoleLengthAdjuster({tensegrity, intervalRole, disabled}: {
    tensegrity: Tensegrity,
    intervalRole: IntervalRole,
    disabled?: boolean,
}): JSX.Element {

    function defaultLength(): number {
        return roleDefaultLength(intervalRole)
    }

    function intervals(): IInterval[] {
        return tensegrity.intervals.filter(interval => interval.intervalRole === intervalRole)
    }

    const adjustValue = (up: boolean, fine: boolean) => () => {
        function adjustment(): number {
            const factor = fine ? 1.01 : 1.05
            return up ? factor : (1 / factor)
        }

        intervals().forEach(interval => tensegrity.changeIntervalScale(interval, adjustment()))
    }

    return (
        <div className="my-2">
            <div className="float-right" style={{color: disabled ? "gray" : "white"}}>
                [{floatString(defaultLength())}]
            </div>
            <div>
                {intervalRoleName(intervalRole, true)}
            </div>
            <ButtonGroup className="w-100">
                <Button disabled={disabled} onClick={adjustValue(true, false)}><FaPlusSquare/><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(true, true)}><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(false, true)}><FaMinusSquare/></Button>
                <Button disabled={disabled}
                        onClick={adjustValue(false, false)}><FaMinusSquare/><FaMinusSquare/></Button>
            </ButtonGroup>
        </div>
    )
}
