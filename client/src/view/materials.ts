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
    color: new Color("silver"),
    lights: true,
    opacity: 0.7,
    transparent: true,
})

export const TENSEGRITY_LINE = new LineBasicMaterial({
    vertexColors: VertexColors,
})


export const TENSEGRITY_FACE = new MeshPhongMaterial({
    lights: true,
    color: new Color("white"),
    side: DoubleSide,
    transparent: true,
    opacity: 0.6,
})
