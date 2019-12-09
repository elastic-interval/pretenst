/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaCircle,
    FaCompressArrowsAlt,
    FaDownload,
    FaExpandArrowsAlt,
    FaFileCsv,
    FaFutbol,
    FaHandRock,
    FaParachuteBox,
    FaVolleyballBall,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, Stage } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVZip } from "../storage/download"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function ViewTab({floatFeatures, fabric, storedState$}: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    fabric: TensegrityFabric,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)
    const [showPushes, updateShowPushes] = useState(storedState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(storedState$.getValue().showPulls)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
            updateEllipsoids(newState.ellipsoids)
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
        })
        return () => subscription.unsubscribe()
    }, [])

    const [life, updateLife] = useState(fabric.life)
    useEffect(() => {
        const sub = fabric.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [fabric])

    function ViewButton({pushes, pulls, children}: { pushes: boolean, pulls: boolean, children: JSX.Element }): JSX.Element {
        return (
            <Button
                style={{color: "white"}}
                color={pushes === showPushes && pulls === showPulls ? "success" : "secondary"}
                onClick={() => {
                    storedState$.next(transition(storedState$.getValue(), {showPulls: pulls, showPushes: pushes}))
                }}
            >
                {children}
            </Button>
        )
    }

    return (
        <div>
            <Grouping>
                <FeaturePanel key="it" feature={floatFeatures[FabricFeature.IterationsPerFrame]} disabled={ellipsoids}/>
                <FeaturePanel key="ic" feature={floatFeatures[FabricFeature.IntervalCountdown]} disabled={ellipsoids}/>
            </Grouping>
            <Grouping>
                <ButtonGroup className="w-100 my-2">
                    <ViewButton pushes={true} pulls={true}>
                        <span><FaFutbol/> All</span>
                    </ViewButton>
                    <ViewButton pushes={false} pulls={true}>
                        <span><FaVolleyballBall/> Pulls</span>
                    </ViewButton>
                    <ViewButton pushes={true} pulls={false}>
                        <span><FaExpandArrowsAlt/> Pushes</span>
                    </ViewButton>
                    <ViewButton pushes={false} pulls={false}>
                        <span><FaCircle/> Roles</span>
                    </ViewButton>
                </ButtonGroup>
                <FeaturePanel key="sthresh" feature={floatFeatures[FabricFeature.SlackThreshold]} disabled={false}/>
            </Grouping>
            <Grouping>
                <FeaturePanel key="pushrad" feature={floatFeatures[FabricFeature.PushRadiusFactor]}
                              disabled={!ellipsoids}/>
                <FeaturePanel key="pullrad" feature={floatFeatures[FabricFeature.PullRadiusFactor]}
                              disabled={!ellipsoids}/>
            </Grouping>
            <Grouping>
                <ButtonGroup className="w-100">
                    <Button disabled={life.stage !== Stage.Realized}
                            onClick={() => fabric.instance.engine.setAltitude(1)}>
                        <FaHandRock/> Nudge
                    </Button>
                    <Button disabled={life.stage !== Stage.Realized}
                            onClick={() => fabric.instance.engine.setAltitude(10)}>
                        <FaParachuteBox/> Drop
                    </Button>
                    <Button disabled={ellipsoids}
                            onClick={() => fabric.instance.engine.centralize()}>
                        <FaCompressArrowsAlt/> Centralize
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <ButtonGroup vertical={true} className="w-100">
                    <Button onClick={() => saveCSVZip(fabric)}>
                        <FaDownload/> Download CSV <FaFileCsv/>
                    </Button>
                </ButtonGroup>
            </Grouping>
        </div>
    )
}
