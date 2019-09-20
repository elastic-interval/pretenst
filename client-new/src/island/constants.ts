/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Color, Vector3 } from "three"

export const KINDA = 0.866
export const SURFACE_SCALE = 20
export const HEXALOT_OUTLINE_HEIGHT = 0.3
export const HEXAPOD_PROJECTION = 0.2
export const HEXAPOD_RADIUS = HEXAPOD_PROJECTION * SURFACE_SCALE
export const SCALE_X = SURFACE_SCALE * KINDA
export const SCALE_Y = SURFACE_SCALE * 1.5
export const INNER_HEXALOT_SPOTS = 91
export const OUTER_HEXALOT_SIDE = 6

export const HEXAGON_POINTS = [
    new Vector3(0, 0, -SURFACE_SCALE),
    new Vector3(-KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE/2),
    new Vector3(-KINDA * SURFACE_SCALE, 0, SURFACE_SCALE/2),
    new Vector3(0, 0, SURFACE_SCALE),
    new Vector3(KINDA * SURFACE_SCALE, 0, SURFACE_SCALE/2),
    new Vector3(KINDA * SURFACE_SCALE, 0, -SURFACE_SCALE/2),
]
export const SURFACE_UNKNOWN_COLOR = new Color("silver")
export const SURFACE_LAND_COLOR = new Color("tan")
export const SURFACE_WATER_COLOR = new Color("darkturquoise")
export const SIX = 6
export const UP = new Vector3(0, 1, 0)
export const LAND_NORMAL_SPREAD = 0.03
export const WATER_NORMAL_SPREAD = -0.02

