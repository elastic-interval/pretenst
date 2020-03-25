/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

// eslint-disable-next-line @typescript-eslint/tslint/config
import "./vendor/bootstrap.min.css"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./index.css"

async function start(eig: typeof import("eig"),world: typeof import("eig").World): Promise<void> {
    const starter = await import("./start")
    await starter.startReact(eig, world)
}

async function load(): Promise<void> {
    const eig = await import("eig")
    // @ts-ignore
    start(eig, eig.World.new())
}

load()
