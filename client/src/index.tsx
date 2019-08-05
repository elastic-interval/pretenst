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
import { IFabricExports } from "./fabric/fabric-exports"
import "./index.css"
import registerServiceWorker from "./service-worker"
import { RemoteStorage } from "./storage/remote-storage"
import { Tensegrity } from "./tensegrity"

declare const getFabricExports: () => Promise<IFabricExports> // implementation: index.html

const TENSEGRITY = false

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
    const fabricExports = await getFabricExports()
    const user = await storage.getUser()
    ReactDOM.render(
        TENSEGRITY ?
            <Tensegrity fabricExports={fabricExports}/>
            :
            <App fabricExports={fabricExports} storage={storage} user={user}/>,
        document.getElementById("root") as HTMLElement,
    )
    registerServiceWorker()

}

start()
