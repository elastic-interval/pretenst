/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { App } from "./app"
import { API_URI } from "./constants"
import { IFabricEngine } from "./fabric/fabric-engine"
import { createFabricFeatures } from "./fabric/fabric-features"
import { FabricKernel } from "./fabric/fabric-kernel"
import { LifePhase, loadFabricState, saveFabricState } from "./fabric/fabric-state"
import registerServiceWorker from "./service-worker"
import { RemoteStorage } from "./storage/remote-storage"
import { TensegrityView } from "./view/tensegrity-view"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./vendor/bootstrap.min.css"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./index.css"

declare const getFabricEngine: () => Promise<IFabricEngine> // implementation: index.html

const TENSEGRITY = process.env.REACT_APP_ENABLED_APP === "pretenst"

// APP_EVENT.subscribe(appEvent => {
//     switch (appEvent.event) {
//         case AppEvent.Command:
//             console.log(`App Event: ${appEvent.event}: ${appEvent.command}`)
//             break
//         case AppEvent.AppMode:
//             console.log(`App Event: ${appEvent.event}: ${appEvent.appMode}`)
//             break
//         default:
//             console.log(`App Event: ${appEvent.event}`)
//             break
//     }
// })

async function start(): Promise<void> {
    const engine = await getFabricEngine()
    const fabricKernel = new FabricKernel(engine)
    const root = document.getElementById("root") as HTMLElement
    const fabricState$ = new BehaviorSubject(loadFabricState())
    const fabricFeatures = createFabricFeatures(fabricState$)
    fabricState$.subscribe(newState => saveFabricState(newState))
    if (TENSEGRITY) {
        console.log("Starting Pretenst..")
        ReactDOM.render(
            <TensegrityView
                fabricKernel={fabricKernel}
                floatFeatures={fabricFeatures}
                fabricState$={fabricState$}
                lifePhase$={new BehaviorSubject(LifePhase.Growing)}
            />,
            root,
        )
    } else {
        console.log("Starting Galapagotchi..")
        console.log(`Using API at ${API_URI}`)
        const storage = new RemoteStorage(API_URI)
        const user = await storage.getUser()
        ReactDOM.render(
            <App
                engine={engine}
                floatFeatures={fabricFeatures} // todo
                storage={storage}
                user={user}
            />,
            root,
        )
    }
    registerServiceWorker()
}

start()
