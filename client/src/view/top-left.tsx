/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { Tensegrity } from "../fabric/tensegrity"
import { ViewMode, viewModeAtom } from "../storage/recoil"

import { STAGE_TRANSITIONS, StageButton } from "./stage-button"

export function TopLeft({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    return (
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
    )
}

