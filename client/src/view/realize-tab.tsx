/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, SurfaceCharacter, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowAltCircleRight, FaBalanceScale, FaGlobe } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { ShapeSelection } from "./shape-tab"
import { StageButton, StageTransition } from "./stage-button"

export function RealizeTab({worldFeatures, tensegrity, shapeSelection, storedState$}: {
    worldFeatures: Record<WorldFeature, FloatFeature>,
    tensegrity: Tensegrity,
    shapeSelection: ShapeSelection,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [storedState, updateFabricState] = useState(storedState$.getValue())
    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    useEffect(() => {
        const subscriptions = [
            storedState$.subscribe(newState => {
                updatePolygons(storedState.polygons)
                updateFabricState(newState)
            }),
        ]
        return () => subscriptions.forEach(s => s.unsubscribe())
    }, [])

    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])

    function disabled(): boolean {
        return polygons || shapeSelection !== ShapeSelection.None || stage < Stage.Slack
    }

    function disabledStage(): boolean {
        return polygons || shapeSelection !== ShapeSelection.None
    }

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaArrowAltCircleRight/> Phase</h6>
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.SlackToPretensing}
                    disabled={disabledStage()}
                />
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.CapturePretenstToSlack}
                    disabled={disabledStage()}
                />
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.SlackToShaping}
                    disabled={disabledStage()}
                />
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaGlobe/> Environment</h6>
                <div>Surface</div>
                <ButtonGroup size="sm" className="w-100">
                    {Object.keys(SurfaceCharacter).map(key => (
                        <Button
                            key={`SurfaceCharacter[${key}]`}
                            disabled={disabled()}
                            active={storedState.surfaceCharacter === SurfaceCharacter[key]}
                            onClick={() => transition(storedState$, {surfaceCharacter: SurfaceCharacter[key]})}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
                <FeaturePanel feature={worldFeatures[WorldFeature.PretenstFactor]} disabled={disabled()}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.Gravity]} disabled={disabled()}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.Drag]} disabled={disabled()}/>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaBalanceScale/> Compression vs Tension</h6>
                <StageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.CaptureStrainForStiffness}
                    disabled={disabledStage()}
                />
                <FeaturePanel feature={worldFeatures[WorldFeature.PushOverPull]} disabled={disabled()}/>
            </Grouping>
        </div>
    )
}
