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

import { FloatFeature } from "../fabric/fabric-features"
import { FabricKernel } from "../fabric/fabric-kernel"
import { IFabricState } from "../fabric/fabric-state"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { getCodeFromUrl, getRecentCode, ICode } from "./code-panel"
import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"
import { ToolbarLeft } from "./toolbar-left"
import { ToolbarRight } from "./toolbar-right"

const SPLIT_LEFT = "34em"
const SPLIT_RIGHT = "35em"

export function TensegrityView({fabricKernel, features, bootstrapCode, fabricState$}: {
    fabricKernel: FabricKernel,
    features: FloatFeature[],
    bootstrapCode: ICode[],
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {

    const [code, setCode] = useState<ICode | undefined>()
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [fullScreen, setFullScreen] = useState(fabricState$.getValue().fullScreen)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            setFullScreen(newState.fullScreen)
            if (fabric) {
                fabric.instance.engine.setColoring(newState.showPushes, newState.showPulls)
            }
        })
        return () => subscription.unsubscribe()
    })
    const mainInstance = useMemo(() => fabricKernel.allocateInstance(), [])
    const slackInstance = useMemo(() => fabricKernel.allocateInstance(), [])

    const stateChange = (modifier: (currentState: IFabricState) => IFabricState) => {
        fabricState$.next(modifier(fabricState$.getValue()))
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
        setFabric(new TensegrityFabric(mainInstance, slackInstance, features, code.codeString, code.codeTree))
        location.hash = code.codeString
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
                        bootstrapCode={bootstrapCode}
                        features={features}
                        rebuild={buildFromCode}
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
                            fabricState$={fabricState$}
                        />
                        <Canvas style={{
                            backgroundColor: "black",
                        }}>
                            <FabricView
                                fabric={fabric}
                                selectedBrick={selectedBrick}
                                setSelectedBrick={setSelectedBrick}
                                fabricState$={fabricState$}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </div>
    )
}
