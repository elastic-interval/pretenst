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
    FaCubes,
    FaFileCsv,
    FaTimesCircle,
} from "react-icons/all"
import { Button, ButtonGroup, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { ControlTab, IFabricState, LifePhase } from "../fabric/fabric-state"
import { ICode } from "../fabric/tenscript"
import { optimizeFabric } from "../fabric/tensegrity-brick"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

import { CodePanel } from "./code-panel"
import { FeaturePanel } from "./feature-panel"
import { PretensePanel } from "./pretense-panel"

const SPLIT_LEFT = "34em"

export function ControlTabs({fabric, selectedBrick, setCode, fabricState$, lifePhase$, bootstrapCode, features, rebuild}: {
    fabric?: TensegrityFabric,
    selectedBrick?: IBrick,
    setCode: (code: ICode) => void,
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    bootstrapCode: ICode [],
    features: FloatFeature[],
    rebuild: () => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState(loadControlTab)

    function Controls(): JSX.Element {
        if (!fabric) {
            return <div/>
        }
        const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
        useEffect(() => {
            const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
            return () => subscription.unsubscribe()
        })

        const adjustValue = (up: boolean) => () => {
            function adjustment(): number {
                const factor = 1.03
                return up ? factor : (1 / factor)
            }

            fabric.forEachSelected(interval => {
                fabric.instance.engine.multiplyRestLength(interval.index, adjustment())
            })
        }
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
                        <Button onClick={() => fabric.clearSelection()}>
                            <FaTimesCircle/>
                        </Button>
                    </ButtonGroup>
                ) : (<h3>Notting</h3>)}
                <ButtonGroup vertical={true} className="m-4 w-75">
                    <Button disabled={lifePhase !== LifePhase.Shaping}
                            onClick={() => optimizeFabric(fabric)}>
                        <FaBiohazard/> Optimize
                    </Button>
                </ButtonGroup>
                <ButtonGroup vertical={true} className="m-4 w-75">
                    <Button
                        disabled={lifePhase !== LifePhase.Pretenst}
                        onClick={() => saveCSVFiles(fabric)}
                    >
                        <FaFileCsv/> Download CSV
                    </Button>
                    <Button
                        disabled={lifePhase !== LifePhase.Pretenst}
                        onClick={() => saveOBJFile(fabric)}
                    >
                        <FaCubes/> Download OBJ
                    </Button>
                </ButtonGroup>
            </div>
        )
    }


    function Link({controlTab}: { controlTab: ControlTab }): JSX.Element {
        return (
            <NavItem>
                <NavLink
                    active={activeTab === controlTab}
                    onClick={() => {
                        saveControlTab(controlTab)
                        setActiveTab(controlTab)
                    }}
                >{controlTab}</NavLink>
            </NavItem>
        )
    }

    function Pane({tab}: { tab: ControlTab }): JSX.Element {

        function Content(): JSX.Element {
            switch (tab) {
                case ControlTab.Generate:
                    return (
                        <CodePanel
                            bootstrapCode={bootstrapCode}
                            setCode={setCode}
                        />
                    )
                case ControlTab.Pretense:
                    return !fabric ? (<div/>) : (
                        <PretensePanel
                            fabric={fabric}
                            fabricState$={fabricState$}
                            lifePhase$={lifePhase$}
                            rebuild={rebuild}
                        />
                    )
                case ControlTab.Test:
                    return (
                        <Controls/>
                    )
                case ControlTab.Features:
                    return !fabric ? <div/> : <FeaturePanel featureSet={features}/>
            }
        }

        return (
            <TabPane tabId={tab}><Content/></TabPane>
        )
    }

    return (
        <div className="h-100">
            <Nav tabs={true} style={{backgroundColor: "#b2b2b2"}}>
                {Object.keys(ControlTab).map(tab => <Link key={`T${tab}`} controlTab={ControlTab[tab]}/>)}
            </Nav>
            <TabContent activeTab={activeTab}>
                {Object.keys(ControlTab).map(tab => <Pane key={tab} tab={ControlTab[tab]}/>)}
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
                    onClick={() => {
                        const nonce = fabricState$.getValue().nonce + 1
                        fabricState$.next({...fabricState$.getValue(), nonce, fullScreen: true})
                    }}
                >
                    <FaAngleDoubleLeft/>
                </Button>
            </div>
        </div>
    )
}

const CONTROL_TAB_KEY = "ControlTab"

function saveControlTab(controlTab: ControlTab): void {
    localStorage.setItem(CONTROL_TAB_KEY, controlTab)
}

function loadControlTab(): ControlTab {
    const item = localStorage.getItem(CONTROL_TAB_KEY)
    if (item) {
        return ControlTab[item]
    }
    return ControlTab.Generate
}
