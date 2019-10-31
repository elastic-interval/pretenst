/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaAngleDoubleLeft,
    FaAngleDoubleRight,
    FaArrowDown,
    FaArrowUp,
    FaBiohazard,
    FaCamera,
    FaCircle,
    FaCompressArrowsAlt,
    FaCubes,
    FaDotCircle,
    FaFileCsv,
    FaHandPointUp,
    FaHandRock,
    FaParachuteBox,
    FaRadiationAlt,
    FaSyncAlt,
    FaTimesCircle,
} from "react-icons/all"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import {
    Button,
    ButtonDropdown,
    ButtonGroup,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
} from "reactstrap"
import { BehaviorSubject } from "rxjs"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { SurfaceCharacter } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { LifePhase } from "../fabric/life-phase"
import { optimizeFabric } from "../fabric/tensegrity-brick"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

import { CodePanel, getCodeFromLocationBar, getRecentCode, ICode } from "./code-panel"
import { CodeTreeEditor } from "./code-tree-editor"
import { FabricView } from "./fabric-view"
import { FeaturePanel } from "./feature-panel"
import { LifePhasePanel } from "./life-phase-panel"
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

const SPLIT_LEFT = "34em"
const SPLIT_RIGHT = "35em"

export function TensegrityView({buildFabric, features, bootstrapCode, pretensingStep$}: {
    buildFabric: (code: ICode) => TensegrityFabric,
    features: FloatFeature[],
    bootstrapCode: ICode [],
    pretensingStep$: BehaviorSubject<number>,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(LifePhase.Growing)
    const [surfaceCharacter, setSurfaceCharacter] = useState(SurfaceCharacter.Sticky)
    const [showBars, setShowBars] = useState(true)
    const [showCables, setShowCables] = useState(true)
    const [autoRotate, setAutoRotate] = useState(false)
    const [fastMode, setFastMode] = useState(true)
    const [fullScreen, setFullScreen] = useState(false)

    const [code, setCode] = useState<ICode | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedBrick, setSelectedBrick] = useState<IBrick | undefined>()

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
            <div>
                <LifePhasePanel
                    lifePhase={lifePhase}
                    setLifePhase={setLifePhase}
                    fabric={fabric}
                    pretensingStep$={pretensingStep$}
                />
                <div style={{display: "block"}}>
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
                </ButtonGroup>
            </div>
        )
    }

    enum Tab {
        Structures = "Structures",
        Commands = "Commands",
        Features = "Features",
        Editor = "Editor",
    }

    function ControlTabs(): JSX.Element {
        const [activeTab, setActiveTab] = useState(Tab.Structures)

        function Link({tab}: { tab: Tab }): JSX.Element {
            return (
                <NavItem>
                    <NavLink
                        active={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </NavLink>
                </NavItem>
            )
        }

        function Pane({tab}: { tab: Tab }): JSX.Element {

            function Content(): JSX.Element {
                switch (tab) {
                    case Tab.Structures:
                        return (
                            <CodePanel
                                bootstrapCode={bootstrapCode}
                                setCode={setCode}
                            />
                        )
                    case Tab.Commands:
                        return (
                            <ControlPanel/>
                        )
                    case Tab.Features:
                        return !fabric ? <div/> : (
                            <FeaturePanel
                                featureSet={features}
                                lifePhase={lifePhase}
                                instance={fabric.instance}
                            />
                        )
                    case Tab.Editor:
                        return !code ? <div/> : (
                            <CodeTreeEditor
                                code={code}
                                setCode={setCode}
                            />
                        )
                }
            }

            return (
                <TabPane tabId={tab}><Content/></TabPane>
            )
        }

        return (
            <div className="h-100">
                <Nav tabs={true} style={{
                    backgroundColor: "#b2b2b2",
                }}>
                    {Object.keys(Tab).map(tab => <Link key={`T${tab}`} tab={Tab[tab]}/>)}
                </Nav>
                <TabContent activeTab={activeTab}>
                    {Object.keys(Tab).map(tab => <Pane key={tab} tab={Tab[tab]}/>)}
                </TabContent>
                <div style={{
                    position: "absolute",
                    top: 0,
                    height: "100%",
                    left: SPLIT_LEFT,
                    zIndex: 10,
                    width: "1em",
                }}>
                    <Button
                        style={{
                            padding: 0,
                            margin: 0,
                            borderRadius: 0,
                            width: "1em",
                        }}
                        className="w-100 h-100" color="dark"
                        onClick={() => setFullScreen(true)}
                    >
                        <FaAngleDoubleLeft/>
                    </Button>
                </div>
            </div>
        )
    }

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
                    <ControlTabs/>
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
                        <Canvas style={{
                            backgroundColor: "black",
                        }}>
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
                        {!code ? undefined : (
                            <div id="top-middle">
                                {code.codeString}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
