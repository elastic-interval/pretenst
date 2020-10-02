/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState, transition, ViewMode } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { StageButton, StageTransition } from "./stage-button"

export function PhaseTab({worldFeatures, tensegrity, storedState$}: {
    worldFeatures: Record<WorldFeature, FloatFeature>,
    tensegrity: Tensegrity,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [storedState, updateStoredState] = useState(storedState$.getValue())
    const [viewMode, updateViewMode] = useState(storedState$.getValue().viewMode)
    useEffect(() => {
        const subscriptions = [
            storedState$.subscribe(newState => {
                updateViewMode(newState.viewMode)
                updateStoredState(newState)
            }),
        ]
        return () => subscriptions.forEach(sub => sub.unsubscribe())
    }, [])

    const disabled = viewMode === ViewMode.Frozen
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
                <FeaturePanel key="pc" feature={worldFeatures[WorldFeature.PretensingCountdown]}/>
                <div>Surface</div>
                <ButtonGroup size="sm" className="w-100 my-2">
                    {Object.keys(SurfaceCharacter).map(key => (
                        <Button
                            key={`SurfaceCharacter[${key}]`}
                            active={storedState.surfaceCharacter === SurfaceCharacter[key]}
                            onClick={() => transition(storedState$, {surfaceCharacter: SurfaceCharacter[key]})}
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
