/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowLeft, FaHandSpock, FaLeaf, FaTools } from "react-icons/all"
import { Button, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { ControlTab, IFabricState, LifePhase, transition } from "../fabric/fabric-state"
import { ITenscript } from "../fabric/tenscript"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

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
                                fabric, selectedBricks, clearSelectedBricks, tenscript, setTenscript,
                                toFullScreen, app$, lifePhase$, features,
                            }: {
    fabric?: TensegrityFabric,
    selectedBricks: IBrick[],
    clearSelectedBricks: () => void,
    tenscript?: ITenscript,
    setTenscript: (grow: boolean, tenscript: ITenscript) => void,
    toFullScreen: () => void,
    app$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    features: FloatFeature[],
}): JSX.Element {

    const [controlTab, updateActiveTab] = useState(app$.getValue().controlTab)
    useEffect(() => {
        if (controlTab !== ControlTab.Shape) {
            clearSelectedBricks()
        }
    }, [controlTab])
    useEffect(() => {
        const subscription = app$.subscribe(newState => {
            updateActiveTab(newState.controlTab)
        })
        return () => subscription.unsubscribe()
    }, [])

    function Link({tab}: { tab: ControlTab }): JSX.Element {
        return (
            <NavItem>
                <NavLink
                    disabled={tab !== ControlTab.Grow && !fabric}
                    active={controlTab === tab}
                    onClick={() => {
                        app$.next(transition(app$.getValue(), {controlTab: tab}))
                    }}
                >{Icon(tab)} {tab}</NavLink>
            </NavItem>
        )
    }

    function Pane({tab}: { tab: ControlTab }): JSX.Element {

        function Content(): JSX.Element {
            switch (tab) {
                case ControlTab.Grow:
                    return (
                        <TenscriptPanel
                            tenscript={tenscript}
                            setTenscript={setTenscript}
                        />
                    )
                case ControlTab.Shape:
                    return !fabric ? (<div/>) : (
                        <ShapePanel
                            fabric={fabric}
                            selectedBricks={selectedBricks}
                            clearSelectedBricks={clearSelectedBricks}
                            features={features}
                            app$={app$}
                        />
                    )
                case ControlTab.Optimize:
                    return !fabric ? (<div/>) : (
                        <OptimizePanel
                            fabric={fabric}
                            app$={app$}
                            lifePhase$={lifePhase$}
                            rebuild={() => {
                                if (tenscript) {
                                    setTenscript(true, tenscript)
                                }
                            }}
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
