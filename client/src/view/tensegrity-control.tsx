/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaSortAmountUp } from "react-icons/all"
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { AdjustPanel } from "./adjust-panel"

enum TabName {
    Adjust = "Adjust",
}

const TABS = Object.keys(TabName).map(key => TabName[key])

export function TensegrityControl({fabric}: { fabric?: TensegrityFabric }): JSX.Element {

    const [activeTab, setActiveTab] = useState<TabName>(TabName.Adjust)

    function TabSymbol({tab}: { tab: TabName }): JSX.Element {
        switch (tab) {
            case TabName.Adjust:
                return <FaSortAmountUp/>
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
                            // setSelectedFace({selectable: on ? Selectable.DISPLACEMENT : undefined})
                        }}
                    />
                </TabPane>
            </TabContent>
        </div>
    )
}
