/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowLeft, FaHandSpock, FaLeaf, FaTools } from "react-icons/all"
import { Alert, Button, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, LifePhase } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { ITenscript } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace } from "../fabric/tensegrity-types"
import { ControlTab, IStoredState, transition } from "../storage/stored-state"

import { OptimizePanel } from "./optimize-panel"
import { ShapePanel } from "./shape-panel"
import { TenscriptPanel } from "./tenscript-panel"

const SPLIT_LEFT = "25em"

function Icon(controlTab: ControlTab): JSX.Element {
    switch (controlTab) {
        case ControlTab.Grow:
            return <FaLeaf key="grow"/>
        case ControlTab.Shape:
            return <FaTools key="shape"/>
        case ControlTab.Optimize:
            return <FaHandSpock key="optimize"/>
    }
}

export function ControlTabs({
                                floatFeatures, rootTenscript, setRootTenscript,
                                selectedFaces, clearSelectedFaces,
                                fabric, setFabric, runTenscript,
                                toFullScreen, storedState$, lifePhase$,
                            }: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    rootTenscript: ITenscript,
    setRootTenscript: (tenscript: ITenscript) => void,
    selectedFaces: IFace[],
    clearSelectedFaces: () => void,
    runTenscript: (tenscript: ITenscript) => void,
    fabric?: TensegrityFabric,
    setFabric: (fabric: TensegrityFabric) => void,
    toFullScreen: () => void,
    storedState$: BehaviorSubject<IStoredState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const [controlTab, updateActiveTab] = useState(storedState$.getValue().controlTab)

    useEffect(() => {
        if (controlTab !== ControlTab.Shape) {
            clearSelectedFaces()
        }
    }, [controlTab])

    useEffect(() => {
        const subscription = storedState$.subscribe(newState => updateActiveTab(newState.controlTab))
        return () => subscription.unsubscribe()
    }, [])

    function Link({tab}: { tab: ControlTab }): JSX.Element {
        return (
            <NavItem>
                <NavLink
                    active={controlTab === tab}
                    onClick={() => {
                        storedState$.next(transition(storedState$.getValue(), {controlTab: tab}))
                    }}
                >{Icon(tab)} {tab}</NavLink>
            </NavItem>
        )
    }

    function Pane({tab}: { tab: ControlTab }): JSX.Element {

        const NO_FABRIC = <Alert color="warning">No fabric</Alert>

        function Content(): JSX.Element {
            switch (tab) {
                case ControlTab.Grow:
                    return (
                        <TenscriptPanel
                            rootTenscript={rootTenscript}
                            setRootTenscript={setRootTenscript}
                            fabric={fabric}
                            runTenscript={runTenscript}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Shape:
                    return !fabric ? NO_FABRIC : (
                        <ShapePanel
                            floatFeatures={floatFeatures}
                            fabric={fabric}
                            setFabric={setFabric}
                            selectedFaces={selectedFaces}
                            clearSelectedFaces={clearSelectedFaces}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Optimize:
                    return !fabric ? NO_FABRIC : (
                        <OptimizePanel
                            floatFeatures={floatFeatures}
                            fabric={fabric}
                            storedState$={storedState$}
                            lifePhase$={lifePhase$}
                        />
                    )
            }
        }

        return (
            <TabPane id="tab-pane" style={{height: "100%"}} tabId={tab}><Content/></TabPane>
        )
    }

    function FullScreenButton(): JSX.Element {
        const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
        useEffect(() => {
            const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
            return () => subscription.unsubscribe()
        }, [])
        return (
            <Button
                disabled={lifePhase !== LifePhase.Shaping && lifePhase !== LifePhase.Pretenst}
                style={{
                    padding: 0,
                    margin: 0,
                    borderRadius: 0,
                    width: "1em",
                }}
                className="w-100 h-100" color="dark"
                onClick={toFullScreen}
            >
                <FaArrowLeft/>
            </Button>
        )
    }

    return (
        <div className="h-100">
            <Nav tabs={true} style={{backgroundColor: "#b2b2b2"}}>
                {Object.keys(ControlTab).map(tab => <Link key={`T${tab}`} tab={ControlTab[tab]}/>)}
            </Nav>
            <TabContent style={{flex: 1, flexFlow: "auto"}} id="tab-content" activeTab={controlTab}>
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
                <FullScreenButton/>
            </div>
        </div>
    )
}
