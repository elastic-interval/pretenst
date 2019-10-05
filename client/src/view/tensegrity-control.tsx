
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaBullhorn, FaGlobe, FaHandPaper, FaList, FaSortAmountUp } from "react-icons/all"
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { IFeature } from "../fabric/features"
import { ISelection, Selectable } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { AdjustPanel } from "./adjust-panel"
import { CommandPanel } from "./command-panel"
import { FeaturePanel } from "./feature-panel"
import { TensegrityEditPanel } from "./tensegrity-edit-panel"

enum TabName {
    Command = "Command",
    Physics = "Physics",
    Role = "Role",
    Adjust = "Adjust",
    Edit = "Edit",
}

const TABS = Object.keys(TabName).map(key => TabName[key])

export function TensegrityControl({engine, physicsFeatures, roleFeatures, fabric, constructFabric, selection, setSelection}: {
    engine: IFabricEngine,
    physicsFeatures: IFeature[],
    roleFeatures: IFeature[],
    fabric?: TensegrityFabric,
    constructFabric: (fabricCode: string) => void,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState<TabName>(TabName.Command)

    function TabSymbol({tab}: { tab: TabName }): JSX.Element {
        switch (tab) {
            case TabName.Command:
                return <FaBullhorn/>
            case TabName.Physics:
                return <FaGlobe/>
            case TabName.Role:
                return <FaList/>
            case TabName.Adjust:
                return <FaSortAmountUp/>
            case TabName.Edit:
                return <FaHandPaper/>
        }
        return <strong>{tab}</strong>
    }

    return (
        <div className="tensegrity-control">
            <Nav tabs={true}>
                {TABS.map((tab: TabName) => (
                    <NavItem key={tab}>
                        <NavLink href="#" active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                            <TabSymbol tab={tab}/>
                        </NavLink>
                    </NavItem>
                ))}
            </Nav>
            <TabContent className="h-100" activeTab={activeTab}>
                <TabPane tabId={TabName.Command}>
                    <CommandPanel
                        constructFabric={constructFabric}
                        fabric={fabric}
                        cancelSelection={() => setSelection({})}
                    />
                </TabPane>
                <TabPane tabId={TabName.Physics}>
                    <FeaturePanel
                        engine={engine}
                        features={physicsFeatures}
                        isPhysics={true}
                        fabric={fabric}
                    />
                </TabPane>
                <TabPane tabId={TabName.Role}>
                    <FeaturePanel
                        engine={engine}
                        features={roleFeatures}
                        isPhysics={false}
                        fabric={fabric}
                    />
                </TabPane>
                <TabPane className="h-100" tabId={TabName.Adjust}>
                    <AdjustPanel
                        fabric={fabric}
                        setDisplacementSelection={(on: boolean) => {
                            setSelection({selectable: on ? Selectable.DISPLACEMENT : undefined})
                        }}
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
