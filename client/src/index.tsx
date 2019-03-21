import "bootstrap/dist/css/bootstrap.min.css"
import * as React from "react"
import * as ReactDOM from "react-dom"

import App from "./app"
import {IFabricExports} from "./body/fabric-exports"
import "./index.css"
import registerServiceWorker from "./service-worker"
import {BrowserStorage} from "./storage/browser-storage"
import {RemoteStorage} from "./storage/remote-storage"
import {IStorage} from "./storage/storage"


declare const getFabricExports: () => Promise<IFabricExports> // implementation: index.html

const REMOTE_STORAGE_URI = process.env.REACT_APP_REMOTE_STORAGE_URI

let storage: IStorage
if (REMOTE_STORAGE_URI !== undefined) {
    console.log(`Using remote storage at ${REMOTE_STORAGE_URI}`)
    storage = new RemoteStorage(REMOTE_STORAGE_URI)
} else {
    console.log("Using in-browser storage")
    storage = new BrowserStorage(localStorage)
}

getFabricExports().then(fabricExports => {
    ReactDOM.render(
        <App fabricExports={fabricExports} storage={storage}/>,
        document.getElementById("root") as HTMLElement,
    )
    registerServiceWorker()
})
