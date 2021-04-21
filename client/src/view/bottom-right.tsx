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
    FaFutbol,
    FaParachuteBox,
    FaPlay,
    FaSignOutAlt,
    FaSyncAlt,
    FaXbox,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState, useSetRecoilState } from "recoil"

import { GlobalMode, JOINT_RADIUS, PULL_RADIUS, PUSH_RADIUS, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { getFabricOutput, saveCSVZip, saveJSONZip } from "../storage/download"
import { demoModeAtom, endDemoAtom, rotatingAtom, startDemoAtom, ViewMode, viewModeAtom } from "../storage/recoil"

export function BottomRight({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    const [viewMode] = useRecoilState(viewModeAtom)
    const [demoMode] = useRecoilState(demoModeAtom)
    const setStartDemo = useSetRecoilState(startDemoAtom)
    const setEndDemo = useSetRecoilState(endDemoAtom)
    const [rotating, setRotating] = useRecoilState(rotatingAtom)

    return demoMode ? (
        <ButtonGroup>
            <Button
                color="success"
                onClick={() => {
                    setRotating(false)
                    setEndDemo(true)
                }}
            >
                <FaSignOutAlt/> Exit demo
            </Button>
        </ButtonGroup>
    ) : (
        <ButtonGroup>
            {viewMode === ViewMode.Frozen ? (
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
            ) : (stage < Stage.Slack ? (
                <>
                    <Button
                        disabled={stage !== Stage.Shaping}
                        onClick={() => tensegrity.fabric.centralize()}>
                        <FaCompressArrowsAlt/>
                    </Button>
                </>
            ) : stage > Stage.Slack ? (
                <>
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.removeSlackPulls()}>
                        <FaXbox/>
                    </Button>
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(10)}>
                        <FaParachuteBox/>
                    </Button>
                </>
            ) : undefined)}
            <Button
                color={rotating ? "warning" : "secondary"}
                onClick={() => setRotating(!rotating)}
            >
                <FaSyncAlt/>
            </Button>
            <Button onClick={() => {setStartDemo(true)}}><FaPlay/></Button>
            <Button onClick={() => {reloadGlobalMode(GlobalMode.Sphere)}}><FaFutbol/></Button>
        </ButtonGroup>
    )
}
