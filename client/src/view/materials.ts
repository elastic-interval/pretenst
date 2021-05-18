/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, DoubleSide, LineBasicMaterial, Material, MeshBasicMaterial, MeshLambertMaterial } from "three"

import { IntervalRole } from "../fabric/eig-util"

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

export const LINE_VERTEX_COLORS = new LineBasicMaterial({
    vertexColors: true,
})

export const SELECTED_MATERIAL = new MeshBasicMaterial({
    color: new Color("#ffdf00"),
    side: DoubleSide,
    transparent: true,
    opacity: 0.25,
    depthTest: false,
})

const RAINBOW_LAMBERT = RAINBOW_COLORS.map(color => new MeshLambertMaterial({color}))

export function rainbowMaterial(nuance: number): Material {
    const index = Math.floor(nuance * RAINBOW_LAMBERT.length)
    return RAINBOW_LAMBERT[index >= RAINBOW_LAMBERT.length ? RAINBOW_LAMBERT.length - 1 : index]
}

export function roleColorString(intervalRole?: IntervalRole): string {
    switch (intervalRole) {
        case IntervalRole.PushA:
            return "#191f86"
        case IntervalRole.PushB:
            return "#5739a0"
        case IntervalRole.PullA:
            return "#ce1d1d"
        case IntervalRole.PullB:
            return "#d44e4e"
        case IntervalRole.PullAA:
            return "#13f3f3"
        case IntervalRole.PullBB:
            return "#59ee37"
        default:
            return "#FFFFFF"
    }
}

export function roleColor(intervalRole?: IntervalRole): Color {
    return new Color(roleColorString(intervalRole))
}

export function roleMaterial(intervalRole: IntervalRole): Material {
    const color = roleColor(intervalRole)
    return new MeshLambertMaterial({color})
}
