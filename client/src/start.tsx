/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { createFloatFeatures, featureConfig } from "./fabric/fabric-features"
import { GotchiView } from "./gotchi/gotchi-view"
import registerServiceWorker from "./service-worker"
import { loadState, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

const GOTCHI = true

export async function startReact(eig: typeof import("eig")): Promise<void> {
    const root = document.getElementById("root") as HTMLElement
    if (GOTCHI) {
        const storedState = loadState(featureConfig, eig.default_fabric_feature)
        ReactDOM.render(
            <GotchiView
                eig={eig}
                storedState={storedState}
            />,
            root,
        )
    } else {
        const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_fabric_feature))
        storedState$.subscribe(newState => saveState(newState))
        ReactDOM.render(
            <TensegrityView
                eig={eig}
                floatFeatures={createFloatFeatures(storedState$, eig.default_fabric_feature)}
                storedState$={storedState$}
            />,
            root,
        )
    }
    registerServiceWorker()
}

