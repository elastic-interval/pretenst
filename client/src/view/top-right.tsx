/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { useState } from "react"
import * as React from "react"
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
import { IInterval } from "../fabric/tensegrity-types"
import { ViewMode, viewModeAtom, visibleRolesAtom } from "../storage/recoil"

import { roleColorString } from "./materials"

export function TopRight({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [visibleRoles, updateVisibleRoles] = useRecoilState(visibleRolesAtom)
    const [currentRole, updateCurrentRole] = useState(IntervalRole.PullA)
    return viewMode === ViewMode.Frozen ? (
        <div>
            <ButtonGroup className="w-100">
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
                        <FaCircle
                            style={{color: roleColorString(intervalRole)}}
                        />
                    </Button>
                ))}
            </ButtonGroup>
        </div>
    ) : (
        <div>
            <ButtonGroup className="my-2 w-100">{
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
        <div className="text-right">
            <ButtonGroup>
                <Button disabled={disabled} onClick={adjustValue(true, false)}><FaPlusSquare/><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(true, true)}><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(false, true)}><FaMinusSquare/></Button>
                <Button disabled={disabled}
                        onClick={adjustValue(false, false)}><FaMinusSquare/><FaMinusSquare/></Button>
            </ButtonGroup>
            <br/>
            <ButtonGroup className="my-2">
                <Button>{intervalRoleName(intervalRole)} = [{floatString(defaultLength())}]</Button>
            </ButtonGroup>
        </div>
    )
}

