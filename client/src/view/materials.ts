/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole } from "eig"
import { Color, FrontSide, LineBasicMaterial, Material, MeshLambertMaterial, MeshPhongMaterial } from "three"

export const SELECTION_COLOR = "#993431"
export const JOINT_COLOR = "#6c72e0"

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

export const SURFACE = new MeshPhongMaterial({
    color: new Color("#181818"),
    side: FrontSide,
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
            return "#8955fa"
        case IntervalRole.ColumnPush:
            return "#2b38ff"
        case IntervalRole.Triangle:
            return "#d0c61a"
        case IntervalRole.Ring:
            return "#ff5c2b"
        case IntervalRole.Cross:
            return "#28c245"
        case IntervalRole.BowMid:
            return "#4393b3"
        case IntervalRole.BowEnd:
            return "#4393b3"
        case IntervalRole.FaceConnector:
            return "#fe0105"
        case IntervalRole.FaceDistancer:
            return "#9e9b02"
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

export const SUBDUED_MATERIAL = new MeshLambertMaterial({color: "#1d1d1d"})
