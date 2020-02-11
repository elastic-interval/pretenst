/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

// eslint-disable-next-line @typescript-eslint/tslint/config
import "./vendor/bootstrap.min.css"
// eslint-disable-next-line @typescript-eslint/tslint/config
import "./index.css"

async function start(eig: typeof import("eig")): Promise<void> {
    const world = eig.World.new()
    const fabric = eig.Fabric.new(100, 300, 10)
    const view = eig.View.new(100, 300, 10)
    const starter = await import("./start")
    await starter.startReact(world, fabric, view)
}

async function load(): Promise<void> {
    start(await import("eig"))
}

load()
