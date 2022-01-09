/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaCompressArrowsAlt,
    FaDownload,
    FaFile,
    FaFileCsv,
    FaParachuteBox,
    FaSignOutAlt,
    FaSyncAlt,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { getFabricOutput, saveCSVZip, saveJSONZip } from "../storage/download"
import { rotatingAtom, ViewMode, viewModeAtom } from "../storage/recoil"

const PUSH_RADIUS = 0.012
const PULL_RADIUS = 0.005
const JOINT_RADIUS = 0.015

export function BottomRight({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    const [viewMode] = useRecoilState(viewModeAtom)
    const [rotating, setRotating] = useRecoilState(rotatingAtom)

    return (
        <div className="text-right">
            <ButtonGroup>
                {viewMode !== ViewMode.Time ? (
                    <>
                        <Button
                            onClick={() => saveCSVZip(getFabricOutput(tensegrity, PUSH_RADIUS, PULL_RADIUS, JOINT_RADIUS))}>
                            <FaDownload/><FaFileCsv/>
                        </Button>
                        <Button
                            onClick={() => saveJSONZip(getFabricOutput(tensegrity, PUSH_RADIUS, PULL_RADIUS, JOINT_RADIUS))}>
                            <FaDownload/><FaFile/>
                        </Button>
                    </>
                ) : stage > Stage.Slack ? (
                    <>
                        <Button disabled={stage !== Stage.Pretenst}
                                onClick={() => tensegrity.fabric.set_altitude(10)}>
                            <FaParachuteBox/>
                        </Button>
                    </>
                ) : undefined}
                <Button onClick={() => tensegrity.fabric.centralize()}><FaCompressArrowsAlt/></Button>
                <Button
                    color={rotating ? "warning" : "secondary"}
                    onClick={() => setRotating(!rotating)}
                >
                    <FaSyncAlt/>
                </Button>
                <Button color="warning" onClick={() => reloadGlobalMode(GlobalMode.Choice)}>
                    <FaSignOutAlt/>
                </Button>
            </ButtonGroup>
        </div>
    )
}
