import "bootstrap/dist/css/bootstrap.min.css"
import * as React from "react"
import * as ReactDOM from "react-dom"

import App from "./app"
import {IFabricExports} from "./body/fabric-exports"
import registerServiceWorker from "./service-worker"
import {LocalStorage} from "./storage/local-storage"

import "./index.css"

declare const getFabricExports: () => Promise<IFabricExports> // implementation: index.html
const storage: LocalStorage = new LocalStorage(localStorage)

getFabricExports().then(fabricExports => {
    ReactDOM.render(
        <App fabricExports={fabricExports} storage={storage}/>,
        document.getElementById("root") as HTMLElement,
    )
    registerServiceWorker()
})
