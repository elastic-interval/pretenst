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
    FaCompressArrowsAlt,
    FaCubes,
    FaFileCsv,
    FaHandRock,
    FaParachuteBox,
    FaSyncAlt,
    FaTimesCircle,
} from "react-icons/all"
import { Button, ButtonGroup, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { IFabricState, LifePhase } from "../fabric/fabric-state"
import { optimizeFabric } from "../fabric/tensegrity-brick"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

import { CodePanel, ICode } from "./code-panel"
import { FeaturePanel } from "./feature-panel"
import { PretensePanel } from "./pretense-panel"

const SPLIT_LEFT = "34em"

export enum Tab {
    Generate = "Generate",
    Pretense = "Pretense",
    Test = "Test",
    Features = "Features",
}

export function ControlTabs({
                                fabric, fabricState$, bootstrapCode, features,
                                selectedBrick, setSelectedBrick, setCode, rebuild,
                                setFullScreen,
                            }: {
    fabric?: TensegrityFabric,
    fabricState$: BehaviorSubject<IFabricState>,
    bootstrapCode: ICode [],
    features: FloatFeature[],
    selectedBrick?: IBrick,
    setSelectedBrick: (brick?: IBrick) => void,
    setCode: (brick?: ICode) => void,
    rebuild: () => void,
    setFullScreen: (fullScreen: boolean) => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState(Tab.Generate)
    const [fabricState, setFabricState] = useState(fabricState$.getValue())
    useEffect(() => {
        const subscription = fabricState$.subscribe(setFabricState)
        return () => subscription.unsubscribe()
    })

    function Controls(): JSX.Element {
        if (!fabric) {
            return <div/>
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
            <div className="p-4" style={{display: "block"}}>
                {selectedBrick ? (
                    <ButtonGroup className="m-4 w-75">
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
                ) : (<h3>Notting</h3>)}
                <ButtonGroup vertical={true} className="m-4 w-75">
                    <Button disabled={fabricState.lifePhase !== LifePhase.Pretenst}
                            onClick={() => engine.setAltitude(1)}>
                        <FaHandRock/> Nudge
                    </Button>
                    <Button disabled={fabricState.lifePhase !== LifePhase.Pretenst}
                            onClick={() => engine.setAltitude(10)}>
                        <FaParachuteBox/> Drop
                    </Button>
                    <Button onClick={() => fabric.instance.engine.centralize()}>
                        <FaCompressArrowsAlt/> Centralize
                    </Button>
                    <Button disabled={fabricState.lifePhase !== LifePhase.Shaping}
                            onClick={() => optimizeFabric(fabric)}>
                        <FaBiohazard/> Optimize
                    </Button>
                </ButtonGroup>
                <ButtonGroup vertical={true} className="m-4 w-75">
                    <Button onClick={() => saveCSVFiles(fabric)}>
                        <FaFileCsv/> Download CSV
                    </Button>
                    <Button onClick={() => saveOBJFile(fabric)}>
                        <FaCubes/> Download OBJ
                    </Button>
                </ButtonGroup>
                <ButtonGroup vertical={true} className="m-4 w-75">
                    <Button
                        color={fabricState.rotating ? "warning" : "secondary"}
                        onClick={() => fabricState$.next({...fabricState, rotating: !fabricState.rotating})}
                    >
                        <FaSyncAlt/> Auto-rotate
                    </Button>
                    <Button
                        color={fabricState.frozen ? "warning" : "secondary"}
                        onClick={() => fabricState$.next({...fabricState, frozen: !fabricState.frozen})}
                    >
                        <FaCamera/> Frozen Snapshot
                    </Button>
                </ButtonGroup>
            </div>
        )
    }


    function Link({tab}: { tab: Tab }): JSX.Element {
        return (
            <NavItem>
                <NavLink active={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</NavLink>
            </NavItem>
        )
    }

    function Pane({tab}: { tab: Tab }): JSX.Element {

        function Content(): JSX.Element {
            switch (tab) {
                case Tab.Generate:
                    return (
                        <CodePanel
                            bootstrapCode={bootstrapCode}
                            setCode={setCode}
                        />
                    )
                case Tab.Pretense:
                    return !fabric ? (<div/>) : (
                        <PretensePanel
                            fabric={fabric}
                            fabricState$={fabricState$}
                            rebuild={rebuild}
                        />
                    )
                case Tab.Test:
                    return (
                        <Controls/>
                    )
                case Tab.Features:
                    return !fabric ? (<div/>) : (
                        <FeaturePanel
                            featureSet={features}
                            fabric={fabric}
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
            <Nav tabs={true} style={{backgroundColor: "#b2b2b2"}}>
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
