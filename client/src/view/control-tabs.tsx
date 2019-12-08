/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowLeft } from "react-icons/all"
import { Alert, Button, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { Life } from "../fabric/life"
import { ITenscript } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, IInterval } from "../fabric/tensegrity-types"
import { ControlTab, IStoredState, transition } from "../storage/stored-state"

import { RealizeTab } from "./realize-tab"
import { ShapeTab } from "./shape-tab"
import { StrainTab } from "./strain-tab"
import { TenscriptTab } from "./tenscript-tab"
import { ViewTab } from "./view-tab"

const SPLIT_LEFT = "25em"

export function ControlTabs({
                                floatFeatures, rootTenscript, setRootTenscript,
                                selectionMode, setSelectionMode,
                                selectedFaces, clearSelectedFaces, selectedIntervals,
                                fabric, setFabric, runTenscript,
                                toFullScreen, storedState$,
                            }: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    rootTenscript: ITenscript,
    setRootTenscript: (tenscript: ITenscript) => void,
    selectedFaces: IFace[],
    clearSelectedFaces: () => void,
    selectedIntervals: IInterval[],
    runTenscript: (tenscript: ITenscript) => void,
    fabric?: TensegrityFabric,
    setFabric: (fabric: TensegrityFabric) => void,
    selectionMode: boolean,
    setSelectionMode: (selectionMode: boolean) => void,
    toFullScreen: () => void,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [life, updateLife] = useState<Life | undefined>(fabric ? fabric.life : undefined)
    useEffect(() => {
        const sub = fabric ? fabric.life$.subscribe(updateLife) : undefined
        return () => {
            if (sub) {
                sub.unsubscribe()
            }
        }
    }, [fabric])

    const [controlTab, updateControlTab] = useState(storedState$.getValue().controlTab)
    useEffect(() => {
        if (controlTab !== ControlTab.Shape) {
            clearSelectedFaces()
        }
    }, [controlTab, life])

    useEffect(() => {
        const sub = storedState$.subscribe(newState => updateControlTab(newState.controlTab))
        return () => sub.unsubscribe()
    }, [])

    function Link({tab}: { tab: ControlTab }): JSX.Element {
        return (
            <NavItem>
                <NavLink
                    active={controlTab === tab}
                    onClick={() => storedState$.next(transition(storedState$.getValue(), {controlTab: tab}))}
                >{tab}</NavLink>
            </NavItem>
        )
    }

    function Pane({tab}: { tab: ControlTab }): JSX.Element {

        const NO_FABRIC = <Alert color="warning">No fabric</Alert>

        function Content(): JSX.Element {
            switch (tab) {
                case ControlTab.Grow:
                    return (
                        <TenscriptTab
                            rootTenscript={rootTenscript}
                            setRootTenscript={setRootTenscript}
                            fabric={fabric}
                            runTenscript={runTenscript}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Shape:
                    return !fabric ? NO_FABRIC : (
                        <ShapeTab
                            floatFeatures={floatFeatures}
                            fabric={fabric}
                            setFabric={setFabric}
                            selectedIntervals={selectedIntervals}
                            selectionMode={selectionMode}
                            setSelectionMode={setSelectionMode}
                            selectedFaces={selectedFaces}
                            clearSelectedFaces={clearSelectedFaces}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Realize:
                    return !fabric ? NO_FABRIC : (
                        <RealizeTab
                            floatFeatures={floatFeatures}
                            fabric={fabric}
                            selectionMode={selectionMode}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.View:
                    return !fabric ? NO_FABRIC : (
                        <ViewTab
                            floatFeatures={floatFeatures}
                            fabric={fabric}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Strain:
                    return !fabric ? NO_FABRIC : (
                        <StrainTab
                            floatFeatures={floatFeatures}
                            fabric={fabric}
                            storedState$={storedState$}
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
            <TabContent style={{flex: 1, flexFlow: "auto", height: "100%"}} id="tab-content" activeTab={controlTab}>
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

export function Grouping({children, height}: {
    children: JSX.Element | JSX.Element[],
    height?: string,
}): JSX.Element {
    return (
        <div className="m-3 p-2" style={{
            height,
            borderRadius: "1em",
            borderStyle: "solid",
            borderWidth: "0.1em",
            borderColor: "#45782e",
        }}>
            {children}
        </div>
    )
}
