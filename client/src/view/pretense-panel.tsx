/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCircle, FaDotCircle, FaHandPointUp } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { FabricFeature, SurfaceCharacter } from "../fabric/fabric-engine"
import {
    DENSITY,
    DensityCharacter,
    DRAG,
    DragCharacter,
    enumValues,
    GRAVITY,
    GravityCharacter,
    IFabricState,
} from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { LifePhasePanel } from "./life-phase-panel"
import { StrainPanel } from "./strain-panel"

export function PretensePanel({fabric, fabricState, setFabricState, rebuild}: {
    fabric: TensegrityFabric,
    fabricState: IFabricState,
    setFabricState: (fabricState: IFabricState) => void,
    rebuild: () => void,
}): JSX.Element {

    const [gravityCharacter, setGravityCharacter] = useState(GravityCharacter.Light)
    const [surfaceCharacter, setSurfaceCharacter] = useState(SurfaceCharacter.Sticky)
    const [dragCharacter, setDragCharacter] = useState(DragCharacter.Light)
    const [densityCharacter, setDensityCharacter] = useState(DensityCharacter.Push5Pull1)
    useEffect(() => fabric.instance.setFeatureValue(FabricFeature.Gravity, GRAVITY[gravityCharacter]), [gravityCharacter])
    useEffect(() => fabric.instance.engine.setSurfaceCharacter(surfaceCharacter), [surfaceCharacter])
    useEffect(() => fabric.instance.setFeatureValue(FabricFeature.Drag, DRAG[dragCharacter]), [dragCharacter])
    useEffect(() => {
        fabric.instance.setFeatureValue(FabricFeature.PullMass, DENSITY[densityCharacter].pull)
        fabric.instance.setFeatureValue(FabricFeature.PushMass, DENSITY[densityCharacter].push)
    }, [densityCharacter])

    function ViewButton({pushes, pulls}: { pushes: boolean, pulls: boolean }): JSX.Element {
        const onClick = () => {
            setFabricState({...fabricState, showPulls: pulls, showPushes: pushes})
        }
        const color = pushes === fabricState.showPushes && pulls === fabricState.showPulls ? "success" : "secondary"
        return <Button style={{color: "white"}} color={color} onClick={onClick}>
            {pushes && pulls ? (<><FaHandPointUp/><span> Faces</span></>) :
                pushes ? (<><FaCircle/><span> Pushes </span></>) : (<><FaDotCircle/><span> Pulls </span></>)}
        </Button>
    }

    return (
        <div className="m-5">
            <div className="my-2">
                <h6>Gravity</h6>
                <ButtonGroup>
                    {enumValues(GravityCharacter).map(value => (
                        <Button
                            key={GravityCharacter[value]}
                            active={gravityCharacter === value}
                            onClick={() => setGravityCharacter(value)}
                        >{GravityCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Surface</h6>
                <ButtonGroup>
                    {enumValues(SurfaceCharacter).map(value => (
                        <Button
                            key={SurfaceCharacter[value]}
                            active={surfaceCharacter === value}
                            onClick={() => setSurfaceCharacter(value)}
                        >{SurfaceCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Drag</h6>
                <ButtonGroup>
                    {enumValues(DragCharacter).map(value => (
                        <Button
                            key={DragCharacter[value]}
                            active={dragCharacter === value}
                            onClick={() => setDragCharacter(value)}
                        >{DragCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Density</h6>
                <ButtonGroup>
                    {enumValues(DensityCharacter).map(value => (
                        <Button
                            key={DensityCharacter[value]}
                            active={densityCharacter === value}
                            onClick={() => setDensityCharacter(value)}
                        >{DensityCharacter[value]}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-4">
                <LifePhasePanel
                    fabric={fabric}
                    fabricState={fabricState}
                    setFabricState={setFabricState}
                    rebuild={rebuild}
                />
            </div>
            <div className="m-4 w-75">
                <ButtonGroup style={{display: "flex"}} className="my-2">
                    <ViewButton pushes={false} pulls={true}/>
                    <StrainPanel fabric={fabric} pushes={false}
                                 showPushes={fabricState.showPushes} showPulls={fabricState.showPulls}/>
                </ButtonGroup>
                <ButtonGroup style={{display: "flex"}} className="my-2">
                    <ViewButton pushes={true} pulls={true}/>
                </ButtonGroup>
                <ButtonGroup style={{display: "flex"}} className="my-2">
                    <ViewButton pushes={true} pulls={false}/>
                    <StrainPanel fabric={fabric} pushes={true}
                                 showPushes={fabricState.showPushes} showPulls={fabricState.showPulls}/>
                </ButtonGroup>
            </div>
        </div>
    )
}
