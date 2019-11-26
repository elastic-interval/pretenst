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

import { lengthFeatureToRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import { ControlTab, IFabricState, LifePhase, transition } from "../fabric/fabric-state"
import { BOOTSTRAP, ITenscript } from "../fabric/tenscript"
import { IFace, percentToFactor } from "../fabric/tensegrity-brick-types"
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

export function TensegrityView({fabricKernel, floatFeatures, fabricState$, lifePhase$}: {
    fabricKernel: FabricKernel,
    floatFeatures: FloatFeature[],
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedFaces, setSelectedFaces] = useState< IFace[] >([])

    const [initialTenscript, setInitialTenscript] = useState(getCodeToRun)
    useEffect(() => {
        location.hash = initialTenscript.code
    }, [initialTenscript])

    const [controlTab, updateControlTab] = useState(fabricState$.getValue().controlTab)
    const [selectionMode, updateSelectionMode] = useState(fabricState$.getValue().selectionMode)
    const [fullScreen, updateFullScreen] = useState(fabricState$.getValue().fullScreen)
    const [ellipsoids, updateEllipsoids] = useState(fabricState$.getValue().ellipsoids)

    useEffect(() => {
        const subscription = fabricState$.subscribe(fabricState => {
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
        })
        return () => subscription.unsubscribe()
    }, [fabric])

    useEffect(() => { // todo: look when this happens
        const featureSubscriptions = floatFeatures.map(feature => feature.observable.subscribe(() => {
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
                        engine.changeRestLength(interval.index, scaledLength, 500)
                    })
            }
        }))
        return () => featureSubscriptions.forEach(sub => sub.unsubscribe())
    }, [fabric])

    function runTenscript(newTenscript: ITenscript): void {
        if (!mainInstance || !slackInstance) {
            return
        }
        mainInstance.forgetDimensions()
        mainInstance.engine.initInstance()
        lifePhase$.next(LifePhase.Growing)
        const featureValues = fabricState$.getValue().featureValues
        setFabric(new TensegrityFabric(mainInstance, slackInstance, floatFeatures, featureValues, newTenscript))
        fabricState$.next(transition(fabricState$.getValue(), {ellipsoids: false, selectionMode: false}))
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!fabric) {
                runTenscript(initialTenscript)
            }
        }, 200)
        return () => clearTimeout(timer)
    }, [initialTenscript])

    function toFullScreen(value: boolean): void {
        fabricState$.next(transition(fabricState$.getValue(), {fullScreen: value}))
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
                        floatFeatures={floatFeatures}
                        initialTenscript={initialTenscript}
                        setInitialTenscript={setInitialTenscript}
                        fabric={fabric}
                        setFabric={setFabric}
                        selectedFaces={selectedFaces}
                        clearSelectedFaces={() => setSelectedFaces([])}
                        runTenscript={runTenscript}
                        toFullScreen={() => toFullScreen(true)}
                        fabricState$={fabricState$}
                        lifePhase$={lifePhase$}
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
                                fabric={fabric}
                                selectedFaces={selectedFaces}
                                clearSelectedFaces={() => setSelectedFaces([])}
                                fabricState$={fabricState$}
                                fullScreen={fullScreen}
                            />
                        )}
                        <ToolbarLeftBottom
                            fabric={fabric}
                            fabricState$={fabricState$}
                            lifePhase$={lifePhase$}
                            fullScreen={fullScreen}
                        />
                        <ToolbarRightTop
                            fabricState$={fabricState$}
                        />
                        <ToolbarRightBottom
                            fabric={fabric}
                            lifePhase$={lifePhase$}
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
                                selectedFaces={selectedFaces}
                                setSelectedFaces={setSelectedFaces}
                                selectionMode={selectionMode}
                                ellipsoids={ellipsoids}
                                fabricState$={fabricState$}
                                lifePhase$={lifePhase$}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </>
    )
}
