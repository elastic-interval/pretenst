/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaCamera,
    FaCircle,
    FaClock,
    FaCompressArrowsAlt, FaDownload,
    FaExpandArrowsAlt,
    FaEye, FaFileCsv,
    FaFutbol,
    FaHandRock,
    FaParachuteBox, FaSyncAlt,
    FaVolleyballBall,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, LifePhase } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles } from "../storage/download"
import { IStoredState, transition } from "../storage/stored-state"

import { FeaturePanel } from "./feature-panel"

export function ViewPanel({floatFeatures, fabric, storedState$, lifePhase$}: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    fabric: TensegrityFabric,
    storedState$: BehaviorSubject<IStoredState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const [rotating, updateRotating] = useState(storedState$.getValue().rotating)
    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)
    const [showPushes, updateShowPushes] = useState(storedState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(storedState$.getValue().showPulls)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
            updateRotating(newState.rotating)
            updateEllipsoids(newState.ellipsoids)
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
        })
        return () => subscription.unsubscribe()
    }, [])
    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
        return () => subscription.unsubscribe()
    }, [])

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
        <div className="m-4">
            <div className="my-3">
                <div className="text-center">
                    <h4><FaClock/> Time <FaClock/></h4>
                </div>
                <FeaturePanel feature={floatFeatures[FabricFeature.IntervalCountdown]} disabled={false}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.PretenseCountdown]} disabled={false}/>
            </div>
            <div className="my-3">
                <div className="text-center">
                    <h4><FaEye/> Appearance <FaEye/></h4>
                </div>
                <ButtonGroup vertical={true} className="w-100">
                    <ViewButton pushes={true} pulls={true}>
                        <span><FaFutbol/> Pushes and Pulls Gradient</span>
                    </ViewButton>
                    <ViewButton pushes={false} pulls={true}>
                        <span><FaVolleyballBall/> Pulls Gradient</span>
                    </ViewButton>
                    <ViewButton pushes={true} pulls={false}>
                        <span><FaExpandArrowsAlt/> Pushes Gradient</span>
                    </ViewButton>
                    <ViewButton pushes={false} pulls={false}>
                        <span><FaCircle/> Role Colors</span>
                    </ViewButton>
                </ButtonGroup>
                <ButtonGroup vertical={true} className="w-100 my-3">
                    <Button
                        color={ellipsoids ? "warning" : "secondary"}
                        onClick={() => storedState$.next(transition(storedState$.getValue(), {ellipsoids: !ellipsoids}))}
                    >
                        <FaCamera/> Frozen Detail View
                    </Button>
                    <Button
                        color={rotating ? "warning" : "secondary"}
                        onClick={() => storedState$.next(transition(storedState$.getValue(), {rotating: !rotating}))}
                    >
                        <FaSyncAlt/> Rotating View
                    </Button>
                </ButtonGroup>
            </div>
            <div className="my-3">
                <div className="text-center">
                    <h4><FaHandRock/> Disturb <FaHandRock/></h4>
                </div>
                <ButtonGroup vertical={true} className="w-100">
                    <Button disabled={lifePhase !== LifePhase.Pretenst}
                            onClick={() => fabric.instance.engine.setAltitude(1)}>
                        <FaHandRock/> Nudge
                    </Button>
                    <Button disabled={lifePhase !== LifePhase.Pretenst}
                            onClick={() => fabric.instance.engine.setAltitude(10)}>
                        <FaParachuteBox/> Drop
                    </Button>
                    <Button onClick={() => fabric.instance.engine.centralize()}>
                        <FaCompressArrowsAlt/> Centralize
                    </Button>
                </ButtonGroup>
            </div>
            <div className="my-3">
                <ButtonGroup vertical={true} className="w-100">
                    <Button onClick={() => saveCSVFiles(fabric)}>
                        <FaDownload/> Download CSV <FaFileCsv/>
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    )
}
