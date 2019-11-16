/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaGlobe, FaSearchMinus, FaSearchPlus } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { SurfaceCharacter } from "../fabric/fabric-engine"
import {
    DragLevel,
    enumValues,
    GravityLevel,
    IFabricState,
    LifePhase,
    PretenseFactor,
    PretenseSpeed,
    PushStrainFactor,
    transition,
} from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { LifePhasePanel } from "./life-phase-panel"
import { StrainPanel } from "./strain-panel"

export function OptimizePanel({fabric, app$, lifePhase$, rebuild}: {
    fabric: TensegrityFabric,
    app$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    rebuild: () => void,
}): JSX.Element {
    const [fabricState, updateFabricState] = useState(app$.getValue())
    useEffect(() => {
        const subscription = app$.subscribe(newState => {
            updateFabricState(newState)
        })
        return () => subscription.unsubscribe()
    }, [])

    function changeState(changed: Partial<IFabricState>): void {
        app$.next(transition(app$.getValue(), changed))
    }

    return (
        <div className="m-4">
            <div className="my-2 w-100">
                <LifePhasePanel
                    fabric={fabric}
                    lifePhase$={lifePhase$}
                    rebuild={rebuild}
                    disabled={fabricState.ellipsoids || fabricState.faceSelection}
                />
            </div>
            <div className="text-center">
                <h4><FaGlobe/> Environment <FaGlobe/></h4>
            </div>
            <div className="my-1">
                <div>Gravity</div>
                <ButtonGroup className="w-100">
                    {enumValues(GravityLevel).map(value => (
                        <Button
                            key={GravityLevel[value]}
                            active={fabricState.gravityLevel === value}
                            onClick={() => changeState({gravityLevel: value})}
                        >{GravityLevel[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <div>Surface</div>
                <ButtonGroup className="w-100">
                    {enumValues(SurfaceCharacter).map(value => (
                        <Button
                            key={SurfaceCharacter[value]}
                            active={fabricState.surfaceCharacter === value}
                            onClick={() => changeState({surfaceCharacter: value})}
                        >{SurfaceCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <div>Drag</div>
                <ButtonGroup className="w-100">
                    {enumValues(DragLevel).map(value => (
                        <Button
                            size="sm"
                            key={DragLevel[value]}
                            active={fabricState.dragLevel === value}
                            onClick={() => changeState({dragLevel: value})}
                        >{DragLevel[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <div>Pretense Size</div>
                <ButtonGroup className="w-100">
                    {enumValues(PretenseFactor).map(value => (
                        <Button
                            key={PretenseFactor[value]}
                            size="sm"
                            active={fabricState.pretenseFactor === value}
                            onClick={() => changeState({pretenseFactor: value})}
                        >{PretenseFactor[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <div>Pretense Speed</div>
                <ButtonGroup className="w-100">
                    {enumValues(PretenseSpeed).map(value => (
                        <Button
                            key={PretenseSpeed[value]}
                            size="sm"
                            active={fabricState.pretenseSpeed === value}
                            onClick={() => changeState({pretenseSpeed: value})}
                        >{PretenseSpeed[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <div>Push Strain Factor</div>
                <ButtonGroup className="w-100">
                    {enumValues(PushStrainFactor).map(value => (
                        <Button
                            key={PushStrainFactor[value]}
                            size="sm"
                            active={fabricState.pushStrainFactor === value}
                            onClick={() => changeState({pushStrainFactor: value})}
                        >{PushStrainFactor[value]}</Button>
                    ))}
                </ButtonGroup>
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
