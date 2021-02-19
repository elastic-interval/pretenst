/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaDownload, FaFile, FaFileCsv, FaRunning } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { JOINT_RADIUS, PULL_RADIUS, PUSH_RADIUS } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IFabricOutput, saveCSVZip, saveJSONZip } from "../storage/download"
import { ViewMode, viewModeAtom } from "../storage/recoil"

import { Grouping } from "./control-tabs"

export function FrozenTab({tensegrity}: {
    tensegrity?: Tensegrity,
}): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)

    function getFabricOutput(): IFabricOutput {
        if (!tensegrity) {
            throw new Error("No tensegrity")
        }
        return tensegrity.getFabricOutput(PUSH_RADIUS, PULL_RADIUS, JOINT_RADIUS)
    }

    const disabled = viewMode !== ViewMode.Frozen
    return (
        <>
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
