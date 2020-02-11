/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

// eslint-disable-next-line @typescript-eslint/tslint/config
import "./vendor/bootstrap.min.css"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./index.css"

async function start(eig: typeof import("eig")): Promise<void> {
    const starter = await import("./start")
    await starter.startReact(eig)
}

async function load(): Promise<void> {
    start(await import("eig"))
}

load()
