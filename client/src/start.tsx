/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
import { WorldFeature } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { RecoilRoot } from "recoil"

import { FabricInstance } from "./fabric/fabric-instance"
import registerServiceWorker from "./service-worker"
import { MainView } from "./view/main-view"

function render(element: JSX.Element): void {
    const root = document.getElementById("root") as HTMLElement
    ReactDOM.render(element, root)
}

export async function startReact(
    eig: typeof import("eig"),
    world: typeof import("eig").World,
): Promise<void> {
    render(
        <RecoilRoot>
            <MainView createInstance={(
                featureValues: Record<WorldFeature, number>,
                // eslint-disable-next-line @typescript-eslint/ban-types
                fabric?: object,
            ) => new FabricInstance(
                    eig,
                    featureValues,
                    2000, // TODO
                    world,
                    fabric,
                )}/>
        </RecoilRoot>,
    )
    registerServiceWorker()
}
