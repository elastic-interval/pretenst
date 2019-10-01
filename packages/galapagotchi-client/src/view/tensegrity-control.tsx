/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { Physics } from "../fabric/physics"
import { ISelection, Selectable } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { AdjustPanel } from "./adjust-panel"
import { GlobalFabricPanel } from "./global-fabric-panel"
import { PhysicsPanel } from "./physics-panel"
import { TensegrityEditPanel } from "./tensegrity-edit-panel"

enum TabName {
    Global = "Global",
    Physics = "Physics",
    Edit = "Edit",
    Adjust = "Adjust",
}

const TABS = Object.keys(TabName).map(key => TabName[key])

export function TensegrityControl({engine, physics, fabric, constructFabric, selection, setSelection}: {
    engine: IFabricEngine,
    physics: Physics,
    fabric?: TensegrityFabric,
    constructFabric: (fabricCode: string) => void,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState<TabName>(TabName.Global)

    return (
        <div className="tensegrity-control">
            <Nav tabs={true}>
                {TABS.map(tab => (
                    <NavItem key={tab}>
                        <NavLink href="#" active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                            {tab}
                        </NavLink>
                    </NavItem>
                ))}
            </Nav>
            <TabContent className="h-100" activeTab={activeTab}>
                <TabPane tabId={TabName.Global}>
                    <GlobalFabricPanel
                        constructFabric={constructFabric}
                        fabric={fabric}
                        cancelSelection={() => setSelection({})}
                    />
                </TabPane>
                <TabPane tabId={TabName.Physics}>
                    <PhysicsPanel
                        engine={engine}
                        physics={physics}
                        fabric={fabric}
                    />
                </TabPane>
                <TabPane tabId={TabName.Edit}>
                    <TensegrityEditPanel
                        fabric={fabric}
                        selection={selection}
                        setSelection={setSelection}
                    />
                </TabPane>
                <TabPane className="h-100" tabId={TabName.Adjust}>
                    <AdjustPanel
                        fabric={fabric}
                        setStressSelection={(on: boolean) => {
                            setSelection({selectable: on ? Selectable.STRESS : undefined})
                        }}
                    />
                </TabPane>
            </TabContent>
        </div>
    )
}
