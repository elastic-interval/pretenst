/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaHandPaper, FaSortAmountUp } from "react-icons/all"
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"

import { ISelection, Selectable } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { AdjustPanel } from "./adjust-panel"
import { TensegrityEditPanel } from "./tensegrity-edit-panel"

enum TabName {
    Adjust = "Adjust",
    Edit = "Edit",
}

const TABS = Object.keys(TabName).map(key => TabName[key])

export function TensegrityControl({fabric, selection, setSelection}: {
    fabric?: TensegrityFabric,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {

    const [activeTab, setActiveTab] = useState<TabName>(TabName.Adjust)

    function TabSymbol({tab}: { tab: TabName }): JSX.Element {
        switch (tab) {
            case TabName.Adjust:
                return <FaSortAmountUp/>
            case TabName.Edit:
                return <FaHandPaper/>
        }
        return <strong>{tab}</strong>
    }

    return (
        <div style={{height: "95%"}}>
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
