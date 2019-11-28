/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowLeft, FaEye, FaHandSpock, FaLeaf, FaTools } from "react-icons/all"
import { Alert, Button, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, LifePhase } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { ITenscript } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace } from "../fabric/tensegrity-types"
import { ControlTab, IStoredState, transition } from "../storage/stored-state"

import { RealizePanel } from "./realize-panel"
import { ShapePanel } from "./shape-panel"
import { TenscriptPanel } from "./tenscript-panel"
import { ViewPanel } from "./view-panel"

const SPLIT_LEFT = "25em"

function Icon(controlTab: ControlTab): JSX.Element {
    switch (controlTab) {
        case ControlTab.Grow:
            return <FaLeaf key="grow"/>
        case ControlTab.Shape:
            return <FaTools key="shape"/>
        case ControlTab.Realize:
            return <FaHandSpock key="optimize"/>
        case ControlTab.View:
            return <FaEye key="view"/>
    }
}

export function ControlTabs({
                                floatFeatures, rootTenscript, setRootTenscript,
                                selectionMode, setSelectionMode,
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
    selectionMode: boolean,
    setSelectionMode: (selectionMode: boolean) => void,
    toFullScreen: () => void,
    storedState$: BehaviorSubject<IStoredState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const [lifePhase, updateLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => updateLifePhase(newPhase))
        return () => subscription.unsubscribe()
    }, [])

    const [controlTab, updateControlTab] = useState(storedState$.getValue().controlTab)
    useEffect(() => {
        const mode = controlTab === ControlTab.Shape && lifePhase === LifePhase.Shaping
        if (!mode) {
            clearSelectedFaces()
        }
    }, [controlTab, lifePhase])

    useEffect(() => {
        const subscription = storedState$.subscribe(newState => updateControlTab(newState.controlTab))
        return () => subscription.unsubscribe()
    }, [])

    function Link({tab}: { tab: ControlTab }): JSX.Element {
        return (
            <NavItem>
                <NavLink
                    disabled={tab === ControlTab.Shape && lifePhase !== LifePhase.Shaping}
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
                            selectionMode={selectionMode}
                            setSelectionMode={setSelectionMode}
                            selectedFaces={selectedFaces}
                            clearSelectedFaces={clearSelectedFaces}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Realize:
                    return !fabric ? NO_FABRIC : (
                        <RealizePanel
                            floatFeatures={floatFeatures}
                            fabric={fabric}
                            selectionMode={selectionMode}
                            storedState$={storedState$}
                            lifePhase$={lifePhase$}
                        />
                    )
                case ControlTab.View:
                    return !fabric ? NO_FABRIC : (
                        <ViewPanel
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
