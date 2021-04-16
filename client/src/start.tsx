/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { RecoilRoot } from "recoil"
import { Vector3 } from "three"

import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import registerServiceWorker from "./service-worker"
import { SphereView } from "./sphere/sphere-view"
import { TensegritySphere } from "./sphere/tensegrity-sphere"

function render(element: JSX.Element): void {
    const root = document.getElementById("root") as HTMLElement
    ReactDOM.render(element, root)
}

export async function startReact(
    eig: typeof import("eig"),
    stickyWorld: typeof import("eig").World,
    frozenWorld: typeof import("eig").World,
): Promise<void> {
    const createInstance: CreateInstance = (frozen: boolean, fabric?: object) => {
        const fabricInstance = new FabricInstance(eig, 200, frozen ? frozenWorld : stickyWorld, fabric)
        fabricInstance.world.set_float_value(WorldFeature.Gravity, 0)
        fabricInstance.world.set_float_value(WorldFeature.VisualStrain, 0)
        fabricInstance.world.set_float_value(WorldFeature.ShapingDrag, 0.02)
        fabricInstance.world.set_float_value(WorldFeature.ShapingPretenstFactor, 0.01)
        fabricInstance.world.set_float_value(WorldFeature.ShapingStiffnessFactor, 0.02)
        fabricInstance.world.set_float_value(WorldFeature.PushOverPull, 20)
        return fabricInstance
    }
    const at = new Vector3(0, 3, 0)
    const createSphere = (frequency: number) => {
        const sphereInstance = createInstance(false)
        return new TensegritySphere(at, 1, frequency, 0.3333,  sphereInstance)
    }
    render(<RecoilRoot><SphereView createSphere={createSphere}/></RecoilRoot>)
    registerServiceWorker()
}
