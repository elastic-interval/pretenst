/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default_world_feature, Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { FaPlay } from "react-icons/all"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState, useSetRecoilState } from "recoil"
import { PerspectiveCamera, Vector3 } from "three"

import { isPushRole, stageName, WORLD_FEATURES } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { compileTenscript, ITenscript, RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { IIntervalDetails } from "../fabric/tensegrity-types"
import { Twist } from "../fabric/twist"
import { builtSoFarAtom, postGrowthAtom, ViewMode, viewModeAtom } from "../storage/recoil"
import { BottomLeft } from "../view/bottom-left"
import { BottomRight } from "../view/bottom-right"
import { featureMapping } from "../view/feature-mapping"

import { ObjectView } from "./object-view"

export function ConstructionView({tenscript, createInstance}: {
    tenscript: ITenscript,
    createInstance: CreateInstance,
}): JSX.Element {
    const mainInstance = useMemo(() => createInstance(tenscript.featureValues), [])
    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [builtSoFar, setBuiltSoFar] = useRecoilState(builtSoFarAtom)
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)
    const [selected, setSelected] = useState<Twist | undefined>()
    const [details, setDetails] = useState<IIntervalDetails[]>([])
    const setPostGrowth = useSetRecoilState(postGrowthAtom)
    const emergency = (message: string) => console.error("build view", message)
    const [stage, updateStage] = useState<Stage | undefined>()

    useEffect(() => {
        if (stage === Stage.Pretenst && tensegrity) {
            if (builtSoFar.length !== tensegrity.joints.length) {
                setBuiltSoFar(tensegrity.joints.map(() => false))
            }
        }
    }, [stage, tensegrity])

    useEffect(() => {
        const sub = tensegrity ? tensegrity.stage$.subscribe(updateStage) : undefined
        return () => {
            if (sub) {
                sub.unsubscribe()
            }
        }
    }, [tensegrity])

    const createTensegrity: RunTenscript = (ts: ITenscript, error: (message: string) => void) => {
        try {
            const tree = compileTenscript(ts, error)
            if (!tree) {
                return false
            }
            setViewMode(ViewMode.Time)
            setPostGrowth(ts.postGrowthOp)
            const featureValues = ts.featureValues
            WORLD_FEATURES.map(key => {
                const feature = WorldFeature[key]
                const {percentToValue} = featureMapping(feature)
                const percent = featureValues ? featureValues[key] : undefined
                if (percent !== undefined) {
                    mainInstance.applyFeature(feature, percent, percentToValue(percent))
                }
            })
            const localValue = featureValues ? featureValues[WorldFeature.IntervalCountdown] : undefined
            const countdown = localValue === undefined ? default_world_feature(WorldFeature.IntervalCountdown) : localValue
            setTensegrity(new Tensegrity(new Vector3(), mainInstance, countdown, ts, tree))
        } catch (e) {
            throw new Error("Problem running")
        }
        return true
    }
    useEffect(() => {
        createTensegrity(tenscript, emergency)
    }, [])
    useEffect(() => {
        if (viewMode === ViewMode.Time) {
            setSelected(undefined)
        }
    }, [viewMode])
    useEffect(() => {
        if (tensegrity) {
            if (selected) {
                setDetails(selected.pushes.map(push => tensegrity.getIntervalDetails(push)))
            } else {
                setDetails([])
            }
        }
    }, [selected])

    const Title = () => {
        switch (viewMode) {
            case ViewMode.Time:
                return <span>{stage !== undefined ? stageName(stage) : "New"} {tensegrity ? `"${tensegrity.name}"` : ""}</span>
            case ViewMode.Select:
                return <span>Select (shift-click) for info</span>
            case ViewMode.Look:
                return <span>{tensegrity ? `"${tensegrity.name}"` : ""}</span>
        }
    }

    const RecoilBridge = useRecoilBridgeAcrossReactRoots_UNSTABLE()
    return (
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
                        <ObjectCamera/>
                        <RecoilBridge>
                            <ObjectView
                                tensegrity={tensegrity}
                                selected={selected}
                                setSelected={setSelected}
                                builtSoFar={builtSoFar}
                                setBuiltSoFar={setBuiltSoFar}
                                details={details}
                                clickDetails={({interval}) => {
                                    if (!selected || !tensegrity) {
                                        return
                                    }
                                    if (details.length === 1) { // one pull, presumably
                                        setDetails(selected.adjacentPulls.map(pull => tensegrity.getIntervalDetails(pull)))
                                    } else {
                                        if (isPushRole(interval.intervalRole)) {
                                            setDetails(selected.adjacentPulls.map(pull => tensegrity.getIntervalDetails(pull)))
                                        } else {
                                            setDetails(details.filter(d => d.interval.index === interval.index))
                                        }
                                    }
                                }}
                            />
                        </RecoilBridge>
                    </Canvas>
                    <div id="top-middle">
                        <Title/>
                    </div>
                    <div id="bottom-left">
                        <BottomLeft/>
                    </div>
                    <div id="bottom-right">
                        <BottomRight tensegrity={tensegrity}/>
                    </div>
                </div>
            )}
        </div>
    )
}

function ObjectCamera(props: object): JSX.Element {
    const ref = useRef<PerspectiveCamera>()
    const {setDefaultCamera} = useThree()
    // Make the camera known to the system
    useEffect(() => {
        const camera = ref.current
        if (!camera) {
            throw new Error("No camera")
        }
        camera.fov = 50
        camera.position.set(0, 6, 18)
        setDefaultCamera(camera)
    }, [])
    // Update it every frame
    useFrame(() => {
        const camera = ref.current
        if (!camera) {
            throw new Error("No camera")
        }
        camera.updateMatrixWorld()
    })
    return <perspectiveCamera ref={ref} {...props} />
}
