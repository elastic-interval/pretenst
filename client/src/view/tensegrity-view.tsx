/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaAngleDoubleRight } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { IFabricState } from "../fabric/fabric-state"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { getCodeFromUrl, getRecentCode, ICode } from "./code-panel"
import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"

const SPLIT_LEFT = "34em"
const SPLIT_RIGHT = "35em"

export function TensegrityView({buildFabric, features, bootstrapCode, fabricState$}: {
    buildFabric: (code: ICode) => TensegrityFabric,
    features: FloatFeature[],
    bootstrapCode: ICode[],
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {

    const [fullScreen, setFullScreen] = useState(false)
    const [code, setCode] = useState<ICode | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()
    const [fabricState, updateFabricState] = useState(fabricState$.getValue())

    useEffect(() => {
        const subscription = fabricState$.subscribe(updateFabricState)
        return () => subscription.unsubscribe()
    })

    const setFabricState = (newState: IFabricState) => {
        fabricState$.next(newState)
    }

    useEffect(() => {
        const urlCode = getCodeFromUrl()
        const recentCode = getRecentCode().pop()
        if (urlCode && recentCode && urlCode.codeString !== recentCode.codeString) {
            setCode(urlCode)
        }
    }, [])

    useEffect(() => {
        if (fabric) {
            fabric.instance.engine.setColoring(fabricState.showPushes, fabricState.showPulls)
        }
    }, [fabricState])

    function buildFromCode(): void {
        if (!code) {
            return
        }
        setSelectedBrick(undefined)
        if (fabric) {
            fabric.instance.release()
        }
        const builtFabric = buildFabric(code)
        setFabric(builtFabric)
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
                }} onClick={() => setFullScreen(false)}>
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
                        fabricState={fabricState}
                        setFabricState={setFabricState}
                        bootstrapCode={bootstrapCode}
                        features={features}
                        selectedBrick={selectedBrick}
                        setSelectedBrick={setSelectedBrick}
                        setCode={setCode}
                        rebuild={buildFromCode}
                        setFullScreen={setFullScreen}
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
                        <Canvas style={{
                            backgroundColor: "black",
                        }}>
                            <FabricView
                                fabric={fabric}
                                fabricState={fabricState}
                                setFabricState={setFabricState}
                                selectedBrick={selectedBrick}
                                setSelectedBrick={setSelectedBrick}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </div>
    )
}
