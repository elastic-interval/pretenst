/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCog, FaGlobe, FaSearchMinus, FaSearchPlus } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, SurfaceCharacter } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { enumValues, IFabricState, LifePhase, transition } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { FeaturePanel } from "./feature-panel"
import { LifePhasePanel } from "./life-phase-panel"
import { StrainPanel } from "./strain-panel"

export function OptimizePanel({floatFeatures, fabric, fabricState$, lifePhase$}: {
    floatFeatures: FloatFeature[],
    fabric: TensegrityFabric,
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const [fabricState, updateFabricState] = useState(fabricState$.getValue())
    useEffect(() => {
        const subscriptions = [
            fabricState$.subscribe(newState => updateFabricState(newState)),
        ]
        return () => subscriptions.forEach(s => s.unsubscribe())
    }, [])

    function changeState(changed: Partial<IFabricState>): void {
        fabricState$.next(transition(fabricState$.getValue(), changed))
    }

    return (
        <div className="m-4">
            <div className="my-2 w-100">
                <LifePhasePanel
                    fabric={fabric}
                    lifePhase$={lifePhase$}
                    fabricState$={fabricState$}
                    disabled={fabricState.ellipsoids || fabricState.selectionMode}
                />
            </div>
            <div className="my-3">
                <div className="text-center">
                    <h4><FaGlobe/> Environment <FaGlobe/></h4>
                </div>
                <div className="my-1">
                    <div className="float-right text-white">
                        {SurfaceCharacter[fabricState.surfaceCharacter]}
                    </div>
                    <div>Surface</div>
                    <ButtonGroup size="sm" className="w-100">
                        {enumValues(SurfaceCharacter).map(value => (
                            <Button
                                key={SurfaceCharacter[value]}
                                active={fabricState.surfaceCharacter === value}
                                onClick={() => changeState({surfaceCharacter: value})}
                            >{SurfaceCharacter[value]}</Button>
                        ))}
                    </ButtonGroup>
                </div>
                <FeaturePanel feature={floatFeatures[FabricFeature.Gravity]} disabled={false}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.Drag]} disabled={false}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.PushStrainFactor]} disabled={false}/>
            </div>
            <div className="my-3">
                <div className="text-center">
                    <h4><FaCog/> Behavior <FaCog/></h4>
                </div>
                <FeaturePanel feature={floatFeatures[FabricFeature.PretenseFactor]} disabled={false}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.PretenseTicks]} disabled={false}/>
            </div>
            <div className="my-3">
                <div className="text-center">
                    <h4><FaSearchMinus/> Strain <FaSearchPlus/></h4>
                </div>
                <div>
                    <div className="my-1">
                        <div>Pulls</div>
                        <StrainPanel fabric={fabric} pushes={false}/>
                    </div>
                    <div className="my-1">
                        <div>Pushes</div>
                        <StrainPanel fabric={fabric} pushes={true}/>
                    </div>
                </div>
            </div>
        </div>
    )
}
