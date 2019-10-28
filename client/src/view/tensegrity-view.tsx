/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp,
    FaBars,
    FaBiohazard,
    FaCamera,
    FaCircle,
    FaCompressArrowsAlt,
    FaCubes,
    FaDotCircle,
    FaFileCsv,
    FaHammer,
    FaHandPointUp,
    FaHandRock,
    FaHandSpock,
    FaListAlt,
    FaParachuteBox,
    FaRadiationAlt,
    FaSeedling,
    FaSyncAlt,
    FaTimesCircle,
    FaYinYang,
} from "react-icons/all"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle, Navbar } from "reactstrap"
import { BehaviorSubject } from "rxjs"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { SurfaceCharacter } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { LifePhase } from "../fabric/life-phase"
import { optimizeFabric } from "../fabric/tensegrity-brick"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

import { CodePanel, ICode } from "./code-panel"
import { FabricView } from "./fabric-view"
import { FeaturePanel } from "./feature-panel"
import { StrainPanel } from "./strain-panel"

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
    const [surfaceCharacter, setSurfaceCharacter] = useState(SurfaceCharacter.Sticky)
    const [showBars, setShowBars] = useState(true)
    const [showCables, setShowCables] = useState(true)
    const [autoRotate, setAutoRotate] = useState(false)
    const [fastMode, setFastMode] = useState(true)

    const [code, setCode] = useState<ICode | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()

    useEffect(() => localStorage.setItem(SHOW_FEATURES_KEY, showFeatures.toString()), [showFeatures])
    useEffect(() => {
        if (fabric) {
            fabric.instance.engine.setColoring(showBars, showCables)
        }
    }, [showBars, showCables])
    useEffect(() => {
        if (fabric) {
            fabric.instance.engine.setSurfaceCharacter(surfaceCharacter)
        }
    }, [surfaceCharacter])

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
                        text: `Pretensing A ${pretensingStep}%`,
                        symbol: <FaHammer/>,
                        color: "warning",
                        disabled: true,
                        onClick: () => {
                        },
                    }
                case LifePhase.Gravitizing:
                    return {
                        text: `Pretensing B ${pretensingStep}%`,
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

    function adjustment(up: boolean): number {
        const factor = 1.03
        return up ? factor : (1 / factor)
    }

    const adjustValue = (up: boolean) => () => {
        if (fabric) {
            fabric.forEachSelected(interval => {
                fabric.instance.engine.multiplyRestLength(interval.index, adjustment(up))
            })
        }
    }

    function ViewButton({bars, cables}: { bars: boolean, cables: boolean }): JSX.Element {
        const onClick = () => {
            setShowBars(bars)
            setShowCables(cables)
            if (selectedBrick) {
                setSelectedBrick(undefined)
            }
        }
        const color = bars === showBars && cables === showCables ? "success" : "secondary"
        return <Button style={{color: "white"}} color={color} onClick={onClick}>
            {bars && cables ? (<><FaHandPointUp/><span> Faces</span></>) :
                bars ? (<><FaCircle/><span> Pushes </span></>) : (<><span> Pulls </span><FaDotCircle/></>)}
        </Button>
    }

    const SurfaceCharacterChoice = (): JSX.Element => {
        const [open, setOpen] = useState<boolean>(false)
        return (
            <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
                <DropdownToggle>{SurfaceCharacter[surfaceCharacter]}</DropdownToggle>
                <DropdownMenu right={false}>
                    {Object.keys(SurfaceCharacter).filter(k => k.length > 1).map(key => (
                        <DropdownItem key={`Surface${key}`} onClick={() => setSurfaceCharacter(SurfaceCharacter[key])}>
                            {key}
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </ButtonDropdown>
        )
    }

    function ControlPanel(): JSX.Element {
        if (!fabric) {
            return <div/>
        }
        const engine = fabric.instance.engine
        return (
            <Navbar style={{borderStyle: "none"}}>
                <ButtonGroup>
                    <PretenstButton/>
                </ButtonGroup>
                <ButtonGroup style={{paddingLeft: "1em"}}>
                    <Button onClick={() => {
                        location.hash = ""
                        setFabric(undefined)
                    }}><FaListAlt/> Programs</Button>
                </ButtonGroup>
                <div style={{display: "inline-flex", alignContent: "center"}}>
                    {selectedBrick ? (
                        <ButtonGroup style={{paddingLeft: "0.6em", width: "40em"}}>
                            <Button disabled={!fabric.splitIntervals} onClick={adjustValue(true)}>
                                <FaArrowUp/><span> Bigger</span>
                            </Button>
                            <Button disabled={!fabric.splitIntervals} onClick={adjustValue(false)}>
                                <FaArrowDown/><span> Smaller</span>
                            </Button>
                            <Button onClick={() => {
                                setSelectedBrick(undefined)
                                fabric.clearSelection()
                            }}>
                                <FaTimesCircle/>
                            </Button>
                        </ButtonGroup>
                    ) : (
                        <div style={{
                            display: "flex",
                            backgroundColor: "#5f5f5f",
                            padding: "0.5em",
                            borderRadius: "1.5em",
                        }}>
                            <ButtonGroup style={{display: "flex"}}>
                                <StrainPanel fabric={fabric} bars={false} colorBars={showBars}
                                             colorCables={showCables}/>
                                <ViewButton bars={false} cables={true}/>
                            </ButtonGroup>
                            <ButtonGroup style={{paddingLeft: "0.4em", display: "flex"}}>
                                <ViewButton bars={true} cables={true}/>
                            </ButtonGroup>
                            <ButtonGroup style={{paddingLeft: "0.4em", display: "flex"}}>
                                <ViewButton bars={true} cables={false}/>
                                <StrainPanel fabric={fabric} bars={true} colorBars={showBars} colorCables={showCables}/>
                            </ButtonGroup>
                        </div>
                    )}
                </div>
                <ButtonGroup style={{paddingLeft: "1em"}}>
                    <Button disabled={lifePhase !== LifePhase.Shaping} onClick={() => optimizeFabric(fabric, true)}>
                        <FaBiohazard/>
                    </Button>
                    <Button disabled={lifePhase !== LifePhase.Shaping} onClick={() => optimizeFabric(fabric, false)}>
                        <FaRadiationAlt/>
                    </Button>
                    <Button disabled={lifePhase !== LifePhase.Pretenst} onClick={() => engine.setAltitude(1)}>
                        <FaHandRock/>
                    </Button>
                    <Button disabled={lifePhase !== LifePhase.Pretenst} onClick={() => engine.setAltitude(10)}>
                        <FaParachuteBox/>
                    </Button>
                    <Button onClick={() => fabric.instance.engine.centralize()}>
                        <FaCompressArrowsAlt/>
                    </Button>
                    <Button onClick={() => setAutoRotate(!autoRotate)}>
                        <FaSyncAlt/>
                    </Button>
                </ButtonGroup>
                <ButtonGroup style={{paddingLeft: "1em"}}>
                    <Button onClick={() => saveCSVFiles(fabric)}>
                        <FaFileCsv/>
                    </Button>
                    <Button onClick={() => saveOBJFile(fabric)}>
                        <FaCubes/>
                    </Button>
                </ButtonGroup>
                <ButtonGroup style={{paddingLeft: "1em"}}>
                    <SurfaceCharacterChoice/>
                    <Button color={fastMode ? "secondary" : "warning"} onClick={() => setFastMode(!fastMode)}>
                        <FaCamera/>
                    </Button>
                    <Button color={showFeatures ? "warning" : "secondary"}
                            onClick={() => setShowFeatures(!showFeatures)}>
                        <FaBars/>
                    </Button>
                </ButtonGroup>
            </Navbar>
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
                            showBars={showBars}
                            showCables={showCables}
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
                        <ControlPanel/>
                    </div>
                </>
            )}
        </div>
    )
}
