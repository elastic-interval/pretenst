import "bootstrap/dist/css/bootstrap.min.css"
import * as React from "react"
import * as ReactDOM from "react-dom"

import App from "./app"
import {AppStorage} from "./app-storage"
import {IFabricExports} from "./body/fabric-exports"
import "./index.css"
import registerServiceWorker from "./service-worker"

declare const getFabricExports: () => Promise<IFabricExports> // implementation: index.html
const storage: AppStorage = new AppStorage(localStorage)

getFabricExports().then(fabricExports => {
    ReactDOM.render(
        <App fabricExports={fabricExports} storage={storage}/>,
        document.getElementById("root") as HTMLElement,
    )
    registerServiceWorker()
})
