/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { Physics } from "../fabric/physics"
import { ISelection, Selectable } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { GlobalFabricPanel } from "./global-fabric-panel"
import { PhysicsPanel } from "./physics-panel"
import { TensegrityEditPanel } from "./tensegrity-edit-panel"

export function TensegrityControl({engine, physics, fabric, constructFabric, selection, setSelection}: {
    engine: IFabricEngine,
    physics: Physics,
    fabric?: TensegrityFabric,
    constructFabric: (fabricCode: string) => void,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState("1")

    useEffect(() => {
        if (activeTab === "3") {
            setSelection({...selection, selectable: Selectable.FACE})
        } else {
            setSelection({selectable: undefined})
        }
    }, [activeTab])

    useEffect(() => {
        if (activeTab !== "3" && selection.selectable) {
            setActiveTab("3")
        }
    }, [selection])

    return (
        <div>
            <Nav tabs={true}>
                <NavItem>
                    <NavLink active={activeTab === "1"} onClick={() => setActiveTab("1")}>
                        Global
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink active={activeTab === "2"} onClick={() => setActiveTab("2")}>
                        Physics
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink active={activeTab === "3"} onClick={() => setActiveTab("3")}>
                        Edit
                    </NavLink>
                </NavItem>
            </Nav>
            <TabContent activeTab={activeTab}>
                <TabPane tabId="1">
                    <GlobalFabricPanel
                        constructFabric={constructFabric}
                        fabric={fabric}
                        cancelSelection={() => setSelection({})}
                    />
                </TabPane>
                <TabPane tabId="2">
                    <PhysicsPanel
                        engine={engine}
                        physics={physics}
                        fabric={fabric}
                    />
                </TabPane>
                <TabPane tabId="3">
                    <TensegrityEditPanel
                        fabric={fabric}
                        selection={selection}
                        setSelection={setSelection}
                    />
                </TabPane>
            </TabContent>
        </div>
    )
}
