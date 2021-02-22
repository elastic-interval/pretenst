/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaEye, FaHiking, FaPlay, FaRecycle } from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { useRecoilState, useSetRecoilState } from "recoil"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { bootstrapIndexAtom, demoModeAtom, tenscriptAtom, ViewMode, viewModeAtom } from "../storage/recoil"

import { ScriptPanel } from "./script-panel"
import { STAGE_TRANSITIONS, StageButton } from "./stage-button"

export function TopLeft({tensegrity, runTenscript}: {
    tensegrity: Tensegrity,
    runTenscript: RunTenscript,
}): JSX.Element {
    const setDemoMode = useSetRecoilState(demoModeAtom)
    const [viewMode] = useRecoilState(viewModeAtom)
    const setBootstrapIndex = useSetRecoilState(bootstrapIndexAtom)
    const [tenscript] = useRecoilState(tenscriptAtom)

    const [showScriptPanel, setShowScriptPanel] = useState(false)
    const [bootstrapOpen, setBootstrapOpen] = useState(false)

    return (
        <>
            <ButtonGroup>{STAGE_TRANSITIONS
                .map(stageTransition => (
                    <StageButton
                        key={`strans-${stageTransition}`}
                        tensegrity={tensegrity}
                        stageTransition={stageTransition}
                        disabled={viewMode === ViewMode.Frozen}/>
                ))
            }</ButtonGroup>
            <br/>
            <ButtonGroup className="my-1">
                <Button
                    color={showScriptPanel ? "warning" : "secondary"}
                    onClick={() => setShowScriptPanel(!showScriptPanel)}>
                    <FaEye/>
                </Button>
                <Button
                    onClick={() => {
                        if (tenscript) {
                            runTenscript(tenscript, error => console.error(error))
                        }
                    }}>
                    <FaRecycle/>
                </Button>
                <ButtonDropdown
                    isOpen={bootstrapOpen}
                    toggle={() => setBootstrapOpen(!bootstrapOpen)}
                >
                    <DropdownToggle><FaHiking/></DropdownToggle>
                    <DropdownMenu>{BOOTSTRAP.map((bootstrapProgram, index) => (
                        <DropdownItem key={`Boot${index}`} onClick={() => {
                            setBootstrapIndex(index)
                            runTenscript(bootstrapProgram, () => console.error("impossible"))
                        }}>
                            {bootstrapProgram.name}
                        </DropdownItem>
                    ))}</DropdownMenu>
                </ButtonDropdown>
                <Button
                    onClick={() => setDemoMode(true)}>
                    <FaPlay/>
                </Button>
            </ButtonGroup>
            {!showScriptPanel ? undefined : <ScriptPanel runTenscript={runTenscript}/>}
        </>
    )
}

