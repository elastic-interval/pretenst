/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole } from "eig"
import {
    Color,
    DoubleSide,
    LineBasicMaterial,
    Material,
    MeshLambertMaterial,
    MeshPhongMaterial,
} from "three"

export const SELECTION_COLOR = "#91934f"
export const JOURNEY_LINE_COLOR = "#cace02"
export const JOINT_COLOR = "#e83ada"

const RAINBOW_GRADIENT = [
    "#fd0000",
    "#c94f00",
    "#d58e1c",
    "#897c00",
    "#6c8901",
    "#1d6c01",
    "#0e4e00",
    "#007f67",
    "#01808b",
    "#005da3",
    "#0015c7",
    "#0000ff",
].reverse()

const RAINBOW_COLORS = RAINBOW_GRADIENT.map(c => new Color().setHex(parseInt(`${c.substring(1)}`, 16)))

// console.log("RAINBOW\n", `pub const RAINBOW: [[f32; 3]; ${RAINBOW_GRADIENT.length}] = [\n${RAINBOW_COLORS.map((color) => {
//     const render = (c: number) => c.toFixed(3)
//     const {r, g, b} = color
//     return (
//         `[${render(r)}, ${render(g)}, ${render(b)}], // ${color.getHexString()}`
//     )
// }).join("\n")}\n];`)

export const SURFACE = new MeshPhongMaterial({
    color: new Color("#1c1608"),
    side: DoubleSide,
    opacity: 0.5,
})

export const LINE_VERTEX_COLORS = new LineBasicMaterial({
    vertexColors: true,
})

export const SELECT_MATERIAL = new MeshPhongMaterial({
    color: new Color(SELECTION_COLOR),
})

export const JOINT_MATERIAL = new MeshPhongMaterial({
    color: new Color(JOINT_COLOR),
})

const RAINBOW_LAMBERT = RAINBOW_COLORS.map(color => new MeshLambertMaterial({color}))

export function rainbowMaterial(nuance: number): Material {
    const index = Math.floor(nuance * RAINBOW_LAMBERT.length)
    return RAINBOW_LAMBERT[index >= RAINBOW_LAMBERT.length ? RAINBOW_LAMBERT.length - 1 : index]
}

export function roleColorString(intervalRole?: IntervalRole): string | undefined {
    switch (intervalRole) {
        case IntervalRole.NexusPush:
            return "#6541b4"
        case IntervalRole.ColumnPush:
            return "#2f3aca"
        case IntervalRole.Triangle:
            return "#c9c445"
        case IntervalRole.Ring:
            return "#e83ada"
        case IntervalRole.Cross:
            return "#59ebcb"
        case IntervalRole.BowMid:
            return "#f14302"
        case IntervalRole.BowEnd:
            return "#c03b02"
        case IntervalRole.FaceConnector:
            return "#fe0105"
        case IntervalRole.FaceDistancer:
            return "#fefb07"
        case IntervalRole.FaceAnchor:
            return "#dc5bf8"
        default:
            return undefined
    }
}

export function roleColor(intervalRole?: IntervalRole): Color {
    return new Color(roleColorString(intervalRole))
}

export function roleMaterial(intervalRole: IntervalRole): Material {
    const color = roleColor(intervalRole)
    return new MeshLambertMaterial({color})
}
