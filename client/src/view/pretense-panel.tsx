/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCircle, FaDotCircle, FaHandPointUp } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { SurfaceCharacter } from "../fabric/fabric-engine"
import { LifePhase } from "../fabric/life-phase"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { LifePhasePanel } from "./life-phase-panel"
import { StrainPanel } from "./strain-panel"

enum GravityCharacter {
    Light = "Light",
    Heavy = "Heavy",
    Space = "Space",
}

enum DragCharacter {
    Light = "Light",
    Heavy = "Heavy",
    Free = "Free",
}

enum DensityCharacter {
    Push5Pull1 = "Push5Pull1",
    Push2Pull1 = "Push2Pull1",
    Push1Pull1 = "Push1Pull1",
}

export function PretensePanel({fabric, lifePhase$, pretensingStep$, showPushes, setShowPushes, showPulls, setShowPulls, rebuild}: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject<LifePhase>,
    pretensingStep$: BehaviorSubject<number>,
    showPushes: boolean,
    setShowPushes: (value: boolean) => void,
    showPulls: boolean,
    setShowPulls: (value: boolean) => void,
    rebuild: () => void,
}): JSX.Element {

    const [gravityCharacter, setGravityCharacter] = useState(GravityCharacter.Light)
    const [surfaceCharacter, setSurfaceCharacter] = useState(SurfaceCharacter.Sticky)
    const [dragCharacter, setDragCharacter] = useState(DragCharacter.Light)
    const [densityCharacter, setDensityCharacter] = useState(DensityCharacter.Push5Pull1)

    useEffect(() => fabric.instance.engine.setSurfaceCharacter(surfaceCharacter), [surfaceCharacter])

    function ViewButton({pushes, pulls}: { pushes: boolean, pulls: boolean }): JSX.Element {
        const onClick = () => {
            setShowPushes(pushes)
            setShowPulls(pulls)
        }
        const color = pushes === showPushes && pulls === showPulls ? "success" : "secondary"
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
                    {Object.keys(GravityCharacter).map(key => (
                        <Button
                            key={key}
                            active={gravityCharacter === GravityCharacter[key]}
                            onClick={() => setGravityCharacter(GravityCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Surface</h6>
                <ButtonGroup>
                    {Object.keys(SurfaceCharacter).filter(k => k.length > 1).map(key => (
                        <Button
                            key={key}
                            active={surfaceCharacter === SurfaceCharacter[key]}
                            onClick={() => setSurfaceCharacter(SurfaceCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Drag</h6>
                <ButtonGroup>
                    {Object.keys(DragCharacter).map(key => (
                        <Button
                            key={key}
                            active={dragCharacter === DragCharacter[key]}
                            onClick={() => setDragCharacter(DragCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-2">
                <h6>Density</h6>
                <ButtonGroup>
                    {Object.keys(DensityCharacter).map(key => (
                        <Button
                            key={key}
                            active={densityCharacter === DensityCharacter[key]}
                            onClick={() => setDensityCharacter(DensityCharacter[key])}
                        >{key}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="my-4">
                <LifePhasePanel
                    fabric={fabric}
                    lifePhase$={lifePhase$}
                    pretensingStep$={pretensingStep$}
                    rebuild={rebuild}
                />
            </div>
            <div className="m-4 w-75">
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
            </div>
        </div>
    )
}
