/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaAngleDoubleRight } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, lengthFeatureToRole } from "../fabric/fabric-engine"
import { fabricFeatureValue, FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import { DRAG, GRAVITY, IFabricState, LifePhase } from "../fabric/fabric-state"
import { ICode } from "../fabric/tenscript"
import { IBrick, IInterval, percentToFactor } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { getCodeFromUrl, getRecentCode } from "./code-panel"
import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { ToolbarLeft } from "./toolbar-left"
import { ToolbarRight } from "./toolbar-right"

const SPLIT_LEFT = "34em"
const SPLIT_RIGHT = "35em"

export function TensegrityView({fabricKernel, features, bootstrapCode, fabricState$, lifePhase$}: {
    fabricKernel: FabricKernel,
    features: FloatFeature[],
    bootstrapCode: ICode[],
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {
    const [code, setCode] = useState<ICode | undefined>()
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [fullScreen, setFullScreen] = useState(fabricState$.getValue().fullScreen)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            setFullScreen(newState.fullScreen)
            if (fabric) {
                const instance = fabric.instance
                instance.engine.setColoring(newState.showPushes, newState.showPulls)
                instance.engine.setSurfaceCharacter(newState.surfaceCharacter)
                const gravity = GRAVITY[newState.gravityCharacter]
                features[FabricFeature.Gravity].setValue(gravity)
                instance.setFeatureValue(FabricFeature.Gravity, gravity)
                const drag = DRAG[newState.dragCharacter]
                features[FabricFeature.Drag].setValue(drag)
                instance.setFeatureValue(FabricFeature.Drag, drag)
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

    const stateChange = (modifier: (currentState: IFabricState) => IFabricState) => {
        const nextValue = modifier(fabricState$.getValue())
        nextValue.nonce = fabricState$.getValue().nonce + 1
        fabricState$.next(nextValue)
    }

    useEffect(() => {
        const urlCode = getCodeFromUrl()
        const recentCode = getRecentCode().pop()
        if (urlCode && recentCode && urlCode.codeString !== recentCode.codeString) {
            setCode(urlCode)
            stateChange(currentState => ({...currentState, code: urlCode}))
        }
    }, [])

    function buildFromCode(): void {
        if (!code || !mainInstance || !slackInstance) {
            return
        }
        setFabric(new TensegrityFabric(mainInstance, slackInstance, features, code, lifePhase$))
        location.hash = code.codeString
    }

    function pretense(): void {
        if (!fabric) {
            return
        }

        const strains = fabric.instance.strains
        const getMedian = (intervals: IInterval[]) => {
            const sorted = intervals.map(interval => strains[interval.index]).sort((a, b) => a - b)
            return sorted[Math.floor(sorted.length / 2)]
        }
        const pushMedian = getMedian(fabric.intervals.filter(interval => interval.isPush))
        const pullMedian = getMedian(fabric.intervals.filter(interval => !interval.isPush))
        const intensity = fabricFeatureValue(FabricFeature.PretenseIntensity)
        const elasticities = fabric.instance.elasticities
        const changes = fabric.intervals.map(interval => {
            const median = interval.isPush ? pushMedian : pullMedian
            const strain = strains[interval.index] - median
            return 1 + (interval.isPush ? -strain : strain) * intensity
        })
        fabric.toSlack(elasticities.map((value, index) => value * changes[index]))
        setTimeout(() => fabric.toPretensing(), 200)
    }

    useEffect(buildFromCode, [code])

    return (
        <div className="the-whole-page">
            {fullScreen ? (
                <Button color="dark" style={{
                    position: "absolute",
                    padding: 0,
                    margin: 0,
                    top: 0,
                    left: 0,
                    height: "100%",
                    zIndex: 1,
                }} onClick={() => stateChange(currentState => ({...currentState, fullScreen: false}))}>
                    <FaAngleDoubleRight/>
                </Button>
            ) : (
                <div style={{
                    position: "absolute",
                    visibility: fullScreen ? "collapse" : "visible",
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
                        setCode={setCode}
                        fabricState$={fabricState$}
                        lifePhase$={lifePhase$}
                        bootstrapCode={bootstrapCode}
                        features={features}
                        pretense={pretense}
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
                    <h1>Canvas</h1>
                ) : (
                    <div id="tensegrity-view" className="h-100">
                        {!code ? undefined : (
                            <div id="top-middle">
                                {code.codeString}
                            </div>
                        )}
                        <ToolbarLeft
                            fabricState$={fabricState$}
                        />
                        <ToolbarRight
                            fabric={fabric}
                            lifePhase$={lifePhase$}
                        />
                        <Canvas style={{
                            backgroundColor: "black",
                        }}>
                            <FabricView
                                fabric={fabric}
                                selectedBrick={selectedBrick}
                                setSelectedBrick={setSelectedBrick}
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
