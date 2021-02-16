/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, SurfaceCharacter, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { Tensegrity } from "../fabric/tensegrity"
import { surfaceCharacterAtom, ViewMode, viewModeAtom } from "../storage/recoil"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { StageButton, StageTransition } from "./stage-button"

export function PhaseTab({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {

    const [stage, updateStage] = useState(tensegrity.stage)
    const [viewMode] = useRecoilState(viewModeAtom)
    const [surfaceCharacter, updateSurfaceCharacter] = useRecoilState(surfaceCharacterAtom)
    const disabled = viewMode === ViewMode.Frozen

    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])

    return (
        <div>
            <Grouping>
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.CaptureLengthsToSlack}
                    disabled={disabled}
                />
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.SlackToShaping}
                    disabled={disabled}
                />
            </Grouping>
            <Grouping>
                <FeaturePanel key="pc" feature={WorldFeature.PretensingCountdown}
                              disabled={stage !== Stage.Slack}/>
                <div>Surface</div>
                <ButtonGroup size="sm" className="w-100 my-2">
                    {Object.keys(SurfaceCharacter).map(key => (
                        <Button
                            key={`SurfaceCharacter[${key}]`}
                            disabled={stage !== Stage.Slack}
                            active={surfaceCharacter === SurfaceCharacter[key]}
                            onClick={() => updateSurfaceCharacter(SurfaceCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.SlackToPretensing}
                    disabled={disabled}
                />
            </Grouping>
            <Grouping>
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.CapturePretenstToSlack}
                    disabled={disabled}
                />
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.CaptureStrainForStiffness}
                    disabled={disabled}
                />
            </Grouping>
        </div>
    )
}
