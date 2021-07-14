/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaCircle, FaMinusSquare, FaPlusSquare } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import {
    ADJUSTABLE_INTERVAL_ROLES,
    floatString,
    IntervalRole,
    intervalRoleName,
    roleDefaultLength,
} from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { findConflicts } from "../fabric/tensegrity-logic"
import { IInterval, percentFromFactor } from "../fabric/tensegrity-types"
import { ViewMode, viewModeAtom, visibleRolesAtom } from "../storage/recoil"

import { roleColorString } from "./materials"

export function TopRight({
                             tensegrity,
                             selected,
                         }: { tensegrity: Tensegrity, selected: IInterval | undefined }): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [visibleRoles, updateVisibleRoles] = useRecoilState(visibleRolesAtom)
    const [currentRole, updateCurrentRole] = useState(IntervalRole.PullA)

    const adjustSelection = (up: boolean) => () => {
        const factor = 1.03
        if (selected) {
            tensegrity.changeIntervalScale(selected, up ? factor : (1 / factor))
        }
    }

    function showConflicts(): void {
        const conflicts = findConflicts(tensegrity)
        conflicts.forEach(({jointA, jointB}) => {
            console.log(`conflict: ${jointA.index + 1},${jointB.index + 1}`)
            tensegrity.toDo = {
                todo: t => t.createInterval(jointA, jointB, IntervalRole.PullA, percentFromFactor(0.03)),
            }
        })
    }

    switch (viewMode) {
        case ViewMode.Lines:
            return (
                <>
                    <ButtonGroup>{
                        ADJUSTABLE_INTERVAL_ROLES
                            .map((intervalRole, index) => (
                                <Button key={`IntervalRole[${index}]`}
                                        onClick={() => updateCurrentRole(intervalRole)}
                                        color={currentRole === intervalRole ? "success" : "secondary"}
                                >
                                    {intervalRoleName(intervalRole)}
                                </Button>
                            ))
                    }</ButtonGroup>
                    <RoleLengthAdjuster tensegrity={tensegrity} intervalRole={currentRole}/>
                    <ButtonGroup>
                        <Button onClick={() => showConflicts()}>Conficts</Button>
                    </ButtonGroup>
                </>
            )
        case ViewMode.Selecting:
            return (
                <ButtonGroup>
                    <Button onClick={adjustSelection(true)}>
                        <FaPlusSquare/>
                    </Button>
                    <Button onClick={adjustSelection(false)}>
                        <FaMinusSquare/>
                    </Button>
                </ButtonGroup>
            )
        case ViewMode.Frozen:
            return (
                <ButtonGroup>
                    {ADJUSTABLE_INTERVAL_ROLES.map(intervalRole => (
                        <Button key={`viz${intervalRole}`} onClick={() => {
                            if (visibleRoles.indexOf(intervalRole) < 0) {
                                updateVisibleRoles([...visibleRoles, intervalRole])
                            } else {
                                const nextRoles = visibleRoles.filter(role => role !== intervalRole)
                                updateVisibleRoles(nextRoles.length > 0 ? nextRoles : ADJUSTABLE_INTERVAL_ROLES)
                            }
                        }}
                                color={visibleRoles.some(role => role === intervalRole) ? "success" : "secondary"}
                        >
                            {intervalRoleName(intervalRole)}
                            <FaCircle style={{color: roleColorString(intervalRole)}}/>
                        </Button>
                    ))}
                </ButtonGroup>
            )
        default:
            return <span>?</span>
    }
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
        <div className="text-right">
            <ButtonGroup className="my-1">
                <Button disabled={disabled} onClick={adjustValue(true, false)}><FaPlusSquare/><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(true, true)}><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(false, true)}><FaMinusSquare/></Button>
                <Button disabled={disabled}
                        onClick={adjustValue(false, false)}><FaMinusSquare/><FaMinusSquare/></Button>
            </ButtonGroup>
            <br/>
            <ButtonGroup>
                <Button>{intervalRoleName(intervalRole)} = [{floatString(defaultLength())}]</Button>
            </ButtonGroup>
        </div>
    )
}

