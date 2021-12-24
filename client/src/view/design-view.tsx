/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Canvas } from "@react-three/fiber"
import { default_world_feature, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaPlay } from "react-icons/all"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState, useSetRecoilState } from "recoil"
import { Vector3 } from "three"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { WORLD_FEATURES } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { compileTenscript, ITenscript, RunTenscript, TenscriptBuilder } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import {
    bootstrapIndexAtom,
    FEATURE_VALUES,
    postGrowthAtom,
    selectedTwistAtom,
    STORAGE_KEY,
    tenscriptAtom,
    ViewMode,
    viewModeAtom,
    visibleDetailsAtom,
} from "../storage/recoil"

import { BottomLeft } from "./bottom-left"
import { BottomMiddle } from "./bottom-middle"
import { BottomRight } from "./bottom-right"
import { FabricView } from "./fabric-view"
import { featureMapping } from "./feature-mapping"
import { TopLeft } from "./top-left"
import { TopMiddle } from "./top-middle"
import { TopRight } from "./top-right"

export function DesignView({createInstance}: { createInstance: CreateInstance }): JSX.Element {

    const mainInstance = useMemo(() => createInstance({}), [])
    const worldFeatures = FEATURE_VALUES.map(({percentAtom}) => useRecoilState(percentAtom))
    const [tenscript, setTenscript] = useRecoilState(tenscriptAtom)
    const [bootstrapIndex] = useRecoilState(bootstrapIndexAtom)
    const setPostGrowth = useSetRecoilState(postGrowthAtom)
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)

    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [selected, setSelected] = useRecoilState(selectedTwistAtom)
    const [details, setDetails] = useRecoilState(visibleDetailsAtom)
    useEffect(() => {
        if (tensegrity) {
            if (selected) {
                setDetails(selected.pushes.map(push => tensegrity.getIntervalDetails(push)))
            } else {
                setDetails([])
            }
        }
    }, [selected])
    const emergency = (message: string) => console.error("tensegrity view", message)

    const runTenscript: RunTenscript = (ts: ITenscript, error: (message: string) => void) => {
        try {
            const tree = compileTenscript(ts, error)
            if (!tree) {
                return false
            }
            setViewMode(ViewMode.Time)
            setSelected(undefined)
            const featureValues = ts.featureValues
            const localValue = featureValues ? featureValues[WorldFeature.IntervalCountdown] : undefined
            const countdown = localValue === undefined ? default_world_feature(WorldFeature.IntervalCountdown) : localValue
            setTenscript(ts)
            WORLD_FEATURES.map(key => {
                const feature = WorldFeature[key]
                const {percentToValue} = featureMapping(feature)
                const percent = featureValues ? featureValues[key] : undefined
                if (percent !== undefined) {
                    worldFeatures[feature][1](percent)
                    mainInstance.applyFeature(feature, percent, percentToValue(percent))
                }
            })
            setPostGrowth(ts.postGrowthOp)
            const builder = new TenscriptBuilder(new Vector3(), ts, tree)
            setTensegrity(new Tensegrity(mainInstance, countdown, builder))
        } catch (e) {
            console.log("Problem running", e)
            return runTenscript(BOOTSTRAP[bootstrapIndex], emergency)
        }
        return true
    }

    useEffect(() => {
        Object.keys(localStorage).filter(k => k !== STORAGE_KEY).forEach(k => localStorage.removeItem(k))
        if (tenscript) {
            runTenscript(tenscript, emergency)
        } else {
            runTenscript(BOOTSTRAP[bootstrapIndex], emergency)
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
                                borderColor: viewMode !== ViewMode.Time ? "#f0ad4e" : "black",
                                cursor: viewMode === ViewMode.Select ? "pointer" : "default",
                                borderWidth: "2px",
                            }}
                        >
                            <RecoilBridge>
                                <FabricView
                                    tensegrity={tensegrity}
                                    clickDetails={({interval}) => {
                                        if (!selected || !tensegrity) {
                                            return
                                        }
                                        if (details.length === 1) { // one pull, presumably
                                            setDetails(selected.adjacentPulls.map(pull => tensegrity.getIntervalDetails(pull)))
                                        } else {
                                            if (interval.role.push) {
                                                setDetails(selected.adjacentPulls.map(pull => tensegrity.getIntervalDetails(pull)))
                                            } else {
                                                setDetails(details.filter(d => d.interval.index === interval.index))
                                            }
                                        }
                                    }}
                                />
                            </RecoilBridge>
                        </Canvas>
                        <div id="top-left">
                            <TopLeft tensegrity={tensegrity} runTenscript={runTenscript}/>
                        </div>
                        <div id="top-right">
                            <TopRight tensegrity={tensegrity} selected={selected}/>
                        </div>
                        <div id="bottom-left">
                            <BottomLeft/>
                        </div>
                        <div id="bottom-middle" style={{width: "60%"}}>
                            <BottomMiddle tensegrity={tensegrity}/>
                        </div>
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

