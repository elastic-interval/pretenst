/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, Stage, SurfaceCharacter } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { enumValues, IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { LifeStagePanel } from "./life-stage-panel"
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

    return (
        <div>
            <Grouping>
                <LifeStagePanel
                    fabric={fabric}
                    beforeSlack={false}
                    disabled={ellipsoids || shapeSelection !== ShapeSelection.None}
                />
            </Grouping>
            <Grouping>
                <div className="float-right" style={{
                    color: disabled() ? "gray" : "white",
                }}>
                    {SurfaceCharacter[storedState.surfaceCharacter]}
                </div>
                <div>Surface</div>
                <ButtonGroup className="w-100">
                    {enumValues(SurfaceCharacter).map(value => (
                        <Button
                            key={SurfaceCharacter[value]}
                            disabled={disabled()}
                            active={storedState.surfaceCharacter === value}
                            onClick={() => changeState({surfaceCharacter: value})}
                        >{SurfaceCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
                <FeaturePanel feature={floatFeatures[FabricFeature.Gravity]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.Drag]} disabled={disabled()}/>
            </Grouping>
            <Grouping>
                <FeaturePanel feature={floatFeatures[FabricFeature.PushOverPull]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.PretenstFactor]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.PretenstCountdown]} disabled={disabled()}/>
            </Grouping>
        </div>
    )
}
