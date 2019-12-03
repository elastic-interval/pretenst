/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, SurfaceCharacter } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { enumValues, IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { StrainPanel } from "./strain-panel"

export function RealizePanel({floatFeatures, fabric, storedState$}: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    fabric: TensegrityFabric,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [storedState, updateFabricState] = useState(storedState$.getValue())
    useEffect(() => {
        const subscriptions = [
            storedState$.subscribe(newState => updateFabricState(newState)),
        ]
        return () => subscriptions.forEach(s => s.unsubscribe())
    }, [])

    function changeState(changed: Partial<IStoredState>): void {
        storedState$.next(transition(storedState$.getValue(), changed))
    }

    return (
        <div>
            <Grouping>
                <div className="float-right text-white">
                    {SurfaceCharacter[storedState.surfaceCharacter]}
                </div>
                <div>Surface</div>
                <ButtonGroup className="w-100">
                    {enumValues(SurfaceCharacter).map(value => (
                        <Button
                            key={SurfaceCharacter[value]}
                            active={storedState.surfaceCharacter === value}
                            onClick={() => changeState({surfaceCharacter: value})}
                        >{SurfaceCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
                <FeaturePanel feature={floatFeatures[FabricFeature.Gravity]} disabled={false}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.Drag]} disabled={false}/>
            </Grouping>
            <Grouping>
                <FeaturePanel feature={floatFeatures[FabricFeature.PushOverPull]} disabled={false}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.PretenstFactor]} disabled={false}/>
            </Grouping>
            <Grouping>
                <div className="my-2">
                    <div>Pull Strain Range</div>
                    <StrainPanel fabric={fabric} pushes={false}/>
                </div>
                <div className="my-2">
                    <div>Push Strain Range</div>
                    <StrainPanel fabric={fabric} pushes={true}/>
                </div>
            </Grouping>
        </div>
    )
}
