/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaMale, FaPlay, FaRunning, FaSyncAlt, FaToolbox } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { switchToVersion, Version, versionFromUrl } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { FloatFeature } from "../fabric/float-feature"
import { BOOTSTRAP, getCodeFromUrl, ITenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { IBrickFace, IInterval, intervalsOfFaces, percentOrHundred } from "../fabric/tensegrity-types"
import { getRecentTenscript, IStoredState, transition } from "../storage/stored-state"

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
    if (versionFromUrl() !== Version.Design) {
        switchToVersion(versionFromUrl())
    }
    const recentCode = getRecentTenscript(state)
    return recentCode.length > 0 ? recentCode[0] : BOOTSTRAP[0]
}

export function TensegrityView({createInstance, worldFeatures, storedState$}: {
    createInstance: CreateInstance,
    worldFeatures: Record<WorldFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const mainInstance = useMemo(() => createInstance(false), [])

    const [tensegrity, setTensegrity] = useState<Tensegrity | undefined>()
    const [selectedFaces, setSelectedFaces] = useState<IBrickFace[]>([])
    const [selectedIntervals, setSelectedIntervals] = useState<IInterval[]>([])
    useEffect(() => setSelectedIntervals(intervalsOfFaces(selectedFaces)), [selectedFaces])

    const [rootTenscript, setRootTenscript] = useState(() => getCodeToRun(storedState$.getValue()))
    useEffect(() => {
        if (!location.hash.startsWith("#`")) {
            location.hash = rootTenscript.code
        }
    }, [rootTenscript])

    const [rotating, updateRotating] = useState(storedState$.getValue().rotating)
    const [shapeSelection, setShapeSelection] = useState(ShapeSelection.None)
    const [fullScreen, updateFullScreen] = useState(storedState$.getValue().fullScreen)
    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    useEffect(() => {
        const subscription = storedState$.subscribe(storedState => {
            updateFullScreen(storedState.fullScreen)
            updatePolygons(storedState.polygons)
            updateRotating(storedState.rotating)
            if (!tensegrity) {
                return
            }
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
        location.hash = newTenscript.code
        worldFeatures[WorldFeature.ShapingPretenstFactor].percent = 100
        worldFeatures[WorldFeature.ShapingDrag].percent = 100
        worldFeatures[WorldFeature.ShapingStiffnessFactor].percent = 100
        storedState$.next(transition(storedState$.getValue(), {polygons: false}))
        const numericFeature = (feature: WorldFeature) => storedState$.getValue().featureValues[feature].numeric
        setTensegrity(new Tensegrity(new Vector3(), newTenscript.symmetrical, 0, percentOrHundred(), numericFeature, mainInstance, newTenscript))
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!tensegrity) {
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
                        worldFeatures={worldFeatures}
                        rootTenscript={rootTenscript}
                        setRootTenscript={setRootTenscript}
                        tensegrity={tensegrity}
                        setFabric={setTensegrity}
                        selectedIntervals={selectedIntervals}
                        shapeSelection={shapeSelection}
                        setShapeSelection={setShapeSelection}
                        selectedFaces={selectedFaces}
                        clearSelection={() => {
                            setSelectedFaces([])
                            setSelectedIntervals([])
                        }}
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
                        <div id="bottom-right">
                            <ButtonGroup>
                                <Button
                                    color={rotating ? "warning" : "secondary"}
                                    onClick={() => storedState$.next(transition(storedState$.getValue(), {rotating: !rotating}))}
                                >
                                    <FaSyncAlt/>
                                </Button>
                            </ButtonGroup>
                        </div>
                        <div id="bottom-left">
                            <ButtonGroup>
                                <Button
                                    disabled={!polygons}
                                    color={!polygons ? "success" : "secondary"}
                                    onClick={() => storedState$.next(transition(storedState$.getValue(), {polygons: false}))}
                                >
                                    <FaRunning/>
                                </Button>
                                <Button
                                    disabled={polygons}
                                    color={polygons ? "success" : "secondary"}
                                    onClick={() => storedState$.next(transition(storedState$.getValue(), {polygons: true}))}
                                >
                                    <FaMale/>
                                </Button>
                            </ButtonGroup>
                        </div>
                        <div id="view-container" className="h-100">
                            <Canvas style={{
                                backgroundColor: "black",
                                borderStyle: "solid",
                                borderColor: shapeSelection === ShapeSelection.Faces || polygons ? "#f0ad4e" : "black",
                                cursor: shapeSelection === ShapeSelection.Faces ? "pointer" : "all-scroll",
                                borderWidth: "2px",
                            }}>
                                <FabricView
                                    tensegrity={tensegrity}
                                    selectedIntervals={selectedIntervals}
                                    toggleSelectedInterval={interval => setSelectedIntervals(intervals => intervals.filter(i => i.index !== interval.index))}
                                    selectedFaces={selectedFaces}
                                    setSelectedFaces={setSelectedFaces}
                                    shapeSelection={shapeSelection}
                                    polygons={polygons}
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
    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])
    return (
        <div id="top-middle">
            <span>{Stage[life.stage]}</span> <i>"{tensegrity.tenscript.name}"</i>
        </div>
    )
}
