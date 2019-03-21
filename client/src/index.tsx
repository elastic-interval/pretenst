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

const REMOTE_STORAGE = false

declare const getFabricExports: () => Promise<IFabricExports> // implementation: index.html

const storage: IStorage = REMOTE_STORAGE ? new RemoteStorage() : new BrowserStorage(localStorage)

getFabricExports().then(fabricExports => {
    ReactDOM.render(
        <App fabricExports={fabricExports} storage={storage}/>,
        document.getElementById("root") as HTMLElement,
    )
    registerServiceWorker()
})
