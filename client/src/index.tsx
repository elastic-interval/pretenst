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

console.log(`Using API at ${API_URI}`)
const storage = new RemoteStorage(API_URI)

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
    const user = await storage.getUser()
    const root = document.getElementById("root") as HTMLElement
    const physicsFeatures = enumToFeatureArray(PhysicsFeature, true)
        .filter(feature => notWater(feature.name.physicsFeature))
    const roleFeatures = enumToFeatureArray(IntervalRole, false)
    const fabricCache: Record<string, TensegrityFabric> = {}
    physicsFeatures.forEach(feature => applyPhysicsFeature(engine, feature))
    if (TENSEGRITY) {
        const dimensions: IFabricDimensions = {
            instanceMax: 30,
            jointCountMax: 6000,
            intervalCountMax: 15000,
            faceCountMax: 4000,
        }
        const fabricKernel = new FabricKernel(engine, roleFeatures, dimensions)
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
        ReactDOM.render(
            <TensegrityView
                engine={engine}
                physicsFeatures={physicsFeatures}
                roleFeatures={roleFeatures}
                getFabric={getFabric}
            />,
            root,
        )
    } else {
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
