/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaArrowDown, FaArrowUp, FaHandPointUp, FaList, FaMinusSquare, FaPlusSquare } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import {
    ADJUSTABLE_INTERVAL_ROLES,
    floatString,
    IntervalRole,
    intervalRoleName,
    roleDefaultLength,
} from "../fabric/eig-util"
import { FaceAction } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { FaceSelection, IInterval, ISelection, percentFromFactor } from "../fabric/tensegrity-types"

import { Grouping } from "./control-tabs"

export function ShapeTab({tensegrity, selection}: {
    tensegrity: Tensegrity,
    selection: ISelection,
}): JSX.Element {

    const [currentRole, updateCurrentRole] = useState(IntervalRole.PullA)

    const adjustValue = (up: boolean) => () => {
        const factor = 1.03
        selection.intervals.forEach(interval => {
            tensegrity.changeIntervalScale(interval, up ? factor : (1 / factor))
        })
    }

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaHandPointUp/> Manual</h6>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button disabled={selection.intervals.length === 0} onClick={adjustValue(true)}>
                        <FaArrowUp/> Lengthen
                    </Button>
                    <Button disabled={selection.intervals.length === 0} onClick={adjustValue(false)}>
                        <FaArrowDown/> Shorten
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        onClick={() => tensegrity.do(t => {
                            const faces = selection.faces.filter(({faceSelection}) => faceSelection === FaceSelection.Face)
                            return t.createRadialPulls(faces, FaceAction.Distance, percentFromFactor(0.75))
                        })}>
                        <span>Distance-75</span>
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        onClick={() => tensegrity.do(t => t.triangulate((a, b, hasPush) => (
                            !hasPush || a !== IntervalRole.PullA || b !== IntervalRole.PullA
                        )))}>
                        <span>Triangulate</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaList/> Interval Groups</h6>
                <ButtonGroup className="my-2 w-100">{
                    ADJUSTABLE_INTERVAL_ROLES
                        .map((intervalRole, index) => (
                            <Button size="sm" key={`IntervalRole[${index}]`}
                                    onClick={() => updateCurrentRole(intervalRole)}
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
                {intervalRoleName(intervalRole)}
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
