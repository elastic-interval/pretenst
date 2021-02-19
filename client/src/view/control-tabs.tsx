/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaArrowLeft } from "react-icons/all"
import { Alert, Button, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"
import { useRecoilState } from "recoil"

import { RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { ISelection } from "../fabric/tensegrity-types"
import { ControlTab, controlTabAtom } from "../storage/recoil"

import { FrozenTab } from "./frozen-tab"
import { PhaseTab } from "./phase-tab"
import { ScriptTab } from "./script-tab"
import { ShapeTab } from "./shape-tab"

const SPLIT_LEFT = "25em"

export function ControlTabs({selection, tensegrity, runTenscript, toFullScreen}: {
    selection: ISelection,
    runTenscript: RunTenscript,
    tensegrity?: Tensegrity,
    toFullScreen: () => void,
}): JSX.Element {
    const [controlTab, updateControlTab] = useRecoilState(controlTabAtom)

    function Link({tab}: { tab: ControlTab }): JSX.Element {
        return (
            <NavItem>
                <NavLink
                    active={controlTab === tab}
                    onClick={() => updateControlTab(tab)}
                >{tab}</NavLink>
            </NavItem>
        )
    }

    function Pane({tab}: { tab: ControlTab }): JSX.Element {

        const NO_FABRIC = <Alert color="warning">No fabric</Alert>

        function Content(): JSX.Element {
            switch (tab) {
                case ControlTab.Script:
                    return <ScriptTab runTenscript={runTenscript}/>
                case ControlTab.Phase:
                    return !tensegrity ? NO_FABRIC : (<PhaseTab tensegrity={tensegrity}/>)
                case ControlTab.Shape:
                    return !tensegrity ? NO_FABRIC : (<ShapeTab tensegrity={tensegrity} selection={selection}/>)
                case ControlTab.Frozen:
                    return !tensegrity ? NO_FABRIC : (
                        <FrozenTab tensegrity={tensegrity}/>
                    )
                default:
                    throw new Error("Tab?")
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
