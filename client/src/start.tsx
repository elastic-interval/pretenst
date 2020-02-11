/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, View, World } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { createFloatFeatures, featureConfig } from "./fabric/fabric-features"
import registerServiceWorker from "./service-worker"
import { loadState, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

export async function startReact(world: World, fabric: Fabric, view: View): Promise<void> {
    const root = document.getElementById("root") as HTMLElement
    const storedState$ = new BehaviorSubject(loadState(featureConfig))
    storedState$.subscribe(newState => saveState(newState))
    ReactDOM.render(
        <TensegrityView
            world={world}
            fabric={fabric}
            view={view}
            floatFeatures={createFloatFeatures(storedState$)}
            storedState$={storedState$}
        />,
        root,
    )
    registerServiceWorker()
}

