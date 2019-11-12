/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaArrowRight, FaClock, FaRunning } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, lengthFeatureToRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import {
    DRAG_LEVEL,
    GRAVITY_LEVEL,
    IFabricState,
    LifePhase,
    PRETENSE_FACTOR,
    PRETENSE_SPEED,
    PUSH_STRAIN_FACTOR,
} from "../fabric/fabric-state"
import { ITenscript } from "../fabric/tenscript"
import { IBrick, percentToFactor } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { getCodeFromUrl, getRecentCode } from "./tenscript-panel"
import { ToolbarLeft } from "./toolbar-left"
import { ToolbarRightBottom } from "./toolbar-right-bottom"
import { ToolbarRightTop } from "./toolbar-right-top"

const SPLIT_LEFT = "29em"
const SPLIT_RIGHT = "30em"

export function TensegrityView({fabricKernel, features, bootstrap, fabricState$, lifePhase$}: {
    fabricKernel: FabricKernel,
    features: FloatFeature[],
    bootstrap: ITenscript[],
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {
    const [tenscript, setTenscript] = useState<ITenscript | undefined>(getCodeFromUrl)
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [frozen, setFrozen] = useState(false)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            if (fabric) {
                const instance = fabric.instance
                instance.engine.setColoring(newState.showPushes, newState.showPulls)
                instance.engine.setSurfaceCharacter(newState.surfaceCharacter)
                const adjust = (feature: FabricFeature, array: number[], choice: number) => {
                    const value = array[choice]
                    features[feature].setValue(value)
                    instance.setFeatureValue(feature, value)
                }
                adjust(FabricFeature.Gravity, GRAVITY_LEVEL, newState.gravityLevel)
                adjust(FabricFeature.Drag, DRAG_LEVEL, newState.dragLevel)
                adjust(FabricFeature.PretenseFactor, PRETENSE_FACTOR, newState.pretenseFactor)
                adjust(FabricFeature.PretenseTicks, PRETENSE_SPEED, newState.pretenseSpeed)
                adjust(FabricFeature.PushStrainFactor, PUSH_STRAIN_FACTOR, newState.pushStrainFactor)
            }
        })
        return () => subscription.unsubscribe()
    })
    useEffect(() => {
        const subscriptions = features.map(feature => feature.onChange(() => {
            if (!fabric) {
                return
            }
            fabric.instance.applyFeature(feature)
            const intervalRole = lengthFeatureToRole(feature.config.feature)
            if (intervalRole !== undefined) {
                const engine = fabric.instance.engine
                fabric.intervals
                    .filter(interval => interval.intervalRole === intervalRole)
                    .forEach(interval => {
                        const scaledLength = feature.factor * percentToFactor(interval.scale)
                        engine.changeRestLength(interval.index, scaledLength)
                    })
            }
        }))
        return () => subscriptions.forEach(sub => sub.unsubscribe())
    })
    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])

    useEffect(() => {
        const urlCode = getCodeFromUrl()
        const recentCode = getRecentCode()
        const storedCode = recentCode.length > 0 ? recentCode[0] : bootstrap[0]
        if (storedCode) {
            const initialCode = urlCode && urlCode.code !== storedCode.code ? urlCode : storedCode
            setTenscript(initialCode)
        }
    }, [])

    function grow(): void {
        if (!tenscript || !mainInstance || !slackInstance) {
            return
        }
        mainInstance.forgetDimensions()
        mainInstance.engine.initInstance()
        lifePhase$.next(LifePhase.Growing)
        setFabric(new TensegrityFabric(mainInstance, slackInstance, features, tenscript))
        location.hash = tenscript.code
    }

    return (
        <div className="the-whole-page">
            {frozen ? (
                <Button
                    color="dark"
                    style={{
                        position: "absolute",
                        padding: 0,
                        margin: 0,
                        top: 0,
                        left: 0,
                        height: "100%",
                        zIndex: 1,
                    }}
                    onClick={() => setFrozen(false)}
                >
                    <FaClock/>
                    <br/>
                    <FaArrowRight/>
                </Button>
            ) : (
                <div style={{
                    position: "absolute",
                    visibility: frozen ? "collapse" : "visible",
                    left: 0,
                    width: SPLIT_LEFT,
                    height: "100%",
                    borderStyle: "solid",
                    borderColor: "#5c5c5c",
                    borderLeftWidth: 0,
                    borderTopWidth: 0,
                    borderBottomWidth: 0,
                    borderRightWidth: "1px",
                    color: "#136412",
                    backgroundColor: "#000000",
                }}>
                    <ControlTabs
                        fabric={fabric}
                        selectedBrick={selectedBrick}
                        setSelectedBrick={setSelectedBrick}
                        tenscript={tenscript}
                        setTenscript={setTenscript}
                        growFabric={grow}
                        setFrozen={setFrozen}
                        fabricState$={fabricState$}
                        lifePhase$={lifePhase$}
                        bootstrapCode={bootstrap}
                        features={features}
                    />
                </div>
            )}
            <div style={{
                position: "absolute",
                left: frozen ? 0 : SPLIT_RIGHT,
                right: 0,
                height: "100%",
            }}>
                {!fabric ? (
                    <div id="tensegrity-view" className="h-100">
                        <div style={{
                            position: "relative",
                            top: "50%",
                            left: "50%",
                        }}>
                            <h1><FaRunning/></h1>
                        </div>
                    </div>
                ) : (
                    <div id="tensegrity-view" className="h-100">
                        {!tenscript ? undefined : (
                            <div id="top-middle">
                                {tenscript.code}
                            </div>
                        )}
                        <ToolbarLeft
                            fabric={fabric}
                            fabricState$={fabricState$}
                            lifePhase$={lifePhase$}
                            fullScreen={frozen}
                        />
                        <ToolbarRightBottom
                            fabric={fabric}
                            lifePhase$={lifePhase$}
                            fabricState$={fabricState$}
                        />
                        <ToolbarRightTop
                            fabric={fabric}
                            fabricState$={fabricState$}
                        />
                        <Canvas style={{
                            backgroundColor: "black",
                        }}>
                            <FabricView
                                fabric={fabric}
                                selectedBrick={selectedBrick}
                                setSelectedBrick={setSelectedBrick}
                                frozen={frozen}
                                fabricState$={fabricState$}
                                lifePhase$={lifePhase$}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </div>
    )
}
