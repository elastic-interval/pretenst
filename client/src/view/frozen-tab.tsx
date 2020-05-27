/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaCamera,
    FaCircle,
    FaDownload,
    FaExpandArrowsAlt,
    FaEye,
    FaFile,
    FaFileCsv,
    FaFutbol,
    FaRunning,
    FaVolleyballBall,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { ADJUSTABLE_INTERVAL_ROLES, intervalRoleName } from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { saveCSVZip, saveJSONZip } from "../storage/download"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function FrozenTab({tensegrity, floatFeatures, visibleRoles, setVisibleRoles, storedState$}: {
    tensegrity?: Tensegrity,
    floatFeatures: Record<WorldFeature, FloatFeature>,
    visibleRoles: IntervalRole[],
    setVisibleRoles: (roles: IntervalRole[]) => void,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    const [showPushes, updateShowPushes] = useState(storedState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(storedState$.getValue().showPulls)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
            updatePolygons(newState.polygons)
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
        })
        return () => subscription.unsubscribe()
    }, [])

    function ViewButton({pushes, pulls, children}: { pushes: boolean, pulls: boolean, children: JSX.Element }): JSX.Element {
        return (
            <Button
                style={{color: "white"}}
                color={pushes === showPushes && pulls === showPulls ? "success" : "secondary"}
                disabled={!polygons}
                onClick={() => {
                    storedState$.next(transition(storedState$.getValue(), {showPulls: pulls, showPushes: pushes}))
                }}
            >
                {children}
            </Button>
        )
    }

    return (
        <>
            <Grouping>
                <h6 className="w-100 text-center"><FaEye/> Show</h6>
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
                            disabled={!polygons}
                            onClick={() => {
                                if (visibleRoles.indexOf(intervalRole) < 0) {
                                    setVisibleRoles([...visibleRoles, intervalRole])
                                } else {
                                    setVisibleRoles(visibleRoles.filter(role => role !== intervalRole))
                                }
                            }}
                        >
                            {intervalRoleName(intervalRole)}
                        </Button>
                    ))}
                </ButtonGroup>
                <FeaturePanel feature={floatFeatures[WorldFeature.PushRadius]}
                              disabled={!polygons}
                />
                <FeaturePanel feature={floatFeatures[WorldFeature.PullRadius]}
                              disabled={!polygons}
                />
                <FeaturePanel feature={floatFeatures[WorldFeature.JointRadiusFactor]}
                              disabled={!polygons}
                />
            </Grouping>
            {!tensegrity ? undefined : (
                <Grouping>
                    <h6 className="w-100 text-center"><FaRunning/> Take</h6>
                    <ButtonGroup vertical={false} className="w-100">
                        <Button onClick={() => saveCSVZip(tensegrity.fabricOutput)}
                                disabled={!polygons}
                        >
                            <FaDownload/> Download CSV <FaFileCsv/>
                        </Button>
                        <Button onClick={() => saveJSONZip(tensegrity.fabricOutput)}
                                disabled={!polygons}
                        >
                            <FaDownload/> Download JSON <FaFile/>
                        </Button>
                    </ButtonGroup>
                </Grouping>
            )}
        </>
    )
}
