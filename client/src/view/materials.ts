/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, DoubleSide, FaceColors, LineBasicMaterial, Material, MeshPhongMaterial, VertexColors } from "three"

import { IntervalRole } from "../fabric/fabric-engine"

export const SELECTION_COLOR = "#91934f"
export const SCALE_LINE_COLOR = "#cace02"

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

function generateRainbow(): Color[] {
    const steps = 50
    const rgbs: Color[] = []
    const max = 2 * Math.PI * (2 / 3)
    for (let step = 0; step < max; step += max / (steps - 10)) {
        const angle = step + Math.PI / 2
        const r = (Math.sin(angle + Math.PI * 2 / 3) + 1) / 2
        const g = (Math.sin(angle + 2 * Math.PI * 2 / 3) + 1) / 2.5
        const b = (Math.sin(angle) + 1) / 2
        rgbs.push(new Color(r, g, b))
    }
    // Generates code for a WASM constant:
    const roleColors = Object.keys(IntervalRole).filter(role => role.length > 1).map(roleKey => {
        const role: IntervalRole = IntervalRole[roleKey]
        const color = roleColor(role)
        const r = color.r
        const g = color.g
        const b = color.b
        const length = Math.sqrt(r*r + g*g + b*b)
        const rr = r/length
        const gg = g/length
        const bb = b/length
        return `[${rr.toFixed(3)}, ${gg.toFixed(3)}, ${bb.toFixed(3)}],`
    })
    console.log("ROLES\n", roleColors.join("\n"))
    return rgbs
}

const RAINBOW = generateRainbow().map(color => new MeshPhongMaterial({color, lights}))

export function rainbowMaterial(nuance: number): Material {
    const index = Math.floor(nuance * RAINBOW.length)
    return RAINBOW[index >= RAINBOW.length ? RAINBOW.length - 1 : index]
}

export function roleColorString(intervalRole?: IntervalRole): string | undefined {
    switch (intervalRole) {
        case IntervalRole.Push:
            return "#862d39"
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
    return new MeshPhongMaterial({color, lights})
}

// later...

export const GOTCHI = new MeshPhongMaterial({lights: true, color: new Color("silver")})

export const ISLAND = new MeshPhongMaterial({vertexColors: FaceColors, lights: true})

export const HANGER_OCCUPIED = new LineBasicMaterial({color: new Color("black")})

export const HANGER_FREE = new LineBasicMaterial({color: new Color("green")})

export const HOME_HEXALOT = new LineBasicMaterial({color: new Color("white")})

export const AVAILABLE_HEXALOT = new LineBasicMaterial({color: new Color("green")})

export const JOURNEY = new LineBasicMaterial({color: new Color("crimson")})

export const GOTCHI_ARROW = new LineBasicMaterial({color: new Color("magenta")})

export const SELECTED_POINTER = new LineBasicMaterial({color: new Color("yellow")})

export const GOTCHI_GHOST = new MeshPhongMaterial({
    lights: true,
    color: new Color("silver"),
    transparent: true,
    opacity: 0.6,
})
