/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaAngleDoubleLeft,
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
    FaTimesCircle,
} from "react-icons/all"
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

import { SurfaceCharacter } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { LifePhase } from "../fabric/life-phase"
import { optimizeFabric } from "../fabric/tensegrity-brick"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

import { CodePanel, ICode } from "./code-panel"
import { CodeTreeEditor } from "./code-tree-editor"
import { FeaturePanel } from "./feature-panel"
import { LifePhasePanel } from "./life-phase-panel"
import { StrainPanel } from "./strain-panel"

const SPLIT_LEFT = "34em"

export enum Tab {
    Structures = "Structures",
    Commands = "Commands",
    Features = "Features",
    Editor = "Editor",
}

export function ControlTabs({
                                fabric, lifePhase$, pretensingStep$, bootstrapCode, features,
                                showBars, setShowBars, showCables, setShowCables, fastMode, setFastMode,
                                selectedBrick, setSelectedBrick, code, setCode, setFullScreen,
                            }: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject<LifePhase>,
    pretensingStep$: BehaviorSubject<number>
    bootstrapCode: ICode [],
    features: FloatFeature[],
    showBars: boolean,
    setShowBars: (value: boolean) => void,
    showCables: boolean,
    setShowCables: (value: boolean) => void,
    fastMode: boolean,
    setFastMode: (value: boolean) => void,
    selectedBrick?: IBrick,
    setSelectedBrick: (brick?: IBrick) => void,
    code?: ICode,
    setCode: (brick?: ICode) => void,
    setFullScreen: (fullScreen: boolean) => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState(Tab.Structures)
    const [surfaceCharacter, setSurfaceCharacter] = useState(SurfaceCharacter.Sticky)

    useEffect(() => {
        if (fabric) {
            fabric.instance.engine.setSurfaceCharacter(surfaceCharacter)
        }
    }, [surfaceCharacter])

    function Controls(): JSX.Element {
        if (!fabric) {
            return <div/>
        }
        const SurfaceCharacterChoice = (): JSX.Element => {
            const [open, setOpen] = useState<boolean>(false)
            return (
                <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
                    <DropdownToggle>{SurfaceCharacter[surfaceCharacter]}</DropdownToggle>
                    <DropdownMenu right={false}>
                        {Object.keys(SurfaceCharacter).filter(k => k.length > 1).map(key => (
                            <DropdownItem key={`Surface${key}`}
                                          onClick={() => setSurfaceCharacter(SurfaceCharacter[key])}>
                                {key}
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </ButtonDropdown>
            )
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

        const adjustValue = (up: boolean) => () => {
            function adjustment(): number {
                const factor = 1.03
                return up ? factor : (1 / factor)
            }

            fabric.forEachSelected(interval => {
                fabric.instance.engine.multiplyRestLength(interval.index, adjustment())
            })
        }
        const engine = fabric.instance.engine
        return (
            <div>
                <LifePhasePanel
                    lifePhase$={lifePhase$}
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
                    <Button disabled={lifePhase$.getValue() !== LifePhase.Shaping}
                            onClick={() => optimizeFabric(fabric, true)}>
                        <FaBiohazard/>
                    </Button>
                    <Button disabled={lifePhase$.getValue() !== LifePhase.Shaping}
                            onClick={() => optimizeFabric(fabric, false)}>
                        <FaRadiationAlt/>
                    </Button>
                    <Button disabled={lifePhase$.getValue() !== LifePhase.Pretenst}
                            onClick={() => engine.setAltitude(1)}>
                        <FaHandRock/>
                    </Button>
                    <Button disabled={lifePhase$.getValue() !== LifePhase.Pretenst}
                            onClick={() => engine.setAltitude(10)}>
                        <FaParachuteBox/>
                    </Button>
                    <Button onClick={() => fabric.instance.engine.centralize()}>
                        <FaCompressArrowsAlt/>
                    </Button>
                    {/*<Button onClick={() => setAutoRotate(!autoRotate)}>*/}
                    {/*    <FaSyncAlt/>*/}
                    {/*</Button>*/}
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
                        <Controls/>
                    )
                case Tab.Features:
                    return !fabric ? <div/> : (
                        <FeaturePanel
                            featureSet={features}
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
