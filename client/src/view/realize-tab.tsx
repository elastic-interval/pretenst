/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, Stage, SurfaceCharacter } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowAltCircleRight, FaBalanceScale, FaGlobe } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { LifeStageButton, StageTransition } from "./life-stage-button"
import { ShapeSelection } from "./shape-tab"

export function RealizeTab({floatFeatures, fabric, shapeSelection, storedState$}: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    fabric: TensegrityFabric,
    shapeSelection: ShapeSelection,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [storedState, updateFabricState] = useState(storedState$.getValue())
    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)
    useEffect(() => {
        const subscriptions = [
            storedState$.subscribe(newState => {
                updateEllipsoids(storedState.ellipsoids)
                updateFabricState(newState)
            }),
        ]
        return () => subscriptions.forEach(s => s.unsubscribe())
    }, [])

    const [life, updateLife] = useState(fabric.life)
    useEffect(() => {
        const sub = fabric.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [fabric])

    function disabled(): boolean {
        return ellipsoids || shapeSelection !== ShapeSelection.None || life.stage < Stage.Slack
    }

    function changeState(changed: Partial<IStoredState>): void {
        storedState$.next(transition(storedState$.getValue(), changed))
    }

    function disabledLifeStage(): boolean {
        return ellipsoids || shapeSelection !== ShapeSelection.None
    }

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaArrowAltCircleRight/> Phase</h6>
                <LifeStageButton
                    fabric={fabric}
                    stageTransition={StageTransition.SlackToRealizing}
                    disabled={disabledLifeStage()}
                />
                <LifeStageButton
                    fabric={fabric}
                    stageTransition={StageTransition.CaptureRealizedToSlack}
                    disabled={disabledLifeStage()}
                />
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaGlobe/> Environment</h6>
                <FeaturePanel feature={floatFeatures[FabricFeature.PretenstFactor]} disabled={disabled()}/>
                <div className="float-right" style={{
                    color: disabled() ? "gray" : "white",
                }}>
                    {SurfaceCharacter[storedState.surfaceCharacter]}
                </div>
                <div>Surface</div>
                <ButtonGroup size="sm" className="w-100">
                    {Object.keys(SurfaceCharacter).map(key => (
                        <Button
                            key={`SurfaceCharacter[${key}]`}
                            disabled={disabled()}
                            active={storedState.surfaceCharacter === SurfaceCharacter[key]}
                            onClick={() => changeState({surfaceCharacter: SurfaceCharacter[key]})}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
                <FeaturePanel feature={floatFeatures[FabricFeature.Gravity]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.Drag]} disabled={disabled()}/>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaBalanceScale/> Compression vs Tension</h6>
                <LifeStageButton
                    fabric={fabric}
                    stageTransition={StageTransition.CaptureStrainForStiffness}
                    disabled={disabledLifeStage()}
                />
                <FeaturePanel feature={floatFeatures[FabricFeature.PushOverPull]} disabled={disabled()}/>
            </Grouping>
        </div>
    )
}
