/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp,
    FaCircle,
    FaDotCircle,
    FaEye,
    FaGlobe, FaHammer,
    FaHandPointUp,
    FaTimesCircle,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, SurfaceCharacter } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { DragCharacter, enumValues, GravityCharacter, IFabricState, LifePhase } from "../fabric/fabric-state"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { FeaturePanel } from "./feature-panel"
import { LifePhasePanel } from "./life-phase-panel"
import { StrainPanel } from "./strain-panel"

export function PretensePanel({fabric, selectedBrick, features, fabricState$, lifePhase$}: {
    fabric: TensegrityFabric,
    selectedBrick?: IBrick,
    features: FloatFeature[],
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const [gravityCharacter, updateGravityCharacter] = useState(fabricState$.getValue().gravityCharacter)
    const [surfaceCharacter, updateSurfaceCharacter] = useState(fabricState$.getValue().surfaceCharacter)
    const [dragCharacter, updateDragCharacter] = useState(fabricState$.getValue().dragCharacter)
    const [showPushes, updateShowPushes] = useState(fabricState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(fabricState$.getValue().showPulls)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateGravityCharacter(newState.gravityCharacter)
            updateSurfaceCharacter(newState.surfaceCharacter)
            updateDragCharacter(newState.dragCharacter)
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
        })
        return () => subscription.unsubscribe()
    })

    function ViewButton({pushes, pulls}: { pushes: boolean, pulls: boolean }): JSX.Element {
        const onClick = () => {
            const nonce = fabricState$.getValue().nonce + 1
            fabricState$.next({...fabricState$.getValue(), nonce, showPulls: pulls, showPushes: pushes})
        }
        const color = pushes === showPushes && pulls === showPulls ? "success" : "secondary"
        return <Button style={{color: "white"}} color={color} onClick={onClick}>
            {pushes && pulls ? (<><FaHandPointUp/><span> Faces</span></>) :
                pushes ? (<><FaCircle/><span> Pushes </span></>) : (<><FaDotCircle/><span> Pulls </span></>)}
        </Button>
    }

    const adjustValue = (up: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
            return up ? factor : (1 / factor)
        }

        fabric.forEachSelected(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment())
        })
    }

    return (
        <div className="m-5">
            <div className="text-center">
                <h2><FaGlobe/> Environment <FaGlobe/></h2>
            </div>
            <div className="my-2">
                <h6>Gravity</h6>
                <ButtonGroup className="w-100">
                    {enumValues(GravityCharacter).map(value => (
                        <Button
                            key={GravityCharacter[value]}
                            active={gravityCharacter === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, gravityCharacter: value})
                            }}
                        >{GravityCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Drag</h6>
                <ButtonGroup className="w-100">
                    {enumValues(DragCharacter).map(value => (
                        <Button
                            key={DragCharacter[value]}
                            active={dragCharacter === value}
                            onClick={() => {
                                const nonce = fabricState$.getValue().nonce + 1
                                fabricState$.next({...fabricState$.getValue(), nonce, dragCharacter: value})
                            }}
                        >{DragCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
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
            <div className="my-5 w-100">
                <LifePhasePanel
                    fabric={fabric}
                    lifePhase$={lifePhase$}
                />
                <div style={{backgroundColor: "white", borderRadius: "1em"}} className="my-2 p-1">
                    <FeaturePanel feature={features[FabricFeature.PretenseFactor]} mutable={true}/>
                    <FeaturePanel feature={features[FabricFeature.PretenseIntensity]} mutable={true}/>
                    <FeaturePanel feature={features[FabricFeature.PretenseTicks]} mutable={true}/>
                </div>
            </div>
            <div className="my-5 w-100">
                {selectedBrick ? (
                    <>
                        <div className="text-center">
                            <h2><FaEye/> Editing <FaHammer/></h2>
                        </div>
                        <ButtonGroup className="m-4 w-75">
                            <Button disabled={!fabric.splitIntervals} onClick={adjustValue(true)}>
                                <FaArrowUp/><span> Bigger</span>
                            </Button>
                            <Button disabled={!fabric.splitIntervals} onClick={adjustValue(false)}>
                                <FaArrowDown/><span> Smaller</span>
                            </Button>
                            <Button onClick={() => fabric.clearSelection()}>
                                <FaTimesCircle/>
                            </Button>
                        </ButtonGroup>
                    </>
                ) : (
                    <>
                        <div className="text-center">
                            <h1><FaEye/> Aspect <FaEye/></h1>
                        </div>
                        <ButtonGroup style={{display: "flex"}} className="my-2">
                            <ViewButton pushes={false} pulls={true}/>
                            <StrainPanel fabric={fabric} pushes={false}
                                         showPushes={showPushes} showPulls={showPulls}/>
                        </ButtonGroup>
                        <ButtonGroup style={{display: "flex"}} className="my-2">
                            <ViewButton pushes={true} pulls={true}/>
                        </ButtonGroup>
                        <ButtonGroup style={{display: "flex"}} className="my-2">
                            <ViewButton pushes={true} pulls={false}/>
                            <StrainPanel fabric={fabric} pushes={true}
                                         showPushes={showPushes} showPulls={showPulls}/>
                        </ButtonGroup>
                        <div style={{backgroundColor: "white", borderRadius: "1em"}} className="my-2 p-1">
                            <FeaturePanel feature={features[FabricFeature.MaxElastic]} mutable={true}/>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
