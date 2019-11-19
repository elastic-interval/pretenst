/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaRunning } from "react-icons/all"
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
import { IFace, IFacePair, percentToFactor } from "../fabric/tensegrity-brick-types"
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

export function TensegrityView({fabricKernel, features, app$, lifePhase$}: {
    fabricKernel: FabricKernel,
    features: FloatFeature[],
    app$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])

    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [tenscript, setTenscript] = useState<ITenscript | undefined>(getCodeFromUrl)
    const [selectedFaces, setSelectedFaces] = useState<IFace[]>([])
    const [facePairs, setFacePairs] = useState<IFacePair[]>([])

    useEffect(() => {
        app$.next(transition(app$.getValue(), {faceSelection: false}))
        if (fabric && selectedFaces.length === 0) {
            fabric.clearSelection()
        }
    }, [fabric, selectedFaces])

    const [controlTab, updateControlTab] = useState(app$.getValue().controlTab)
    const [faceSelection, updateFaceSelection] = useState(app$.getValue().faceSelection)
    const [fullScreen, updateFullScreen] = useState(app$.getValue().fullScreen)
    const [ellipsoids, updateEllipsoids] = useState(app$.getValue().ellipsoids)

    function addFacePairs(newFacePairs: IFacePair[]): void {
        if (!fabric) {
            return
        }
        setFacePairs([...facePairs, ...newFacePairs])
    }

    useEffect(() => {
        if (facePairs.length === 0) {
            return
        }
        const timer = setInterval(() => {
            if (!fabric || facePairs.length === 0) {
                return
            }
            const newFacePairs = fabric.builder.tightenFacePairs(facePairs, 0.1)
            if (newFacePairs) {
                setFacePairs(newFacePairs)
            }
        }, 50)
        return () => clearTimeout(timer)
    }, [facePairs])

    useEffect(() => {
        const subscription = app$.subscribe(fabricState => {
            updateControlTab(fabricState.controlTab)
            updateFaceSelection(fabricState.faceSelection)
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

    function growFromTenscript(newTenscript: ITenscript, replaceUrl: boolean): void {
        if (!mainInstance || !slackInstance) {
            return
        }
        mainInstance.forgetDimensions()
        mainInstance.engine.initInstance()
        lifePhase$.next(LifePhase.Growing)
        app$.next(transition(app$.getValue(), {ellipsoids: false, faceSelection: false}))
        setFabric(new TensegrityFabric(mainInstance, slackInstance, features, newTenscript, setFacePairs))
        if (replaceUrl) {
            location.hash = newTenscript.code
        }
    }

    useEffect(() => {
        const urlCode = getCodeFromUrl()
        const recentCode = getRecentCode()
        const storedCode = recentCode.length > 0 ? recentCode[0] : BOOTSTRAP[0]
        if (!storedCode) {
            throw new Error("No stored code")
        }
        if (urlCode && urlCode.code === storedCode.code) {
            setTenscript(urlCode)
            growFromTenscript(urlCode, false)
        } else {
            setTenscript(storedCode)
            growFromTenscript(storedCode, true)
        }
    }, [])

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
                        selectedFaces={selectedFaces}
                        clearSelectedFaces={() => setSelectedFaces([])}
                        facePairs={facePairs}
                        addFacePairs={addFacePairs}
                        tenscript={tenscript}
                        setTenscript={(grow: boolean, newScript?: ITenscript) => {
                            if (grow) {
                                if (!newScript || !tenscript) {
                                    console.warn("No tenscript to grow")
                                    return
                                }
                                const scriptToGrow = newScript ? newScript : tenscript
                                setTenscript(scriptToGrow)
                                growFromTenscript(scriptToGrow, true)
                            } else {
                                setTenscript(newScript)
                            }
                        }}
                        toFullScreen={() => toFullScreen(true)}
                        app$={app$}
                        lifePhase$={lifePhase$}
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
                            <h1><FaRunning/></h1>
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
                                fullScreen={fullScreen}
                                selectedFaces={selectedFaces}
                                clearSelectedFaces={() => setSelectedFaces([])}
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
                            borderColor: faceSelection || ellipsoids ? "#f0ad4e" : "black",
                            cursor: faceSelection ? "pointer" : "all-scroll",
                            borderWidth: "2px",
                        }}>
                            <FabricView
                                fabric={fabric}
                                selectedFaces={selectedFaces}
                                setSelectedFaces={setSelectedFaces}
                                facePairs={facePairs}
                                faceSelection={faceSelection}
                                ellipsoids={ellipsoids}
                                app$={app$}
                                lifePhase$={lifePhase$}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </>
    )
}
