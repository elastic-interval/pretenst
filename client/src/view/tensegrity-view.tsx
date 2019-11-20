/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaPlay } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, lengthFeatureToRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import {
    ControlTab,
    DRAG_LEVEL,
    GRAVITY_LEVEL,
    IFabricState,
    LifePhase,
    PRETENSE_FACTOR,
    PRETENSE_SPEED,
    PUSH_STRAIN_FACTOR,
    transition,
} from "../fabric/fabric-state"
import { BOOTSTRAP, ITenscript } from "../fabric/tenscript"
import { IFacePair, IOperations, percentToFactor } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { getCodeFromUrl, getRecentCode } from "./tenscript-panel"
import { ToolbarLeftBottom } from "./toolbar-left-bottom"
import { ToolbarLeftTop } from "./toolbar-left-top"
import { ToolbarRightBottom } from "./toolbar-right-bottom"
import { ToolbarRightTop } from "./toolbar-right-top"

const SPLIT_LEFT = "25em"
const SPLIT_RIGHT = "26em"

function getCodeToRun(): ITenscript {
    const fromUrl = getCodeFromUrl()
    if (fromUrl) {
        return fromUrl
    }
    const recentCode = getRecentCode()
    return recentCode.length > 0 ? recentCode[0] : BOOTSTRAP[0]
}

