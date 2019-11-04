
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, DoubleSide, FaceColors, LineBasicMaterial, MeshPhongMaterial, VertexColors } from "three"

export const GOTCHI_GHOST = new MeshPhongMaterial({
    lights: true,
    color: new Color("silver"),
    transparent: true,
    opacity: 0.6,
})

export const GOTCHI = new MeshPhongMaterial({lights: true, color: new Color("silver")})

export const ISLAND = new MeshPhongMaterial({vertexColors: FaceColors, lights: true})

export const HANGER_OCCUPIED = new LineBasicMaterial({color: new Color("black")})

export const HANGER_FREE = new LineBasicMaterial({color: new Color("green")})

export const HOME_HEXALOT = new LineBasicMaterial({color: new Color("white")})

export const AVAILABLE_HEXALOT = new LineBasicMaterial({color: new Color("green")})

export const JOURNEY = new LineBasicMaterial({color: new Color("crimson")})

export const GOTCHI_ARROW = new LineBasicMaterial({color: new Color("magenta")})

export const SELECTED_POINTER = new LineBasicMaterial({color: new Color("yellow")})

export const SURFACE = new MeshPhongMaterial({
    color: new Color("#1c1608"),
    // lights: true,
    side: DoubleSide,
})

export const LINE = new LineBasicMaterial({
    vertexColors: VertexColors,
})

export const SCALE_LINE_COLOR = "#cace02"

export const SCALE_LINE = new LineBasicMaterial({
    color: new Color(SCALE_LINE_COLOR),
})

export const FACE = new MeshPhongMaterial({
    lights: true,
    color: new Color("white"),
    side: DoubleSide,
    transparent: true,
    opacity: 0.2,
})

export const HOT_COLOR = "#910000"
export const COLD_COLOR = "#3b6ab8"
export const SLACK_COLOR = "#00a700"
export const ATTENUATED_COLOR = "#212121"

export const SLACK = new MeshPhongMaterial({
    lights: true,
    color: new Color(SLACK_COLOR),
})

export const ATTENUATED = new MeshPhongMaterial({
    lights: true,
    color: new Color(ATTENUATED_COLOR),
})

export const PUSH_MATERIAL = new MeshPhongMaterial({
    lights: true,
    color: new Color(HOT_COLOR),
})

export const CABLE = new MeshPhongMaterial({
    lights: true,
    color: new Color(COLD_COLOR),
})

export const FACE_SPHERE = new MeshPhongMaterial({
    lights: true,
    color: new Color("#a88d00"),
})
