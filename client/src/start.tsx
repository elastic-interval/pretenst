/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
import { SurfaceCharacter, WorldFeature } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { RecoilRoot } from "recoil"

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
    const createDesignInstance: CreateInstance = (surfaceCharacter: SurfaceCharacter, fabric?: object) => (
        new FabricInstance(eig, 2000, getWorld(surfaceCharacter), fabric)
    )
    const createSphereInstance: CreateInstance = (surfaceCharacter: SurfaceCharacter, fabric?: object) => {
        const instance = new FabricInstance(eig, 2000, getWorld(surfaceCharacter), fabric)
        instance.world.set_float_percent(WorldFeature.IterationsPerFrame, 200)
        instance.world.set_float_percent(WorldFeature.Gravity, 1000)
        instance.world.set_float_percent(WorldFeature.VisualStrain, 0)
        instance.world.set_float_percent(WorldFeature.StiffnessFactor, 800)
        instance.world.set_float_value(WorldFeature.ShapingPretenstFactor, 0.01)
        instance.world.set_float_value(WorldFeature.ShapingStiffnessFactor, 0.02)
        instance.world.set_float_value(WorldFeature.PushOverPull, 20)
        return instance
    }
    const createBodyInstance: CreateInstance = (surfaceCharacter: SurfaceCharacter, fabric?: object) => {
        const instance = new FabricInstance(eig, 2000, getWorld(surfaceCharacter), fabric)
        instance.world.set_float_percent(WorldFeature.IterationsPerFrame, 300)
        instance.world.set_float_percent(WorldFeature.Drag, 200)
        instance.world.set_float_percent(WorldFeature.StiffnessFactor, 150)
        instance.world.set_float_percent(WorldFeature.Gravity, 500)
        return instance
    }
    render(
        <RecoilRoot>
            <MainView
                createDesignInstance={createDesignInstance}
                createSphereInstance={createSphereInstance}
                createBodyInstance={createBodyInstance}
            />
        </RecoilRoot>,
    )
    registerServiceWorker()
}
