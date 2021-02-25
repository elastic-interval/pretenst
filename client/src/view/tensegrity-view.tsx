/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default_world_feature, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaPlay } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState } from "recoil"
import { Vector3 } from "three"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { WORLD_FEATURES } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { compileTenscript, ITenscript, RunTenscript } from "../fabric/tenscript"
import { PostGrowthOp, Tensegrity } from "../fabric/tensegrity"
import { emptySelection, ISelection, percentOrHundred } from "../fabric/tensegrity-types"
import {
    bootstrapIndexAtom,
    demoModeAtom,
    FEATURE_VALUES,
    STORAGE_KEY,
    tenscriptAtom,
    ViewMode,
    viewModeAtom,
} from "../storage/recoil"

import { BottomLeft } from "./bottom-left"
import { BottomMiddle } from "./bottom-middle"
import { BottomRight } from "./bottom-right"
import { FabricView } from "./fabric-view"
import { featureMapping } from "./feature-mapping"
import { TopLeft } from "./top-left"
import { TopMiddle } from "./top-middle"
import { TopRight } from "./top-right"

export function TensegrityView({createInstance}: { createInstance: CreateInstance }): JSX.Element {

    const mainInstance = useMemo(() => createInstance(false), [])
    const worldFeatures = FEATURE_VALUES.map(({percentAtom}) => useRecoilState(percentAtom))
    const [tenscript, setTenscript] = useRecoilState(tenscriptAtom)
    const [bootstrapIndex] = useRecoilState(bootstrapIndexAtom)
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)
    const [demoMode] = useRecoilState(demoModeAtom)

    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [selection, setSelection] = useState<ISelection>(emptySelection)
    const emergency = (message: string) => console.error("tensegrity view", message)

    const runTenscript: RunTenscript = (ts: ITenscript, pg: PostGrowthOp, error: (message: string) => void) => {
        try {
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
            mainInstance.world.set_surface_character(ts.surfaceCharacter)
            setTensegrity(new Tensegrity(new Vector3(), percentOrHundred(), mainInstance, countdown, pg, ts, tree))
        } catch (e) {
            console.log("Problem running", e)
            return runTenscript(BOOTSTRAP[bootstrapIndex], PostGrowthOp.NoOop, emergency)
        }
        return true
    }

    useEffect(() => {
        Object.keys(localStorage).filter(k => k !== STORAGE_KEY).forEach(k => localStorage.removeItem(k))
        if (tenscript) {
            runTenscript(tenscript, PostGrowthOp.NoOop, emergency)
        } else {
            runTenscript(BOOTSTRAP[bootstrapIndex], PostGrowthOp.NoOop, emergency)
        }
    }, [])

    const RecoilBridge = useRecoilBridgeAcrossReactRoots_UNSTABLE()
    return (
        <div>
            <div style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "100%",
            }}>
                {!tensegrity ? (
                    <div className="h-100">
                        <div style={{position: "relative", top: "50%", left: "50%"}}>
                            <h1><FaPlay/></h1>
                        </div>
                    </div>
                ) : (
                    <div className="h-100">
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
                                    runTenscript={runTenscript}
                                    selection={selection}
                                    setSelection={setSelection}
                                />
                            </RecoilBridge>
                        </Canvas>
                        {demoMode ? undefined : (
                            <>
                                <div id="top-left">
                                    <TopLeft tensegrity={tensegrity} runTenscript={runTenscript}/>
                                </div>
                                <div id="top-right">
                                    <TopRight tensegrity={tensegrity} selection={selection}/>
                                </div>
                                <div id="bottom-left">
                                    <BottomLeft/>
                                </div>
                                <div id="bottom-middle">
                                    <BottomMiddle tensegrity={tensegrity}/>
                                </div>
                            </>
                        )}
                        <div id="top-middle">
                            <TopMiddle tensegrity={tensegrity}/>
                        </div>
                        <div id="bottom-right">
                            <BottomRight tensegrity={tensegrity}/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

