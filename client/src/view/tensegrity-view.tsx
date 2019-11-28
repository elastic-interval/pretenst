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

import { FabricFeature, fabricFeatureIntervalRole, LifePhase } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import { addNameToCode, BOOTSTRAP, getCodeFromUrl, ITenscript } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, percentToFactor } from "../fabric/tensegrity-types"
import { getRecentTenscript, IStoredState, transition } from "../storage/stored-state"

import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"

const SPLIT_LEFT = "25em"
const SPLIT_RIGHT = "26em"

function getCodeToRun(state: IStoredState): ITenscript {
    const fromUrl = getCodeFromUrl()
    if (fromUrl) {
        return fromUrl
    }
    const recentCode = getRecentTenscript(state)
    return recentCode.length > 0 ? recentCode[0] : BOOTSTRAP[0]
}

export function TensegrityView({fabricKernel, floatFeatures, storedState$, lifePhase$}: {
    fabricKernel: FabricKernel,
    floatFeatures: Record<FabricFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedFaces, setSelectedFaces] = useState<IFace[]>([])

    const [rootTenscript, setRootTenscript] = useState(() => getCodeToRun(storedState$.getValue()))
    useEffect(() => {
        if (location.hash.length === 0) {
            location.hash = addNameToCode(rootTenscript.code, rootTenscript.name)
        }
    }, [rootTenscript])

    const [selectionMode, setSelectionMode] = useState(false)
    const [fullScreen, updateFullScreen] = useState(storedState$.getValue().fullScreen)
    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)

    useEffect(() => {
        const subscription = storedState$.subscribe(storedState => {
            updateFullScreen(storedState.fullScreen)
            updateEllipsoids(storedState.ellipsoids)
            if (!fabric) {
                return
            }
            const instance = fabric.instance
            instance.engine.setColoring(storedState.showPushes, storedState.showPulls)
            instance.engine.iterate(0, lifePhase$.getValue())
            instance.engine.setSurfaceCharacter(storedState.surfaceCharacter)
        })
        return () => subscription.unsubscribe()
    }, [fabric])

    useEffect(() => { // todo: look when this happens
        const featureSubscriptions = Object.keys(floatFeatures).map(k => floatFeatures[k]).map(feature =>
            feature.observable.subscribe(() => {
                if (!fabric) {
                    return
                }
                fabric.instance.applyFeature(feature)
                const intervalRole = fabricFeatureIntervalRole(feature.config.feature)
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
        location.hash = addNameToCode(newTenscript.code, newTenscript.name)
        mainInstance.forgetDimensions()
        mainInstance.engine.initInstance()
        lifePhase$.next(LifePhase.Growing)
        const featureValues = storedState$.getValue().featureValues
        setFabric(new TensegrityFabric(mainInstance, slackInstance, floatFeatures, featureValues, newTenscript))
        storedState$.next(transition(storedState$.getValue(), {ellipsoids: false}))
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!fabric) {
                runTenscript(rootTenscript)
            }
        }, 200)
        return () => clearTimeout(timer)
    }, [rootTenscript])

    function toFullScreen(value: boolean): void {
        storedState$.next(transition(storedState$.getValue(), {fullScreen: value}))
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
                        rootTenscript={rootTenscript}
                        setRootTenscript={setRootTenscript}
                        fabric={fabric}
                        setFabric={setFabric}
                        selectionMode={selectionMode}
                        setSelectionMode={setSelectionMode}
                        selectedFaces={selectedFaces}
                        clearSelectedFaces={() => setSelectedFaces([])}
                        runTenscript={runTenscript}
                        toFullScreen={() => toFullScreen(true)}
                        storedState$={storedState$}
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
                            <Button onClick={() => runTenscript(rootTenscript)}>
                                <h6>{rootTenscript.name}</h6>
                                <h1><FaPlay/></h1>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div id="tensegrity-view" className="h-100">
                        <div id="top-middle">
                            <i>"{fabric.tenscript.name}"</i>
                        </div>
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
                                storedState$={storedState$}
                                lifePhase$={lifePhase$}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </>
    )
}
