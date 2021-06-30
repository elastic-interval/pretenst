/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
import { SurfaceCharacter, WorldFeature } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { RecoilRoot } from "recoil"

import { WORLD_FEATURES } from "./fabric/eig-util"
import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import registerServiceWorker from "./service-worker"
import { MainView } from "./view/main-view"

function render(element: JSX.Element): void {
    const root = document.getElementById("root") as HTMLElement
    ReactDOM.render(element, root)
}

export async function startReact(
    eig: typeof import("eig"),
    frozenWorld: typeof import("eig").World,
    stickyWorld: typeof import("eig").World,
    bouncyWorld: typeof import("eig").World,
): Promise<void> {
    const getWorld = (surfaceCharacter: SurfaceCharacter): typeof import("eig").World => {
        switch (surfaceCharacter) {
            case SurfaceCharacter.Frozen:
                return frozenWorld
            case SurfaceCharacter.Sticky:
                return stickyWorld
            case SurfaceCharacter.Bouncy:
                return bouncyWorld
            default:
                throw new Error("surface character?")
        }
    }
    const createInstance: CreateInstance = (surfaceCharacter: SurfaceCharacter, featureValues: Record<WorldFeature, number>, fabric?: object) => {
        const fabricInstance = new FabricInstance(eig, 2000, getWorld(surfaceCharacter), fabric)
        WORLD_FEATURES.forEach(feature => {
            const percent = featureValues[feature]
            if (percent === undefined) {
                return
            }
            fabricInstance.world.set_float_percent(feature, percent)
        })
        return fabricInstance
    }
    render(
        <RecoilRoot>
            <MainView createInstance={createInstance}/>
        </RecoilRoot>,
    )
    registerServiceWorker()
}
