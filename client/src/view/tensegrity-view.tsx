/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaPlay, FaToolbox } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, fabricFeatureIntervalRole, Stage } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import { addNameToCode, BOOTSTRAP, getCodeFromUrl, ITenscript } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, IInterval, percentToFactor } from "../fabric/tensegrity-types"
import { getRecentTenscript, IFeatureValue, IStoredState, transition } from "../storage/stored-state"

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

export function TensegrityView({fabricKernel, floatFeatures, storedState$}: {
    fabricKernel: FabricKernel,
    floatFeatures: Record<FabricFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])

    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedIntervals, setSelectedIntervals] = useState<IInterval[]>([])
    const [selectedFaces, setSelectedFaces] = useState<IFace[]>([])
    useEffect(() => {
        if (!fabric) {
            return
        }
        const intervals = selectedFaces.reduce((accum, face) => [...accum, ...face.pushes, ...face.pulls], [] as IInterval[])
        setSelectedIntervals(intervals)
        setFabric(fabric)
    }, [selectedFaces])

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
            const engine = fabric.instance.engine
            engine.setColoring(storedState.showPushes, storedState.showPulls)
            engine.setSurfaceCharacter(storedState.surfaceCharacter)
        })
        return () => subscription.unsubscribe()
    }, [fabric])

    useEffect(() => { // todo: look when this happens
        const featureSubscriptions = Object.keys(floatFeatures).map(k => floatFeatures[k]).map((feature: FloatFeature) =>
            feature.observable.subscribe((value: IFeatureValue) => {
                if (!fabric) {
                    return
                }
                fabric.instance.applyFeature(feature)
                const freshValues = {...fabric.featureValues}
                freshValues[feature.config.feature] = value
                fabric.featureValues$.next(freshValues)
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
        mainInstance.engine.initInstance()
        mainInstance.forgetDimensions()
        setFabric(new TensegrityFabric(floatFeatures, mainInstance, slackInstance, newTenscript))
        floatFeatures[FabricFeature.ShapingPretenstFactor].percent = 100
        floatFeatures[FabricFeature.ShapingDrag].percent = 100
        floatFeatures[FabricFeature.ShapingStiffnessFactor].percent = 100
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
                    <FaArrowRight/><br/><FaToolbox/><br/><FaArrowRight/>
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
                        selectedIntervals={selectedIntervals}
                        selectionMode={selectionMode}
                        setSelectionMode={setSelectionMode}
                        selectedFaces={selectedFaces}
                        clearSelectedFaces={() => setSelectedFaces([])}
                        runTenscript={runTenscript}
                        toFullScreen={() => toFullScreen(true)}
                        storedState$={storedState$}
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
                        <TopMiddle fabric={fabric}/>
                        <Canvas style={{
                            backgroundColor: "black",
                            borderStyle: "solid",
                            borderColor: selectionMode || ellipsoids ? "#f0ad4e" : "black",
                            cursor: selectionMode ? "pointer" : "all-scroll",
                            borderWidth: "2px",
                        }}>
                            <FabricView
                                fabric={fabric}
                                selectedIntervals={selectedIntervals}
                                selectedFaces={selectedFaces}
                                setSelectedFaces={setSelectedFaces}
                                selectionMode={selectionMode}
                                ellipsoids={ellipsoids}
                                storedState$={storedState$}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </>
    )
}

function TopMiddle({fabric}: { fabric: TensegrityFabric }): JSX.Element {
    const [life, updateLife] = useState(fabric.life)
    useEffect(() => {
        const sub = fabric.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [fabric])
    return (
        <div id="top-middle">
            <span>{Stage[life.stage]}</span> <i>"{fabric.tenscript.name}"</i>
        </div>
    )
}
