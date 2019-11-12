/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import "react-sortable-tree/style.css"
import { BehaviorSubject } from "rxjs"

import { App } from "./app"
import { APP_EVENT, AppEvent } from "./app-event"
import { API_URI } from "./constants"
import { IFabricEngine } from "./fabric/fabric-engine"
import { createFabricFeatures } from "./fabric/fabric-features"
import { FabricKernel } from "./fabric/fabric-kernel"
import { LifePhase, loadFabricState, saveFabricState } from "./fabric/fabric-state"
import { codeTreeToTenscript, ITenscript, ITenscriptTree } from "./fabric/tenscript"
import registerServiceWorker from "./service-worker"
import { RemoteStorage } from "./storage/remote-storage"
import { TensegrityView } from "./view/tensegrity-view"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./vendor/bootstrap.min.css"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./index.css"

declare const getFabricEngine: () => Promise<IFabricEngine> // implementation: index.html

const TENSEGRITY = process.env.REACT_APP_ENABLED_APP === "pretenst"

APP_EVENT.subscribe(appEvent => {
    switch (appEvent.event) {
        case AppEvent.Command:
            console.log(`App Event: ${appEvent.event}: ${appEvent.command}`)
            break
        case AppEvent.AppMode:
            console.log(`App Event: ${appEvent.event}: ${appEvent.appMode}`)
            break
        default:
            console.log(`App Event: ${appEvent.event}`)
            break
    }
})

async function getBootstrapTenscripts(): Promise<ITenscript[]> {
    const response = await fetch("/bootstrap.json")
    const body = await response.json()
    if (!body) {
        return [{code: "0", tree: {_: 0}}]
    }
    const pretenst: ITenscriptTree[] = body.pretenst
    return pretenst.map(codeTreeToTenscript)
}

async function start(): Promise<void> {
    const engine = await getFabricEngine()
    const fabricKernel = new FabricKernel(engine)
    const root = document.getElementById("root") as HTMLElement
    const fabricFeatures = createFabricFeatures()
    const fabricState$ = new BehaviorSubject(loadFabricState())
    const lifePhase$ = new BehaviorSubject(LifePhase.Growing)
    fabricState$.subscribe(newState => saveFabricState(newState))
    const bootstrap = await getBootstrapTenscripts()
    if (TENSEGRITY) {
        console.log("Starting Pretenst..")
        ReactDOM.render(
            <TensegrityView
                fabricKernel={fabricKernel}
                features={fabricFeatures}
                bootstrap={bootstrap}
                fabricState$={fabricState$}
                lifePhase$={lifePhase$}
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
                roleFeatures={fabricFeatures} // todo
                storage={storage}
                user={user}
            />,
            root,
        )
    }
    registerServiceWorker()
}

start()
