/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, Vector3 } from "three"

export const PATCH_SURROUNDING_SHAPE = [
    // center
    {x: 0, y: 0},
    // layer 1
    {x: 2, y: 0}, // 1
    {x: 1, y: -1},
    {x: -1, y: -1},
    {x: -2, y: 0},
    {x: -1, y: 1},
    {x: 1, y: 1}, // 6
    // layer 2
    {x: 4, y: 0}, // 7
    {x: 3, y: -1},
    {x: 2, y: -2},
    {x: 0, y: -2},
    {x: -2, y: -2},
    {x: -3, y: -1},
    {x: -4, y: 0},
    {x: -3, y: 1},
    {x: -2, y: 2},
    {x: 0, y: 2},
    {x: 2, y: 2},
    {x: 3, y: 1}, // 18
    // layer 3
    {x: 6, y: 0}, // 19
    {x: 5, y: -1},
    {x: 4, y: -2},
    {x: 3, y: -3},
    {x: 1, y: -3},
    {x: -1, y: -3},
    {x: -3, y: -3},
    {x: -4, y: -2},
    {x: -5, y: -1},
    {x: -6, y: 0},
    {x: -5, y: 1},
    {x: -4, y: 2},
    {x: -3, y: 3},
    {x: -1, y: 3},
    {x: 1, y: 3},
    {x: 3, y: 3},
    {x: 4, y: 2},
    {x: 5, y: 1}, // 36
]

export const ADJACENT = [
    {x: 2, y: 0}, // 1
    {x: 1, y: -1},
    {x: -1, y: -1},
    {x: -2, y: 0},
    {x: -1, y: 1},
    {x: 1, y: 1}, // 6
]

const PATCH_DISTANCE = 35

export const SIN_60 = Math.sin(60 * Math.PI / 180)
export const SURFACE_SCALE = PATCH_DISTANCE / 2 / SIN_60
export const SCALE_X = SURFACE_SCALE * SIN_60
export const SCALE_Y = SURFACE_SCALE * 1.5

export const HEXAGON_POINTS = [
    new Vector3(0, 0, -SURFACE_SCALE),
    new Vector3(-SIN_60 * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
    new Vector3(-SIN_60 * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(0, 0, SURFACE_SCALE),
    new Vector3(SIN_60 * SURFACE_SCALE, 0, SURFACE_SCALE / 2),
    new Vector3(SIN_60 * SURFACE_SCALE, 0, -SURFACE_SCALE / 2),
]
export const FAUNA_PATCH_COLOR = new Color("#091009")
export const FLORA_PATCH_COLOR = new Color("#100902")
export const SIX = 6
export const UP = new Vector3(0, 1, 0)
export const NORMAL_SPREAD = 0.9 / PATCH_DISTANCE
export const SUN_POSITION = new Vector3(0, 500, 0)
