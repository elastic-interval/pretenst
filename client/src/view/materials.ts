/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import {
    Color,
    DoubleSide,
    LineBasicMaterial,
    Material,
    MeshLambertMaterial,
    MeshPhongMaterial,
    VertexColors,
} from "three"

import { IntervalRole } from "../fabric/fabric-engine"

export const SELECTION_COLOR = "#91934f"
export const SCALE_LINE_COLOR = "#cace02"

const RAINBOW_GRADIENT = [
    "#fc4d4d",
    "#fb712a",
    "#ed9400",
    "#d4b500",
    "#afd200",
    "#80da52",
    "#4edd83",
    "#00ddad",
    "#00c4d7",
    "#00a5ff",
    "#007bff",
    "#2329f7",
].reverse()

const RAINBOW_COLORS = RAINBOW_GRADIENT.map(colorString => new Color(colorString))

// console.log("RAINBOW\n",`const RAINBOW: f32[] = [\n${RAINBOW_COLORS.map(color => (
//     `${(color.r).toFixed(4)}, ${(color.g).toFixed(4)}, ${(color.b).toFixed(4)}`
// )).join(",\n")}\n]`)

const lights = true

export const SURFACE = new MeshPhongMaterial({
    color: new Color("#1c1608"),
    side: DoubleSide,
})

export const SURFACE_GHOST = new MeshPhongMaterial({
    color: new Color("#1c1608"),
    side: DoubleSide,
    transparent: true,
    opacity: 0.5,
})

export const LINE_VERTEX_COLORS = new LineBasicMaterial({
    vertexColors: VertexColors,
})

export const SCALE_LINE = new LineBasicMaterial({
    color: new Color(SCALE_LINE_COLOR),
})

export const FACE = new MeshPhongMaterial({
    lights,
    color: new Color("white"),
    side: DoubleSide,
    transparent: true,
    opacity: 0.2,
})

export const SELECT_MATERIAL = new MeshPhongMaterial({
    color: new Color(SELECTION_COLOR),
    lights: true,
})

const RAINBOW_LAMBERT = RAINBOW_COLORS.map(color => new MeshLambertMaterial({color, lights}))

export function rainbowMaterial(nuance: number): Material {
    const index = Math.floor(nuance * RAINBOW_LAMBERT.length)
    return RAINBOW_LAMBERT[index >= RAINBOW_LAMBERT.length ? RAINBOW_LAMBERT.length - 1 : index]
}

export function roleColorString(intervalRole?: IntervalRole): string | undefined {
    switch (intervalRole) {
        case IntervalRole.ColumnPush:
            return "#862d39"
        case IntervalRole.NexusPush:
            return "#865733"
        case IntervalRole.Triangle:
            return "#266f84"
        case IntervalRole.Ring:
            return "#761894"
        case IntervalRole.Cross:
            return "#7b7349"
        case IntervalRole.BowMid:
            return "#217838"
        case IntervalRole.BowEnd:
            return "#6d7b44"
        case IntervalRole.FacePull:
            return "#bebf05"
        default:
            return undefined
    }
}

export function roleColor(intervalRole?: IntervalRole): Color {
    return new Color(roleColorString(intervalRole))
}

export function roleMaterial(intervalRole: IntervalRole): Material {
    const color = roleColor(intervalRole)
    return new MeshLambertMaterial({color, lights})
}
