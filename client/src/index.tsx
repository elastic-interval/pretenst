/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"

import { App } from "./app"
import { APP_EVENT, AppEvent } from "./app-event"
import { API_URI } from "./constants"
import { IFabricEngine, IntervalRole, notWater, PhysicsFeature } from "./fabric/fabric-engine"
import { FabricKernel } from "./fabric/fabric-kernel"
import { applyPhysicsFeature, enumToFeatureArray } from "./fabric/features"
import { ICodeTree } from "./fabric/tensegrity-brick-types"
import registerServiceWorker from "./service-worker"
import { RemoteStorage } from "./storage/remote-storage"
import { TensegrityView } from "./view/tensegrity-view"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./vendor/bootstrap.min.css"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./index.css"
import { BehaviorSubject } from "rxjs"

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
    const annealStep$ = new BehaviorSubject(0)
    if (TENSEGRITY) {
        console.log("Starting Pretenst..")
        const fabricKernel = new FabricKernel(engine)
        const buildFabric = (name: string, codeTree: ICodeTree) => {
            const newFabric = fabricKernel.createTensegrityFabric(name, codeTree)
            if (!newFabric) {
                throw new Error()
            }
            return newFabric
        }
        const physicsFeatures = enumToFeatureArray(PhysicsFeature, true)
            .filter(feature => notWater(feature.name.physicsFeature))
        physicsFeatures.forEach(feature => applyPhysicsFeature(engine, feature))
        const features = [...roleFeatures, ...physicsFeatures]
        ReactDOM.render(
            <TensegrityView
                engine={engine}
                features={features}
                buildFabric={buildFabric}
                annealStep$={annealStep$}
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
