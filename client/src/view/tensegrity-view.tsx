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
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { getCodeFromLocationBar, getRecentCode, ICode } from "./code-panel"
import { ControlTabs } from "./control-tabs"
import { FabricView } from "./fabric-view"

const SPLIT_LEFT = "34em"
const SPLIT_RIGHT = "35em"

export function TensegrityView({buildFabric, features, bootstrapCode, lifePhase$, pretensingStep$}: {
    buildFabric: (code: ICode) => TensegrityFabric,
    features: FloatFeature[],
    bootstrapCode: ICode [],
    lifePhase$: BehaviorSubject<number>,
    pretensingStep$: BehaviorSubject<number>,
}): JSX.Element {


    const [showBars, setShowBars] = useState(true)
    const [showCables, setShowCables] = useState(true)
    const [fastMode, setFastMode] = useState(true)
    const [fullScreen, setFullScreen] = useState(false)

    const [code, setCode] = useState<ICode | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()

    console.log("TV")

    useEffect(() => {
        const urlCode = getCodeFromLocationBar().pop()
        const recentCode = getRecentCode().pop()
        if (urlCode && recentCode && urlCode.codeString !== recentCode.codeString) {
            setCode(urlCode)
        }
    }, [])
    useEffect(() => {
        if (fabric) {
            fabric.instance.engine.setColoring(showBars, showCables)
        }
    }, [showBars, showCables])

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
            {fullScreen || !fabric ? (
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
                        lifePhase$={lifePhase$}
                        pretensingStep$={pretensingStep$}
                        bootstrapCode={bootstrapCode}
                        features={features}
                        showBars={showBars}
                        setShowBars={setShowBars}
                        showCables={showCables}
                        setShowCables={setShowCables}
                        fastMode={fastMode}
                        setFastMode={setFastMode}
                        selectedBrick={selectedBrick}
                        setSelectedBrick={setSelectedBrick}
                        code={code}
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
                                lifePhase$={lifePhase$}
                                pretensingStep$={pretensingStep$}
                                selectedBrick={selectedBrick}
                                setSelectedBrick={setSelectedBrick}
                                autoRotate={false}
                                fastMode={fastMode}
                                showBars={showBars}
                                showCables={showCables}
                            />
                        </Canvas>
                    </div>
                )}
            </div>
        </div>
    )
}
