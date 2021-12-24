/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaCircle, FaMinusSquare, FaPlusSquare } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { ADJUSTABLE, floatString, IRole, PULL_A } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval } from "../fabric/tensegrity-types"
import { Twist } from "../fabric/twist"
import { ViewMode, viewModeAtom, visibleRolesAtom } from "../storage/recoil"

import { roleColorString } from "./materials"

export function TopRight({tensegrity, selected}: {
    tensegrity: Tensegrity,
    selected: Twist | undefined,
}): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [visibleRoles, updateVisibleRoles] = useRecoilState(visibleRolesAtom)
    const [currentRole, updateCurrentRole] = useState(PULL_A)

    const adjustSelection = (up: boolean) => () => {
        const factor = 1.03
        if (selected) {
            const parts = selected.pulls.concat(selected.adjacentPulls)
            parts.forEach(interval => tensegrity.changeIntervalScale(interval, up ? factor : (1 / factor)))
        }
    }

    switch (viewMode) {
        case ViewMode.Time:
            return (
                <>
                    <ButtonGroup>{
                        ADJUSTABLE.map((role, index) => (
                            <Button key={`IntervalRole[${index}]`}
                                    onClick={() => updateCurrentRole(role)}
                                    color={currentRole.intervalRole === role.intervalRole ? "success" : "secondary"}
                            >
                                {role.name}
                            </Button>
                        ))
                    }</ButtonGroup>
                    <RoleLengthAdjuster tensegrity={tensegrity} role={currentRole}/>
                </>
            )
        case ViewMode.Select:
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
        case ViewMode.Look:
            return (
                <ButtonGroup>
                    {ADJUSTABLE.map(({intervalRole, name}) => (
                        <Button key={`viz${intervalRole}`} onClick={() => {
                            if (visibleRoles.indexOf(intervalRole) < 0) {
                                updateVisibleRoles([...visibleRoles, intervalRole])
                            } else {
                                const nextRoles = visibleRoles.filter(vr => vr !== intervalRole)
                                updateVisibleRoles(nextRoles.length > 0 ? nextRoles : ADJUSTABLE.map(s => s.intervalRole))
                            }
                        }}
                                color={visibleRoles.some(vr => vr === intervalRole) ? "success" : "secondary"}
                        >
                            {name}
                            <FaCircle style={{color: roleColorString(intervalRole)}}/>
                        </Button>
                    ))}
                </ButtonGroup>
            )
        default:
            return <span>?</span>
    }
}

function RoleLengthAdjuster({tensegrity, role, disabled}: {
    tensegrity: Tensegrity,
    role: IRole,
    disabled?: boolean,
}): JSX.Element {

    function intervals(): IInterval[] {
        return tensegrity.intervals.filter(interval => interval.role.intervalRole === role.intervalRole)
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
                <Button>{role.name} = [{floatString(role.length)}]</Button>
            </ButtonGroup>
        </div>
    )
}

