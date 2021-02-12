/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaHandPointUp, FaPlay, FaSignOutAlt, FaSnowflake, FaSyncAlt, FaToolbox } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { enterDemoMode, getCodeToRun, showDemo } from "../fabric/bootstrap"
import { stageName } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { FloatFeature } from "../fabric/float-feature"
import { ITenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { emptySelection, ISelection, percentOrHundred, preserveJoints } from "../fabric/tensegrity-types"
import { IStoredState, transition, ViewMode } from "../storage/stored-state"

import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { FeaturePanel } from "./feature-panel"

const SPLIT_LEFT = "25em"
const SPLIT_RIGHT = "26em"

export function TensegrityView({createInstance, worldFeatures, storedState$}: {
    createInstance: CreateInstance,
    worldFeatures: Record<WorldFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const mainInstance = useMemo(() => createInstance(false), [])
    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [selection, setSelection] = useState<ISelection>(emptySelection)
    const [rootTenscript, setRootTenscript] = useState(() => {
        const codeToRun = getCodeToRun(storedState$.getValue())
        if (codeToRun) {
            return codeToRun
        }
        return enterDemoMode(storedState$)
    })
    const [rotating, updateRotating] = useState(storedState$.getValue().rotating)
    const [fullScreen, updateFullScreen] = useState(storedState$.getValue().fullScreen)
    const [demoCount, updateDemoCount] = useState(storedState$.getValue().demoCount)
    const [viewMode, updateViewMode] = useState(storedState$.getValue().viewMode)
    useEffect(() => {
        const subscription = storedState$.subscribe(storedState => {
            updateFullScreen(storedState.fullScreen)
            if (storedState.demoCount < 0) {
                updateDemoCount(storedState.demoCount)
            } else if (storedState.demoCount > demoCount) {
                showDemo(setRootTenscript, storedState.demoCount, count => {
                    if (count < 0) {
                        setTimeout(() => {
                            transition(storedState$, {demoCount: -1, fullScreen: false, rotating: false})
                        }, 200)
                    }
                    updateDemoCount(count)
                })
            }
            updateViewMode(storedState.viewMode)
            updateRotating(storedState.rotating)
            mainInstance.world.set_surface_character(storedState.surfaceCharacter)
        })
        return () => subscription.unsubscribe()
    }, [tensegrity])

    useEffect(() => {
        const featureSubscriptions = Object.keys(worldFeatures).map(k => worldFeatures[k]).map((feature: FloatFeature) =>
            feature.observable.subscribe(() => {
                if (tensegrity) {
                    tensegrity.instance.applyFeature(feature)
                }
            }))
        return () => featureSubscriptions.forEach(sub => sub.unsubscribe())
    }, [tensegrity])

    function runTenscript(newTenscript: ITenscript): void {
        if (!mainInstance) {
            return
        }
        transition(storedState$, {viewMode: ViewMode.Lines})
        setSelection(emptySelection)
        const numericFeature = (feature: WorldFeature) => storedState$.getValue().featureValues[feature].numeric
        setTensegrity(new Tensegrity(new Vector3(), percentOrHundred(), numericFeature, mainInstance, newTenscript))
    }

    useEffect(() => {
        const timer = setTimeout(() => runTenscript(rootTenscript), 200)
        return () => clearTimeout(timer)
    }, [rootTenscript])

    function toFullScreen(value: boolean): void {
        transition(storedState$, {fullScreen: value})
    }

    return (
        <>
            {fullScreen ? demoCount >= 0 ? undefined : (
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
                        worldFeatures={worldFeatures}
                        rootTenscript={rootTenscript}
                        tensegrity={tensegrity}
                        selection={selection}
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
                {!tensegrity ? (
                    <div id="tensegrity-view" className="h-100">
                        <div style={{position: "relative", top: "50%", left: "50%"}}>
                            <Button onClick={() => runTenscript(rootTenscript)}>
                                <h6>{rootTenscript.name}</h6>
                                <h1><FaPlay/></h1>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="h-100">
                        <TopMiddle tensegrity={tensegrity}/>
                        {demoCount >= 0 ? (
                            <div id="bottom-right">
                                <ButtonGroup>
                                    <Button
                                        color="success"
                                        onClick={() => {
                                            transition(storedState$, {
                                                demoCount: -1,
                                                fullScreen: false,
                                                rotating: false,
                                            })
                                        }}
                                    >
                                        <FaSignOutAlt/> Exit demo
                                    </Button>
                                </ButtonGroup>
                            </div>
                        ) : (
                            <div>
                                <div id="bottom-right">
                                    <ButtonGroup>
                                        <Button
                                            color={rotating ? "warning" : "secondary"}
                                            onClick={() => transition(storedState$, {rotating: !rotating})}
                                        >
                                            <FaSyncAlt/>
                                        </Button>
                                    </ButtonGroup>
                                </div>
                                <div id="bottom-middle">
                                    <FeaturePanel feature={worldFeatures[WorldFeature.VisualStrain]}/>
                                </div>
                                <div id="bottom-left">
                                    <ButtonGroup>
                                        <ViewModeButton item={ViewMode.Lines} storedState$={storedState$}
                                                        click={() => setSelection(preserveJoints(selection))}>
                                            <FaPlay/>
                                        </ViewModeButton>
                                        <ViewModeButton item={ViewMode.Selecting} storedState$={storedState$}>
                                            <FaHandPointUp/>
                                        </ViewModeButton>
                                        <ViewModeButton item={ViewMode.Frozen} storedState$={storedState$}>
                                            <FaSnowflake/>
                                        </ViewModeButton>
                                    </ButtonGroup>
                                </div>
                            </div>
                        )}
                        <div id="view-container" className="h-100">
                            <Canvas
                                style={{
                                    backgroundColor: "black",
                                    borderStyle: "solid",
                                    borderColor: viewMode === ViewMode.Frozen ? "#f0ad4e" : "black",
                                    cursor: viewMode === ViewMode.Selecting ? "pointer" : "default",
                                    borderWidth: "2px",
                                }}
                            >
                                <FabricView
                                    worldFeatures={worldFeatures}
                                    tensegrity={tensegrity}
                                    selection={selection}
                                    setSelection={setSelection}
                                    viewMode={viewMode}
                                    storedState$={storedState$}
                                />
                            </Canvas>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

function TopMiddle({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    return (
        <div id="top-middle">
            <span>{stageName(stage)}</span> <i>"{tensegrity.tenscript.name}"</i>
        </div>
    )
}

function ViewModeButton({item, storedState$, children, click}: {
    item: ViewMode, storedState$: BehaviorSubject<IStoredState>, click?: () => void,
    children: JSX.Element | (JSX.Element[] | JSX.Element | undefined)[],
}): JSX.Element {
    const viewMode = storedState$.getValue().viewMode
    return (
        <Button
            disabled={item === viewMode}
            color={item === viewMode ? "success" : "secondary"}
            onClick={() => {
                transition(storedState$, {viewMode: item})
                if (click) {
                    click()
                }
            }}
        >
            {children}
        </Button>
    )
}
