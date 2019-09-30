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

enum TabName {
    Global = "Global",
    Physics = "Physics",
    Edit = "Edit",
}

const TABS = Object.keys(TabName).map(key => TabName[key])
// const tabs = [TabName.Global, TabName.Physics, TabName.Edit]

export function TensegrityControl({engine, physics, fabric, constructFabric, selection, setSelection}: {
    engine: IFabricEngine,
    physics: Physics,
    fabric?: TensegrityFabric,
    constructFabric: (fabricCode: string) => void,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState<TabName>(TabName.Global)

    useEffect(() => {
        if (activeTab === TabName.Edit) {
            setSelection({...selection, selectable: Selectable.FACE})
        } else {
            setSelection({selectable: undefined})
        }
    }, [activeTab])

    useEffect(() => {
        if (activeTab !== TabName.Edit && selection.selectable) {
            setActiveTab(TabName.Edit)
        }
    }, [selection])

    return (
        <div>
            <Nav tabs={true}>
                {TABS.map(tab => (
                    <NavItem key={tab}>
                        <NavLink active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                            {tab}
                        </NavLink>
                    </NavItem>
                ))}
            </Nav>
            <TabContent activeTab={activeTab}>
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
            </TabContent>
        </div>
    )
}
