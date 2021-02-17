/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default_world_feature, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaHandPointUp, FaPlay, FaSignOutAlt, FaSnowflake, FaSyncAlt, FaToolbox } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState } from "recoil"
import { Vector3 } from "three"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { stageName, WORLD_FEATURES } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { compileTenscript, ITenscript, RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { emptySelection, ISelection, percentOrHundred, preserveJoints } from "../fabric/tensegrity-types"
import {
    bootstrapIndexAtom,
    demoModeAtom,
    FEATURE_VALUES,
    rotatingAtom,
    tenscriptAtom,
    ViewMode,
    viewModeAtom,
} from "../storage/recoil"

import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { featureMapping } from "./feature-mapping"
import { FeatureSlider } from "./feature-slider"

const SPLIT_LEFT = "25em"
const SPLIT_RIGHT = "26em"

export function TensegrityView({createInstance}: { createInstance: CreateInstance }): JSX.Element {
    const mainInstance = useMemo(() => createInstance(false), [])
    const [tenscript, setTenscript] = useRecoilState(tenscriptAtom)
    const [bootstrapIndex] = useRecoilState(bootstrapIndexAtom)
    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [selection, setSelection] = useState<ISelection>(emptySelection)
    const [rotating, setRotating] = useRecoilState(rotatingAtom)
    const [demoMode, setDemoMode] = useRecoilState(demoModeAtom)
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)
    const [fullScreen, setFullScreen] = useState(false)
    const worldFeatures = FEATURE_VALUES.map(({percentAtom}) => useRecoilState(percentAtom))

    useEffect(() => {
        if (tensegrity) {
            WORLD_FEATURES.map(feature => {
                const {percentToValue} = featureMapping(feature)
                const percent = worldFeatures[feature][0]
                tensegrity.instance.applyFeature(feature, percent, percentToValue(percent))
            })
        }
    }, [tensegrity])

    const runTenscript: RunTenscript = (ts: ITenscript, error: (message: string) => void) => {
        const tree = compileTenscript(ts, error)
        if (!tree) {
            return false
        }
        setViewMode(ViewMode.Lines)
        setSelection(emptySelection)
        const localValue = ts.featureValues[WorldFeature.IntervalCountdown]
        const countdown = localValue === undefined ? default_world_feature(WorldFeature.IntervalCountdown) : localValue
        setTenscript(ts)
        setTensegrity(new Tensegrity(new Vector3(), percentOrHundred(), mainInstance, countdown, ts, tree))
        return true
    }

    useEffect(() => {
        const emergency = (message: string) => console.error("tensegrity view", message)
        if (tenscript) {
            runTenscript(tenscript, emergency)
        } else {
            runTenscript(BOOTSTRAP[bootstrapIndex], emergency)
        }
    }, [])

    const RecoilBridge = useRecoilBridgeAcrossReactRoots_UNSTABLE()
    return (
        <div>
            {fullScreen ? demoMode ? undefined : (
                <Button id="to-full-screen" color="dark" onClick={() => setFullScreen(false)}>
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
                        tensegrity={tensegrity}
                        selection={selection}
                        runTenscript={runTenscript}
                        toFullScreen={() => setFullScreen(true)}
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
                            <h1><FaPlay/></h1>
                        </div>
                    </div>
                ) : (
                    <div className="h-100">
                        <TopMiddle tensegrity={tensegrity}/>
                        {demoMode ? (
                            <div id="bottom-right">
                                <ButtonGroup>
                                    <Button
                                        color="success"
                                        onClick={() => {
                                            setDemoMode(false)
                                            setFullScreen(false)
                                            setRotating(false)
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
                                            onClick={() => setRotating(!rotating)}
                                        >
                                            <FaSyncAlt/>
                                        </Button>
                                    </ButtonGroup>
                                </div>
                                <div id="bottom-left">
                                    <ButtonGroup>
                                        <ViewModeButton item={ViewMode.Lines}
                                                        click={() => setSelection(preserveJoints(selection))}>
                                            <FaPlay/>
                                        </ViewModeButton>
                                        <ViewModeButton item={ViewMode.Selecting}>
                                            <FaHandPointUp/>
                                        </ViewModeButton>
                                        <ViewModeButton item={ViewMode.Frozen}>
                                            <FaSnowflake/>
                                        </ViewModeButton>
                                    </ButtonGroup>
                                </div>
                            </div>
                        )}
                        <div id="view-container">
                            <Canvas
                                style={{
                                    backgroundColor: "black",
                                    borderStyle: "solid",
                                    borderColor: viewMode === ViewMode.Frozen ? "#f0ad4e" : "black",
                                    cursor: viewMode === ViewMode.Selecting ? "pointer" : "default",
                                    borderWidth: "2px",
                                }}
                            >
                                <RecoilBridge>
                                    <FabricView
                                        tensegrity={tensegrity}
                                        selection={selection}
                                        setSelection={setSelection}
                                    />
                                </RecoilBridge>
                            </Canvas>
                        </div>
                        <div id="bottom-middle">
                            <FeatureSlider
                                featureValue={FEATURE_VALUES[WorldFeature.VisualStrain]}
                                apply={(feature, percent, value) => {
                                    if (tensegrity) {
                                        tensegrity.instance.applyFeature(feature, percent, value)
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
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
            <span>{stageName(stage)}</span> <i>"{tensegrity.name}"</i>
        </div>
    )
}

function ViewModeButton({item, children, click}: {
    item: ViewMode, click?: () => void,
    children: JSX.Element | (JSX.Element[] | JSX.Element | undefined)[],
}): JSX.Element {
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)
    return (
        <Button
            disabled={item === viewMode}
            color={item === viewMode ? "success" : "secondary"}
            onClick={() => {
                setViewMode(item)
                if (click) {
                    click()
                }
            }}
        >
            {children}
        </Button>
    )
}
