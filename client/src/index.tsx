/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { App } from "./app"
import { APP_EVENT, AppEvent } from "./app-event"
import { API_URI } from "./constants"
import { GlobalFeature, IFabricEngine } from "./fabric/fabric-engine"
import { FabricKernel } from "./fabric/fabric-kernel"
import { applyPhysicsFeature, enumToFeatureArray } from "./fabric/features"
import { IntervalRole } from "./fabric/interval-role"
import registerServiceWorker from "./service-worker"
import { RemoteStorage } from "./storage/remote-storage"
import { ICode } from "./view/code-panel"
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

async function start(): Promise<void> {
    const engine = await getFabricEngine()
    const root = document.getElementById("root") as HTMLElement
    const roleFeatures = enumToFeatureArray(IntervalRole, false)
    const pretensingStep = new BehaviorSubject(0)
    if (TENSEGRITY) {
        console.log("Starting Pretenst..")
        const fabricKernel = new FabricKernel(engine)
        const buildFabric = (code: ICode) => {
            const newFabric = fabricKernel.createTensegrityFabric(name, code.codeTree)
            if (!newFabric) {
                throw new Error()
            }
            return newFabric
        }
        const globalFeatures = enumToFeatureArray(GlobalFeature, true)
        globalFeatures.forEach(feature => applyPhysicsFeature(engine, feature))
        ReactDOM.render(
            <TensegrityView
                engine={engine}
                globalFeatures={globalFeatures}
                roleFeatures={roleFeatures}
                buildFabric={buildFabric}
                pretensingStep$={pretensingStep}
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
                roleFeatures={roleFeatures}
                storage={storage}
                user={user}
            />,
            root,
        )
    }
    registerServiceWorker()
}

start()
