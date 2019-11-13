/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowLeft, FaCamera, FaEye, FaHammer, FaHandSpock, FaLeaf } from "react-icons/all"
import { Button, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { ControlTab, IFabricState, LifePhase } from "../fabric/fabric-state"
import { ITenscript } from "../fabric/tenscript"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ExplorePanel } from "./explore-panel"
import { PretensePanel } from "./pretense-panel"
import { ShapePanel } from "./shape-panel"
import { TenscriptPanel } from "./tenscript-panel"

const SPLIT_LEFT = "29em"

function Icon(controlTab: ControlTab): JSX.Element {
    switch (controlTab) {
        case ControlTab.Grow:
            return <FaLeaf key="leaf"/>
        case ControlTab.Shape:
            return <FaHammer key="hammer"/>
        case ControlTab.Optimize:
            return <FaHandSpock key="spock"/>
        case ControlTab.Explore:
            return <FaEye key="eye"/>
        // case ControlTab.X:
        //     return <FaList key="list"/>
    }
}

export function ControlTabs({
                                fabric, selectedBrick, setSelectedBrick, tenscript, setTenscript, grow,
                                toFullScreen, fabricState$, lifePhase$, bootstrap, features,
                            }: {
    fabric?: TensegrityFabric,
    selectedBrick?: IBrick,
    setSelectedBrick: (brick?: IBrick) => void,
    tenscript?: ITenscript,
    setTenscript: (tenscript?: ITenscript) => void,
    grow: () => void,
    toFullScreen: () => void,
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
    bootstrap: ITenscript[],
    features: FloatFeature[],
}): JSX.Element {

    const [activeTab, setActiveTab] = useState(ControlTab.Grow)

    function Link({controlTab}: { controlTab: ControlTab }): JSX.Element {
        return (
            <NavItem>
                <NavLink
                    disabled={controlTab !== ControlTab.Grow && !fabric}
                    active={activeTab === controlTab}
                    onClick={() => setActiveTab(controlTab)}
                >{Icon(controlTab)} {controlTab}</NavLink>
            </NavItem>
        )
    }

    function Pane({tab}: { tab: ControlTab }): JSX.Element {

        function Content(): JSX.Element {
            switch (tab) {
                case ControlTab.Grow:
                    return (
                        <TenscriptPanel
                            bootstrap={bootstrap}
                            tenscript={tenscript}
                            setTenscript={setTenscript}
                            grow={grow}
                        />
                    )
                case ControlTab.Shape:
                    return !fabric ? (<div/>) : (
                        <ShapePanel
                            fabric={fabric}
                            selectedBrick={selectedBrick}
                            setSelectedBrick={setSelectedBrick}
                            features={features}
                        />
                    )
                case ControlTab.Optimize:
                    return !fabric ? (<div/>) : (
                        <PretensePanel
                            fabric={fabric}
                            fabricState$={fabricState$}
                            lifePhase$={lifePhase$}
                            rebuild={grow}
                        />
                    )
                case ControlTab.Explore:
                    return !fabric ? (<div/>) : (
                        <ExplorePanel
                            fabric={fabric}
                            features={features}
                            fabricState$={fabricState$}
                        />
                    )
                // case ControlTab.X:
                //     return !fabric ? <div/> : (
                //         <div>
                //             {features.filter(feature => !lengthFeatureToRole(feature.fabricFeature)).map(feature => (
                //                 <div key={feature.title} style={{
                //                     borderStyle: "solid",
                //                     borderColor: "white",
                //                     borderWidth: "0.1em",
                //                     borderRadius: "0.7em",
                //                     padding: "0.2em",
                //                     marginTop: "0.3em",
                //                     color: "white",
                //                     backgroundColor: "#545454",
                //                 }}>
                //                     <FeaturePanel feature={feature} mutable={true}/>
                //                 </div>
                //             ))}
                //         </div>
                //     )
            }
        }

        return (
            <TabPane tabId={tab}><Content/></TabPane>
        )
    }

    function FullScreenButton(): JSX.Element {
        const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
        useEffect(() => {
            const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
            return () => subscription.unsubscribe()
        })
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
                <FaCamera/>
                <br/>
                <FaArrowLeft/>
            </Button>
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
                <FullScreenButton/>
            </div>
        </div>
    )
}

// const CONTROL_TAB_KEY = "ControlTab"
//
// function saveControlTab(controlTab: ControlTab): void {
//     localStorage.setItem(CONTROL_TAB_KEY, controlTab)
// }
//
// function loadControlTab(): ControlTab {
//     const item = localStorage.getItem(CONTROL_TAB_KEY)
//     if (item) {
//         return ControlTab[item]
//     }
//     return ControlTab.Grow
// }
