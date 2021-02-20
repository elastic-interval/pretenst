/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaEye } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { ViewMode, viewModeAtom } from "../storage/recoil"

import { ScriptPanel } from "./script-panel"
import { STAGE_TRANSITIONS, StageButton } from "./stage-button"

export function TopLeft({tensegrity, runTenscript}: {
    tensegrity: Tensegrity,
    runTenscript: RunTenscript,
}): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [showScriptPanel, setShowScriptPanel] = useState(false)
    return (
        <>
            <Button
                color={showScriptPanel ? "warning" : "secondary"}
                onClick={() => setShowScriptPanel(!showScriptPanel)}>
                <FaEye/>
            </Button>
            <ButtonGroup>{
                STAGE_TRANSITIONS
                    .map(stageTransition => (
                        <StageButton
                            key={`strans-${stageTransition}`}
                            tensegrity={tensegrity}
                            stageTransition={stageTransition}
                            disabled={viewMode === ViewMode.Frozen}/>
                    ))
            }</ButtonGroup>
            {!showScriptPanel ? undefined : <ScriptPanel runTenscript={runTenscript}/>}
        </>
    )
}

