/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as EIG from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaCamera, FaHandPointUp, FaPlay, FaSyncAlt, FaToolbox } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, fabricFeatureIntervalRole, INTERVAL_ROLES, IntervalRole, Stage } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import { addNameToCode, BOOTSTRAP, getCodeFromUrl, ITenscript } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, IInterval, percentToFactor } from "../fabric/tensegrity-types"
import {
    getRecentTenscript,
    IFeatureValue,
    IStoredState,
    roleDefaultFromFeatures,
    transition,
} from "../storage/stored-state"

import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { ShapeSelection } from "./shape-tab"

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

function selectIntervals(faces: IFace[]): IInterval[] {
    return faces.reduce((accum, face) => {
        const unknown = (interval: IInterval) => !accum.some(existing => interval.index === existing.index)
        const pulls = face.pulls.filter(unknown)
        const pushes = face.pushes.filter(unknown)
        return [...accum, ...pushes, ...pulls]
    }, [] as IInterval[])
}

export function TensegrityView({fabricKernel, eigWorld, eigFabric, floatFeatures, storedState$}: {
    fabricKernel: FabricKernel,
    eigWorld: EIG.World,
    eigFabric: EIG.Fabric,
    floatFeatures: Record<FabricFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])

    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedIntervals, setSelectedIntervals] = useState<IInterval[]>([])
    const [selectedFaces, setSelectedFaces] = useState<IFace[]>([])
    useEffect(() => setSelectedIntervals(selectIntervals(selectedFaces)), [selectedFaces])

    const [rootTenscript, setRootTenscript] = useState(() => getCodeToRun(storedState$.getValue()))
    useEffect(() => {
        if (location.hash.length === 0) {
            location.hash = addNameToCode(rootTenscript.code, rootTenscript.name)
        }
    }, [rootTenscript])

    const [visibleRoles, setVisibleRoles] = useState(INTERVAL_ROLES)
    const [rotating, updateRotating] = useState(storedState$.getValue().rotating)
    const [shapeSelection, setShapeSelection] = useState(ShapeSelection.None)
    const [fullScreen, updateFullScreen] = useState(storedState$.getValue().fullScreen)
    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)
    useEffect(() => setVisibleRoles(INTERVAL_ROLES), [ellipsoids])
    useEffect(() => {
        const subscription = storedState$.subscribe(storedState => {
            console.log("eig joint count!", eigFabric.get_joint_count())
            updateFullScreen(storedState.fullScreen)
            updateEllipsoids(storedState.ellipsoids)
            updateRotating(storedState.rotating)
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
        floatFeatures[FabricFeature.ShapingPretenstFactor].percent = 100
        floatFeatures[FabricFeature.ShapingDrag].percent = 100
        floatFeatures[FabricFeature.ShapingStiffnessFactor].percent = 100
        storedState$.next(transition(storedState$.getValue(), {ellipsoids: false}))
        Object.keys(floatFeatures).map(k => floatFeatures[k]).forEach((feature: FloatFeature) => mainInstance.applyFeature(feature))
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(floatFeatures, role)
        const numericFeature = (feature: FabricFeature) => storedState$.getValue().featureValues[feature].numeric
        setFabric(new TensegrityFabric(roleLength, numericFeature, mainInstance, slackInstance, newTenscript))
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
                        shapeSelection={shapeSelection}
                        setShapeSelection={setShapeSelection}
                        selectedFaces={selectedFaces}
                        clearSelectedFaces={() => setSelectedFaces([])}
                        runTenscript={runTenscript}
                        toFullScreen={() => toFullScreen(true)}
                        visibleRoles={visibleRoles}
                        setVisibleRoles={setVisibleRoles}
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
                    <div className="h-100">
                        <TopMiddle fabric={fabric}/>
                        <div id="bottom-middle">
                            <ButtonGroup>
                                <Button
                                    color={ellipsoids ? "warning" : "secondary"}
                                    onClick={() => storedState$.next(transition(storedState$.getValue(), {ellipsoids: !ellipsoids}))}
                                >
                                    <FaCamera/>
                                </Button>
                                <Button
                                    color={shapeSelection === ShapeSelection.Faces ? "warning" : "secondary"}
                                    disabled={ellipsoids && shapeSelection === ShapeSelection.None}
                                    onClick={() => setShapeSelection(shapeSelection !== ShapeSelection.Faces ? ShapeSelection.Faces : ShapeSelection.None)}
                                >
                                    <span><FaHandPointUp/></span>
                                </Button>
                                <Button
                                    color={rotating ? "warning" : "secondary"}
                                    onClick={() => storedState$.next(transition(storedState$.getValue(), {rotating: !rotating}))}
                                >
                                    <FaSyncAlt/>
                                </Button>
                            </ButtonGroup>
                        </div>
                        <div id="view-container" className="h-100">
                            <Canvas style={{
                                backgroundColor: "black",
                                borderStyle: "solid",
                                borderColor: shapeSelection === ShapeSelection.Faces || ellipsoids ? "#f0ad4e" : "black",
                                cursor: shapeSelection === ShapeSelection.Faces ? "pointer" : "all-scroll",
                                borderWidth: "2px",
                            }}>
                                <FabricView
                                    fabric={fabric}
                                    fabricError={error => {
                                        console.error(error)
                                        const tenscript = fabric.tenscript
                                        setFabric(undefined)
                                        setTimeout(() => runTenscript(tenscript), 1000)
                                    }}
                                    selectedIntervals={selectedIntervals}
                                    selectedFaces={selectedFaces}
                                    setSelectedFaces={setSelectedFaces}
                                    shapeSelection={shapeSelection}
                                    ellipsoids={ellipsoids}
                                    visibleRoles={visibleRoles}
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
