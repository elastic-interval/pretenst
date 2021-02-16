/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import { RecoilRoot } from "recoil"

import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import registerServiceWorker from "./service-worker"
import { TensegrityView } from "./view/tensegrity-view"

function render(element: JSX.Element): void {
    const root = document.getElementById("root") as HTMLElement
    ReactDOM.render(element, root)
}

export async function startReact(
    eig: typeof import("eig"),
    stickyWorld: typeof import("eig").World,
    frozenWorld: typeof import("eig").World,
): Promise<void> {
    const createInstance: CreateInstance = (frozen: boolean, fabric?: object) => (
        new FabricInstance(eig, 2000, frozen ? frozenWorld : stickyWorld, fabric)
    )
    render(<RecoilRoot><TensegrityView createInstance={createInstance}/></RecoilRoot>)
    registerServiceWorker()
}
