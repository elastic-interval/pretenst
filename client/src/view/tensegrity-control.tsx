/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { Physics } from "../fabric/physics"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { GlobalFabricPanel } from "./global-fabric-panel"
import { PhysicsPanel } from "./physics-panel"

export function TensegrityControl({engine, physics, fabric, constructFabric, cancelSelection}: {
    engine: IFabricEngine,
    physics: Physics,
    fabric?: TensegrityFabric,
    constructFabric: (fabricCode: string) => void,
    cancelSelection: () => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState("1")

    return (
        <div className="bg-secondary">
            <Nav tabs={true}>
                <NavItem>
                    <NavLink
                        active={activeTab === "1"}
                        onClick={() => setActiveTab("1")}
                    >
                        Tab1
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        active={activeTab === "2"}
                        onClick={() => setActiveTab("2")}
                    >
                        Physics
                    </NavLink>
                </NavItem>
            </Nav>
            <TabContent activeTab={activeTab} className="h-100">
                <TabPane tabId="1" className="text-center h-100">
                    <GlobalFabricPanel
                        constructFabric={constructFabric}
                        fabric={fabric}
                        cancelSelection={cancelSelection}
                    />
                </TabPane>
                <TabPane tabId="2" className="h-100">
                    {!fabric ? undefined : (
                        <PhysicsPanel engine={engine} physics={physics} instance={fabric.instance}/>
                    )}
                </TabPane>
            </TabContent>
        </div>
    )
}
