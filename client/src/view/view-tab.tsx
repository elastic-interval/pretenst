/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole, Stage } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaCamera,
    FaCircle,
    FaClock,
    FaCompressArrowsAlt,
    FaExpandArrowsAlt,
    FaEye,
    FaFistRaised,
    FaFutbol,
    FaHandRock,
    FaParachuteBox,
    FaVolleyballBall,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { ADJUSTABLE_INTERVAL_ROLES, intervalRoleName } from "../fabric/eig-util"
import { FloatFeature } from "../fabric/fabric-features"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function ViewTab(
    {
        floatFeatures, tensegrity,
        visibleRoles, setVisibleRoles, storedState$,
    }: {
        floatFeatures: Record<FabricFeature, FloatFeature>,
        tensegrity: Tensegrity,
        visibleRoles: IntervalRole[],
        setVisibleRoles: (roles: IntervalRole[]) => void,
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

    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

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
                <h6 className="w-100 text-center"><FaEye/> Coloring</h6>
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
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaCamera/> Snapshot</h6>
                <ButtonGroup size="sm" className="w-100">
                    {ADJUSTABLE_INTERVAL_ROLES.map(intervalRole => (
                        <Button
                            color={visibleRoles.indexOf(intervalRole) < 0 ? "secondary" : "success"}
                            key={`viz${intervalRole}`}
                            onClick={() => {
                                if (visibleRoles.indexOf(intervalRole) < 0) {
                                    setVisibleRoles([...visibleRoles, intervalRole])
                                } else {
                                    setVisibleRoles(visibleRoles.filter(role => role !== intervalRole))
                                }
                            }}
                            disabled={!ellipsoids}
                        >
                            {intervalRoleName(intervalRole)}
                        </Button>
                    ))}
                </ButtonGroup>
                <FeaturePanel key="pushrad" feature={floatFeatures[FabricFeature.PushRadius]}
                              disabled={!ellipsoids}/>
                <FeaturePanel key="pullrad" feature={floatFeatures[FabricFeature.PullRadius]}
                              disabled={!ellipsoids}/>
                <FeaturePanel key="jointrad" feature={floatFeatures[FabricFeature.JointRadius]}
                              disabled={!ellipsoids}/>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaClock/> Time</h6>
                <FeaturePanel key="it" feature={floatFeatures[FabricFeature.IterationsPerFrame]} disabled={ellipsoids}/>
                <FeaturePanel key="ic" feature={floatFeatures[FabricFeature.IntervalCountdown]} disabled={ellipsoids}/>
                <FeaturePanel key="pc" feature={floatFeatures[FabricFeature.PretensingCountdown]} disabled={ellipsoids}/>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaFistRaised/> Perturb</h6>
                <ButtonGroup className="w-100">
                    <Button disabled={life.stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(1)}>
                        <FaHandRock/> Nudge
                    </Button>
                    <Button disabled={life.stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(10)}>
                        <FaParachuteBox/> Drop
                    </Button>
                    <Button disabled={ellipsoids}
                            onClick={() => tensegrity.fabric.centralize()}>
                        <FaCompressArrowsAlt/> Centralize
                    </Button>
                </ButtonGroup>
            </Grouping>
        </div>
    )
}