export function TensegrityView({fabricKernel, features, app$, lifePhase$, operations$}: {
    fabricKernel: FabricKernel,
    features: FloatFeature[],
    app$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    operations$: BehaviorSubject<IOperations>,
}): JSX.Element {

    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])

    const [initialTenscript, setInitialTenscript] = useState(getCodeToRun)
    useEffect(() => {
        location.hash = initialTenscript.code
    }, [initialTenscript])

    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()

    const [controlTab, updateControlTab] = useState(app$.getValue().controlTab)
    const [selectionMode, updateSelectionMode] = useState(app$.getValue().selectionMode)
    const [fullScreen, updateFullScreen] = useState(app$.getValue().fullScreen)
    const [ellipsoids, updateEllipsoids] = useState(app$.getValue().ellipsoids)

    useEffect(() => {
        const subscription = app$.subscribe(fabricState => {
            updateControlTab(fabricState.controlTab)
            updateSelectionMode(fabricState.selectionMode)
            updateFullScreen(fabricState.fullScreen)
            updateEllipsoids(fabricState.ellipsoids)
            if (!fabric) {
                return
            }
            const instance = fabric.instance
            instance.engine.setColoring(fabricState.showPushes, fabricState.showPulls)
            instance.engine.iterate(0, lifePhase$.getValue())
            instance.engine.setSurfaceCharacter(fabricState.surfaceCharacter)
            const adjust = (feature: FabricFeature, array: number[], choice: number) => {
                const value = array[choice]
                if (features[feature].numeric === value) {
                    return
                }
                features[feature].numeric = value
                console.error("adjusting feature", features[feature].config.name, value)
                instance.setFeatureValue(feature, value)
            }
            adjust(FabricFeature.Gravity, GRAVITY_LEVEL, fabricState.gravityLevel)
            adjust(FabricFeature.Drag, DRAG_LEVEL, fabricState.dragLevel)
            adjust(FabricFeature.PretenseFactor, PRETENSE_FACTOR, fabricState.pretenseFactor)
            adjust(FabricFeature.PretenseTicks, PRETENSE_SPEED, fabricState.pretenseSpeed)
            adjust(FabricFeature.PushStrainFactor, PUSH_STRAIN_FACTOR, fabricState.pushStrainFactor)
        })
        return () => subscription.unsubscribe()
    }, [fabric])

    useEffect(() => { // todo: look when this happens
        const subscriptions = features.map(feature => feature.observable.subscribe(() => {
            if (!fabric) {
                return
            }
            fabric.instance.applyFeature(feature)
            const intervalRole = lengthFeatureToRole(feature.config.feature)
            if (intervalRole !== undefined) {
                const engine = fabric.instance.engine
                fabric.intervals
                    .filter(interval => interval.intervalRole === intervalRole)
                    .forEach(interval => {
                        const scaledLength = feature.numeric * percentToFactor(interval.scale)
                        engine.changeRestLength(interval.index, scaledLength)
                    })
            }
        }))
        return () => subscriptions.forEach(sub => sub.unsubscribe())
    }, [fabric])

    function runTenscript(newTenscript: ITenscript): void {
        if (!mainInstance || !slackInstance) {
            return
        }
        mainInstance.forgetDimensions()
        mainInstance.engine.initInstance()
        operations$.next({selectedFaces: [], facePairs: []})
        lifePhase$.next(LifePhase.Growing)
        app$.next(transition(app$.getValue(), {ellipsoids: false, selectionMode: false}))
        const setFacePairs = (facePairs: IFacePair[]) => operations$.next({facePairs, selectedFaces: []})
        setFabric(new TensegrityFabric(mainInstance, slackInstance, features, newTenscript, setFacePairs))
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!fabric) {
                runTenscript(initialTenscript)
            }
        }, 200)
        return () => clearTimeout(timer)
    }, [fabric, initialTenscript])

    function toFullScreen(value: boolean): void {
        app$.next(transition(app$.getValue(), {fullScreen: value}))
    }

    return (
        <>
            {fullScreen ? (
                <Button id="to-full-screen" color="dark" onClick={() => toFullScreen(false)}>
                    <FaArrowRight/>
                </Button>
            ) : (
                <div
                    id="left-side"
                    style={{
                        visibility: fullScreen ? "collapse" : "visible",
                        width: SPLIT_LEFT,
                    }}
                >
                    <ControlTabs
                        fabric={fabric}
                        initialTenscript={initialTenscript}
                        setInitialTenscript={setInitialTenscript}
                        runTenscript={runTenscript}
                        toFullScreen={() => toFullScreen(true)}
                        app$={app$}
                        lifePhase$={lifePhase$}
                        operations$={operations$}
                        features={features}
                    />
                </div>
            )}
            <div style={{
                position: "absolute",
                left: fullScreen ? 0 : SPLIT_RIGHT,
                right: 0,
                height: "100%",
            }}>
                {!fabric ? (
                    <div id="tensegrity-view" className="h-100">
                        <div style={{position: "relative", top: "50%", left: "50%"}}>
                            <Button onClick={() => runTenscript(initialTenscript)}>
                                <h6>{initialTenscript.code}</h6>
                                <h1><FaPlay/></h1>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div id="tensegrity-view" className="h-100">
                        <div id="top-middle">
                            {fabric.tenscript.code}
                        </div>
                        {controlTab !== ControlTab.Shape ? undefined : (
                            <ToolbarLeftTop
                                app$={app$}
                                operations$={operations$}
                                fullScreen={fullScreen}
                            />
                        )}
                        <ToolbarLeftBottom
                            fabric={fabric}
                            app$={app$}
                            lifePhase$={lifePhase$}
                            fullScreen={fullScreen}
                        />
                        <ToolbarRightTop
                            app$={app$}
                        />
                        <ToolbarRightBottom
                            fabric={fabric}
                            lifePhase$={lifePhase$}
                            app$={app$}
                        />
                        <Canvas style={{
                            backgroundColor: "black",
                            borderStyle: "solid",
                            borderColor: selectionMode || ellipsoids ? "#f0ad4e" : "black",
                            cursor: selectionMode ? "pointer" : "all-scroll",
                            borderWidth: "2px",
                        }}>
                            <FabricView
                                fabric={fabric}
                                selectionMode={selectionMode}
                                ellipsoids={ellipsoids}
                                app$={app$}
                                lifePhase$={lifePhase$}
                                operations$={operations$}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </>
    )
}
