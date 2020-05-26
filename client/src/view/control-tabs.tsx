/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowLeft } from "react-icons/all"
import { Alert, Button, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/float-feature"
import { Life } from "../fabric/life"
import { ITenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, IInterval } from "../fabric/tensegrity-types"
import { ControlTab, IStoredState, transition } from "../storage/stored-state"

import { FrozenTab } from "./frozen-tab"
import { LiveTab } from "./live-tab"
import { RealizeTab } from "./realize-tab"
import { ShapeSelection, ShapeTab } from "./shape-tab"
import { TenscriptTab } from "./tenscript-tab"

const SPLIT_LEFT = "25em"

export function ControlTabs(
    {
        floatFeatures,
        rootTenscript, setRootTenscript,
        shapeSelection, setShapeSelection,
        selectedFaces, clearSelection, selectedIntervals,
        tensegrity, setFabric, runTenscript,
        visibleRoles, setVisibleRoles,
        toFullScreen, storedState$,
    }: {
        floatFeatures: Record<WorldFeature, FloatFeature>,
        rootTenscript: ITenscript,
        setRootTenscript: (tenscript: ITenscript) => void,
        selectedFaces: IFace[],
        clearSelection: () => void,
        selectedIntervals: IInterval[],
        runTenscript: (tenscript: ITenscript) => void,
        tensegrity?: Tensegrity,
        setFabric: (tensegrity: Tensegrity) => void,
        shapeSelection: ShapeSelection,
        setShapeSelection: (shapeSelection: ShapeSelection) => void,
        toFullScreen: () => void,
        visibleRoles: IntervalRole[],
        setVisibleRoles: (roles: IntervalRole[]) => void,
        storedState$: BehaviorSubject<IStoredState>,
    }): JSX.Element {

    const [life, updateLife] = useState<Life | undefined>(tensegrity ? tensegrity.life$.getValue() : undefined)
    useEffect(() => {
        const sub = tensegrity ? tensegrity.life$.subscribe(updateLife) : undefined
        return () => {
            if (sub) {
                sub.unsubscribe()
            }
        }
    }, [tensegrity])

    const [controlTab, updateControlTab] = useState(storedState$.getValue().controlTab)
    useEffect(() => {
        if (controlTab !== ControlTab.Shape) {
            clearSelection()
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
                            tensegrity={tensegrity}
                            runTenscript={runTenscript}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Shape:
                    return !tensegrity ? NO_FABRIC : (
                        <ShapeTab
                            floatFeatures={floatFeatures}
                            tensegrity={tensegrity}
                            setFabric={setFabric}
                            selectedIntervals={selectedIntervals}
                            shapeSelection={shapeSelection}
                            setShapeSelection={setShapeSelection}
                            selectedFaces={selectedFaces}
                            clearSelection={clearSelection}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Live:
                    return !tensegrity ? NO_FABRIC : (
                        <LiveTab
                            floatFeatures={floatFeatures}
                            tensegrity={tensegrity}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Realize:
                    return !tensegrity ? NO_FABRIC : (
                        <RealizeTab
                            floatFeatures={floatFeatures}
                            tensegrity={tensegrity}
                            shapeSelection={shapeSelection}
                            storedState$={storedState$}
                        />
                    )
                case ControlTab.Frozen:
                    return !tensegrity ? NO_FABRIC : (
                        <FrozenTab
                            tensegrity={tensegrity}
                            floatFeatures={floatFeatures}
                            visibleRoles={visibleRoles}
                            setVisibleRoles={setVisibleRoles}
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
    children: JSX.Element | (JSX.Element[] | JSX.Element | undefined)[],
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
