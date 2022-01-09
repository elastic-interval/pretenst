/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, CylinderGeometry, LineBasicMaterial, Material, MeshLambertMaterial } from "three"

import { IInterval, IRole } from "../fabric/tensegrity-types"
import { ViewMode } from "../storage/recoil"

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

const RAINBOW_LAMBERT = RAINBOW_COLORS.map(color => new MeshLambertMaterial({color}))

export function rainbowMaterial(nuance: number): Material {
    const index = Math.floor(nuance * RAINBOW_LAMBERT.length)
    return RAINBOW_LAMBERT[index >= RAINBOW_LAMBERT.length ? RAINBOW_LAMBERT.length - 1 : index]
}

export function roleColorString(role?: IRole): string {
    if (!role) {
        return "#FFFFFF"
    }
    switch (role.tag) {
        case "[A]":
            return "#191f86"
        case "[B]":
            return "#5739a0"
        case "(a)":
            return "#a20d0d"
        case "(b)":
            return "#eeec05"
        case "(aa)":
            return "#da04b7"
        case "(bb)":
            return "#00ff06"
        default:
            return "#FFFFFF"
    }
}

export function roleColor(role?: IRole): Color {
    return new Color(roleColorString(role))
}

export function roleMaterial(role: IRole, ghost?: boolean): Material {
    const color = roleColor(role)
    const opacity = ghost ? 0.4 : 1
    const transparent = true
    return new MeshLambertMaterial({color, opacity, transparent})
}

export function cylinderRadius(interval: IInterval, viewMode: ViewMode): number {
    switch (viewMode) {
        case ViewMode.Select:
            return interval.role.push ? 0.05 : 0.02
        case ViewMode.Look:
            return interval.role.push ? 0.03 : 0.01
        default:
            throw new Error("Bad view mode")
    }
}

export const CYLINDER_GEOMETRY = new CylinderGeometry(1, 1, 1, 12, 1, false)
