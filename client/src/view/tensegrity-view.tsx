/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaHammer, FaHandSpock, FaSeedling, FaYinYang } from "react-icons/all"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { FloatFeature } from "../fabric/fabric-features"
import { LifePhase } from "../fabric/life-phase"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { CodePanel, ICode } from "./code-panel"
import { FabricView } from "./fabric-view"
import { FeaturePanel } from "./feature-panel"
import { TensegrityControlPanel } from "./tensegrity-control-panel"

extend({OrbitControls})

declare global {
    namespace JSX {
        /* eslint-disable @typescript-eslint/interface-name-prefix */
        interface IntrinsicElements {
            orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>
        }

        /* eslint-enable @typescript-eslint/interface-name-prefix */
    }
}

interface IButtonCharacter {
    text: string,
    color: string,
    disabled: boolean,
    symbol: JSX.Element,
    onClick: () => void,
}

const SHOW_FEATURES_KEY = "ShowFeatures"

export function TensegrityView({buildFabric, features, pretensingStep$}: {
    buildFabric: (code: ICode) => TensegrityFabric,
    features: FloatFeature[],
    pretensingStep$: BehaviorSubject<number>,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(LifePhase.Growing)
    const [showFeatures, setShowFeatures] = useState(localStorage.getItem(SHOW_FEATURES_KEY) === "true")
    const [showFaces, setShowFaces] = useState(true)
    const [autoRotate, setAutoRotate] = useState(false)
    const [fastMode, setFastMode] = useState(true)

    const [code, setCode] = useState<ICode | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()

    useEffect(() => localStorage.setItem(SHOW_FEATURES_KEY, showFeatures.toString()), [showFeatures])

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
        setLifePhase(builtFabric.lifePhase)
        location.hash = code.codeString
        console.log("\n", JSON.stringify(code.codeTree))
    }

    useEffect(buildFromCode, [code])

    function PretenstButton(): JSX.Element {

        const [pretensingStep, setPretensingStep] = useState(pretensingStep$.getValue())

        useEffect(() => {
            const subscription = pretensingStep$.subscribe(setPretensingStep)
            return () => subscription.unsubscribe()
        })

        function character(): IButtonCharacter {
            switch (lifePhase) {
                case LifePhase.Growing:
                    return {
                        text: "Growing...",
                        symbol: <FaSeedling/>,
                        color: "warning",
                        disabled: true,
                        onClick: () => {
                        },
                    }
                case LifePhase.Shaping:
                    return {
                        text: "Shaping->Slack",
                        symbol: <FaHammer/>,
                        color: "success",
                        disabled: false,
                        onClick: () => {
                            if (fabric) {
                                setLifePhase(fabric.slack())
                            }
                        },
                    }
                case LifePhase.Slack:
                    return {
                        text: "Slack->Pretensing",
                        symbol: <FaYinYang/>,
                        color: "warning",
                        disabled: false,
                        onClick: () => {
                            if (fabric) {
                                setLifePhase(fabric.pretensing())
                            }
                        },
                    }
                case LifePhase.Pretensing:
                    return {
                        text: `Pretensing ${pretensingStep}%`,
                        symbol: <FaHammer/>,
                        color: "warning",
                        disabled: true,
                        onClick: () => {
                        },
                    }
                case LifePhase.Pretenst:
                    return {
                        symbol: <FaHandSpock/>,
                        color: "success",
                        text: "Pretenst!",
                        disabled: false,
                        onClick: () => {
                            setSelectedBrick(undefined)
                            if (fabric) {
                                fabric.clearSelection()
                            }
                            buildFromCode()
                        },
                    }
                default:
                    throw new Error()
            }
        }

        const {text, symbol, color, disabled, onClick} = character()
        return (
            <Button style={{width: "14em"}} color={color} disabled={disabled} onClick={onClick}>
                {symbol} <span> {text}</span>
            </Button>
        )
    }

    return (
        <div id="tensegrity-view" className="the-whole-page">
            {!fabric ? (
                <CodePanel setCode={setCode}/>
            ) : (
                <>
                    <Canvas>
                        <FabricView
                            fabric={fabric}
                            lifePhase={lifePhase}
                            setLifePhase={setLifePhase}
                            pretensingStep$={pretensingStep$}
                            selectedBrick={selectedBrick}
                            setSelectedBrick={setSelectedBrick}
                            autoRotate={autoRotate}
                            fastMode={fastMode}
                            showFaces={showFaces}
                        />
                    </Canvas>
                    {!showFeatures ? undefined : (
                        <div id="top-right">
                            <FeaturePanel
                                featureSet={features}
                                lifePhase={lifePhase}
                                instance={fabric.instance}
                            />
                        </div>
                    )}
                    {!code ? undefined : (
                        <div id="top-middle">
                            {code.codeString}
                        </div>
                    )}
                    <div id="bottom-middle">
                        <TensegrityControlPanel
                            fabric={fabric}
                            clearFabric={() => setFabric(undefined)}
                            setShowFaces={setShowFaces}
                            selectedBrick={selectedBrick}
                            setSelectedBrick={setSelectedBrick}
                            autoRotate={autoRotate}
                            setAutoRotate={setAutoRotate}
                            fastMode={fastMode}
                            setFastMode={setFastMode}
                            showFeatures={showFeatures}
                            setShowFeatures={setShowFeatures}
                        >
                            <PretenstButton/>
                        </TensegrityControlPanel>
                    </div>
                </>
            )}
        </div>
    )
}
