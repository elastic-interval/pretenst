/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaDownload, FaEye, FaFile, FaFileCsv, FaRunning } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import {
    ADJUSTABLE_INTERVAL_ROLES,
    intervalRoleName,
    JOINT_RADIUS,
    PULL_RADIUS,
    PUSH_RADIUS,
} from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IFabricOutput, saveCSVZip, saveJSONZip } from "../storage/download"
import { ViewMode, viewModeAtom, visibleRolesAtom } from "../storage/recoil"

import { Grouping } from "./control-tabs"
import { roleColorString } from "./materials"

export function FrozenTab({tensegrity}: {
    tensegrity?: Tensegrity,
}): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [visibleRoles, updateVisibleRoles] = useRecoilState(visibleRolesAtom)

    function getFabricOutput(): IFabricOutput {
        if (!tensegrity) {
            throw new Error("No tensegrity")
        }
        return tensegrity.getFabricOutput(PUSH_RADIUS, PULL_RADIUS, JOINT_RADIUS)
    }

    const disabled = viewMode !== ViewMode.Frozen
    return (
        <>
            <Grouping>
                <h6 className="w-100 text-center"><FaEye/> Show/Hide</h6>
                <div>Roles</div>
                <ButtonGroup size="sm" className="w-100 my-2">
                    {ADJUSTABLE_INTERVAL_ROLES.map(intervalRole => (
                        <Button
                            key={`viz${intervalRole}`}
                            style={{backgroundColor: visibleRoles.indexOf(intervalRole) >= 0 ? roleColorString(intervalRole) : "#747474"}}
                            disabled={viewMode !== ViewMode.Frozen}
                            onClick={() => {
                                if (visibleRoles.indexOf(intervalRole) < 0) {
                                    updateVisibleRoles([...visibleRoles, intervalRole])
                                } else {
                                    updateVisibleRoles(visibleRoles.filter(role => role !== intervalRole))
                                }
                            }}
                        >
                            {intervalRoleName(intervalRole)}
                        </Button>
                    ))}
                </ButtonGroup>
            </Grouping>
            {!tensegrity ? undefined : (
                <Grouping>
                    <h6 className="w-100 text-center"><FaRunning/> Take</h6>
                    <ButtonGroup vertical={false} className="w-100 my-2">
                        <Button onClick={() => saveCSVZip(getFabricOutput())} disabled={disabled}>
                            <FaDownload/> Download CSV <FaFileCsv/>
                        </Button>
                        <Button onClick={() => saveJSONZip(getFabricOutput())} disabled={disabled}>
                            <FaDownload/> Download JSON <FaFile/>
                        </Button>
                    </ButtonGroup>
                </Grouping>
            )}
        </>
    )
}
