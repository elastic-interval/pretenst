/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCircle, FaDotCircle, FaEye, FaHandPointUp } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { IFabricState } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { FeaturePanel } from "./feature-panel"
import { StrainPanel } from "./strain-panel"

export function ExplorePanel({fabric, features, fabricState$}: {
    fabric: TensegrityFabric,
    features: FloatFeature[],
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {

    const [showPushes, updateShowPushes] = useState(fabricState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(fabricState$.getValue().showPulls)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
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

    return (
        <div className="my-2 w-100">
            <div className="text-center">
                <h2><FaEye/> View <FaEye/></h2>
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
                <FeaturePanel feature={features[FabricFeature.MaxStiffness]} mutable={true}/>
            </div>
        </div>
    )
}
