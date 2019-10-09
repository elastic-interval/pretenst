/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import "bootstrap/dist/css/bootstrap.min.css"
import * as React from "react"
import * as ReactDOM from "react-dom"

import { App } from "./app"
import { APP_EVENT, AppEvent } from "./app-event"
import { API_URI } from "./constants"
import { IFabricDimensions, IFabricEngine, IntervalRole, notWater, PhysicsFeature } from "./fabric/fabric-engine"
import { FabricKernel } from "./fabric/fabric-kernel"
import { applyPhysicsFeature, enumToFeatureArray } from "./fabric/features"
import { TensegrityFabric } from "./fabric/tensegrity-fabric"
import "./index.css"
import registerServiceWorker from "./service-worker"
import { RemoteStorage } from "./storage/remote-storage"
import { TensegrityView } from "./view/tensegrity-view"

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
    if (TENSEGRITY) {
        console.log("Starting Pretenst..")
        const dimensions: IFabricDimensions = {
            instanceMax: 30,
            jointCountMax: 6000,
            intervalCountMax: 15000,
            faceCountMax: 4000,
        }
        const fabricKernel = new FabricKernel(engine, roleFeatures, dimensions)
        const fabricCache: Record<string, TensegrityFabric> = {}
        const getFabric = (name: string) => {
            const cached = fabricCache[name]
            if (cached) {
                return cached
            }
            const newFabric = fabricKernel.createTensegrityFabric(name)
            if (!newFabric) {
                throw new Error()
            }
            fabricCache[name] = newFabric
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
                getFabric={getFabric}
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
