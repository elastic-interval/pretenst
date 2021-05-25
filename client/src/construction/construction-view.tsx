/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default_world_feature, SurfaceCharacter, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { FaPlay } from "react-icons/all"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState, useSetRecoilState } from "recoil"
import { PerspectiveCamera, Vector3 } from "three"

import { WORLD_FEATURES } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { compileTenscript, ITenscript, RunTenscript } from "../fabric/tenscript"
import { PostGrowthOp, Tensegrity } from "../fabric/tensegrity"
import { emptySelection, ISelection, percentOrHundred, Spin } from "../fabric/tensegrity-types"
import { SPHERE_RADIUS } from "../sphere/sphere-view"
import { FEATURE_VALUES, postGrowthAtom, ViewMode, viewModeAtom } from "../storage/recoil"
import { BottomLeft } from "../view/bottom-left"
import { featureMapping } from "../view/feature-mapping"

import { ObjectView } from "./object-view"

export const CONVERGENCE: ITenscript = {
    name: "Convergence",
    spin: Spin.LeftRight,
    postGrowthOp: PostGrowthOp.Bowtie,
    surfaceCharacter: SurfaceCharacter.Frozen,
    code: ["(a2,b(10,S90,MA1),c(10,S90,MA1),d(10,S90,MA1))"],
    markDefStrings: {
        1: "join",
    },
    featureValues: {},
}

export function ConstructionView({createInstance}: { createInstance: () => FabricInstance }): JSX.Element {
    const mainInstance = useMemo(() => createInstance(), [])
    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)
    const [selection, setSelection] = useState<ISelection>(emptySelection)
    const setPostGrowth = useSetRecoilState(postGrowthAtom)
    const worldFeatures = FEATURE_VALUES.map(({percentAtom}) => useRecoilState(percentAtom))
    const emergency = (message: string) => console.error("build view", message)

    const createTensegrity: RunTenscript = (ts: ITenscript, error: (message: string) => void) => {
        try {
            const tree = compileTenscript(ts, error)
            if (!tree) {
                return false
            }
            setViewMode(ViewMode.Lines)
            WORLD_FEATURES.map(feature => {
                const {percentToValue} = featureMapping(feature)
                const percent = worldFeatures[feature][0]
                mainInstance.applyFeature(feature, percent, percentToValue(percent))
            })
            setPostGrowth(ts.postGrowthOp)
            const localValue = ts.featureValues[WorldFeature.IntervalCountdown]
            const countdown = localValue === undefined ? default_world_feature(WorldFeature.IntervalCountdown) : localValue
            setTensegrity(new Tensegrity(new Vector3(), percentOrHundred(), mainInstance, countdown, ts, tree))
        } catch (e) {
            throw new Error("Problem running")
        }
        return true
    }
    useEffect(() => {createTensegrity(CONVERGENCE, emergency)}, [])

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
                            <ObjectCamera/>
                            <RecoilBridge>
                                <ObjectView
                                    tensegrity={tensegrity}
                                    selection={selection}
                                    setSelection={setSelection}
                                />
                            </RecoilBridge>
                        </Canvas>
                        <div id="bottom-left">
                            <BottomLeft/>
                        </div>
                    </div>
                )}
            </div>
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
        camera.position.set(0, SPHERE_RADIUS, SPHERE_RADIUS * 2.6)
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
