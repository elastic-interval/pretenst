/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { IFabricEngine } from "./fabric/fabric-engine"
import { createFloatFeatures, featureConfig } from "./fabric/fabric-features"
import { FabricKernel } from "./fabric/fabric-kernel"
import registerServiceWorker from "./service-worker"
import { loadState, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./vendor/bootstrap.min.css"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./index.css"

declare const getFabricEngine: () => Promise<IFabricEngine> // implementation: index.html

async function start(): Promise<void> {
    const engine = await getFabricEngine()
    const fabricKernel = new FabricKernel(engine)
    const eig = await import("eig")
    const eigWorld = eig.World.new()
    const eigFabric = eig.Fabric.new(100, 300)
    eigFabric.create_joint(1,1,1)
    eigFabric.create_joint(2,1,1)
    const root = document.getElementById("root") as HTMLElement
    const storedState$ = new BehaviorSubject(loadState(featureConfig))
    storedState$.subscribe(newState => saveState(newState))
    ReactDOM.render(
        <TensegrityView
            fabricKernel={fabricKernel}
            eigWorld={eigWorld}
            eigFabric={eigFabric}
            floatFeatures={createFloatFeatures(storedState$)}
            storedState$={storedState$}
        />,
        root,
    )
    registerServiceWorker()
}

start()
