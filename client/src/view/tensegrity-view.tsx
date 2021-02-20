/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default_world_feature, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaPlay, FaToolbox } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button } from "reactstrap"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState } from "recoil"
import { Vector3 } from "three"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { WORLD_FEATURES } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { compileTenscript, ITenscript, RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { emptySelection, ISelection, percentOrHundred } from "../fabric/tensegrity-types"
import {
    bootstrapIndexAtom,
    demoModeAtom,
    FEATURE_VALUES,
    tenscriptAtom,
    ViewMode,
    viewModeAtom,
} from "../storage/recoil"

import { BottomLeft } from "./bottom-left"
import { BottomMiddle } from "./bottom-middle"
import { BottomRight } from "./bottom-right"
import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { featureMapping } from "./feature-mapping"
import { TopLeft } from "./top-left"
import { TopMiddle } from "./top-middle"
import { TopRight } from "./top-right"

const SPLIT_LEFT = "25em"
const SPLIT_RIGHT = "26em"

export function TensegrityView({createInstance}: { createInstance: CreateInstance }): JSX.Element {

    const mainInstance = useMemo(() => createInstance(false), [])
    const worldFeatures = FEATURE_VALUES.map(({percentAtom}) => useRecoilState(percentAtom))
    const [tenscript, setTenscript] = useRecoilState(tenscriptAtom)
    const [bootstrapIndex] = useRecoilState(bootstrapIndexAtom)
    const [demoMode] = useRecoilState(demoModeAtom)
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)

    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [selection, setSelection] = useState<ISelection>(emptySelection)
    const [fullScreen, setFullScreen] = useState(false)

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
        WORLD_FEATURES.map(feature => {
            const {percentToValue} = featureMapping(feature)
            const percent = worldFeatures[feature][0]
            mainInstance.applyFeature(feature, percent, percentToValue(percent))
        })
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
                    style={{visibility: fullScreen ? "collapse" : "visible", width: SPLIT_LEFT}}
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
                        <div id="top-left">
                            <TopLeft tensegrity={tensegrity}/>
                        </div>
                        <div id="top-middle">
                            <TopMiddle tensegrity={tensegrity}/>
                        </div>
                        <div id="top-right">
                            <TopRight tensegrity={tensegrity}/>
                        </div>
                        <div id="bottom-right">
                            <BottomRight tensegrity={tensegrity}/>
                        </div>
                        <div id="bottom-left">
                            <BottomLeft/>
                        </div>
                        <div id="bottom-middle">
                            <BottomMiddle tensegrity={tensegrity}/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

