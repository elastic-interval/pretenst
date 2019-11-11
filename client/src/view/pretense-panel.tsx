/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaGlobe } from "react-icons/all"
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
} from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { LifePhasePanel } from "./life-phase-panel"

export function PretensePanel({fabric, fabricState$, lifePhase$}: {
    fabric: TensegrityFabric,
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const [surfaceCharacter, updateSurfaceCharacter] = useState(fabricState$.getValue().surfaceCharacter)
    const [gravityLevel, updateGravityLevel] = useState(fabricState$.getValue().gravityLevel)
    const [dragLevel, updateDragLevel] = useState(fabricState$.getValue().dragLevel)
    const [pretenseSize, updatePretenseSize] = useState(fabricState$.getValue().pretenseFactor)
    const [pretenseSpeed, updatePretenseSpeed] = useState(fabricState$.getValue().pretenseSpeed)
    const [pushStrainFactor, updatePushStrainFactor] = useState(fabricState$.getValue().pushStrainFactor)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateGravityLevel(newState.gravityLevel)
            updateDragLevel(newState.dragLevel)
            updateSurfaceCharacter(newState.surfaceCharacter)
            updatePretenseSize(newState.pretenseFactor)
            updatePretenseSpeed(newState.pretenseSpeed)
            updatePushStrainFactor(newState.pushStrainFactor)
        })
        return () => subscription.unsubscribe()
    })

    return (
        <div className="m-2">
            <div className="my-2 w-100">
                <LifePhasePanel
                    fabric={fabric}
                    lifePhase$={lifePhase$}
                />
            </div>
            <div className="text-center">
                <h2><FaGlobe/> Environment <FaGlobe/></h2>
            </div>
            <div className="my-1">
                <h6>Gravity</h6>
                <ButtonGroup className="w-100">
                    {enumValues(GravityLevel).map(value => (
                        <Button
                            key={GravityLevel[value]}
                            active={gravityLevel === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, gravityLevel: value})
                            }}
                        >{GravityLevel[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <h6>Drag</h6>
                <ButtonGroup className="w-100">
                    {enumValues(DragLevel).map(value => (
                        <Button
                            key={DragLevel[value]}
                            active={dragLevel === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, dragLevel: value})
                            }}
                        >{DragLevel[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <h6>Surface</h6>
                <ButtonGroup className="w-100">
                    {enumValues(SurfaceCharacter).map(value => (
                        <Button
                            key={SurfaceCharacter[value]}
                            active={surfaceCharacter === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, surfaceCharacter: value})
                            }}
                        >{SurfaceCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <h6>Pretense Size</h6>
                <ButtonGroup className="w-100">
                    {enumValues(PretenseFactor).map(value => (
                        <Button
                            key={PretenseFactor[value]}
                            active={pretenseSize === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, pretenseFactor: value})
                            }}
                        >{PretenseFactor[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <h6>Pretense Speed</h6>
                <ButtonGroup className="w-100">
                    {enumValues(PretenseSpeed).map(value => (
                        <Button
                            key={PretenseSpeed[value]}
                            active={pretenseSpeed === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, pretenseSpeed: value})
                            }}
                        >{PretenseSpeed[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-1">
                <h6>Push Strain Factor</h6>
                <ButtonGroup className="w-100">
                    {enumValues(PushStrainFactor ).map(value => (
                        <Button
                            key={PushStrainFactor[value]}
                            active={pushStrainFactor === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, pushStrainFactor: value})
                            }}
                        >{PushStrainFactor[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
        </div>
    )
}
