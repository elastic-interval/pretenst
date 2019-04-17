/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Coords } from "./models/coords"

export const HEXALOT_PURCHASE_PRICE_SATOSHIS = "100"

export const ZERO: Coords = new Coords(0, 0)

export const STOP_STEP = 0

export const BRANCH_STEP = 7
export const ERROR_STEP = 8

export const HEXALOT_SHAPE = [
    // center
    new Coords(0, 0),
    // layer 1
    new Coords(2, 0), // 1
    new Coords(1, -1),
    new Coords(-1, -1),
    new Coords(-2, 0),
    new Coords(-1, 1),
    new Coords(1, 1), // 6
    // layer 2
    new Coords(4, 0), // 7
    new Coords(3, -1),
    new Coords(2, -2),
    new Coords(0, -2),
    new Coords(-2, -2),
    new Coords(-3, -1),
    new Coords(-4, 0),
    new Coords(-3, 1),
    new Coords(-2, 2),
    new Coords(0, 2),
    new Coords(2, 2),
    new Coords(3, 1), // 18
    // layer 3
    new Coords(6, 0), // 19
    new Coords(5, -1),
    new Coords(4, -2),
    new Coords(3, -3),
    new Coords(1, -3),
    new Coords(-1, -3),
    new Coords(-3, -3),
    new Coords(-4, -2),
    new Coords(-5, -1),
    new Coords(-6, 0),
    new Coords(-5, 1),
    new Coords(-4, 2),
    new Coords(-3, 3),
    new Coords(-1, 3),
    new Coords(1, 3),
    new Coords(3, 3),
    new Coords(4, 2),
    new Coords(5, 1), // 36
    // layer 4
    new Coords(8, 0), // 37
    new Coords(7, -1),
    new Coords(6, -2),
    new Coords(5, -3),
    new Coords(4, -4),
    new Coords(2, -4),
    new Coords(0, -4),
    new Coords(-2, -4),
    new Coords(-4, -4),
    new Coords(-5, -3),
    new Coords(-6, -2),
    new Coords(-7, -1),
    new Coords(-8, 0),
    new Coords(-7, 1),
    new Coords(-6, 2),
    new Coords(-5, 3),
    new Coords(-4, 4),
    new Coords(-2, 4),
    new Coords(-0, 4),
    new Coords(2, 4),
    new Coords(4, 4),
    new Coords(5, 3),
    new Coords(6, 2),
    new Coords(7, 1), // 60
    // layer 5
    new Coords(10, 0), // 61
    new Coords(9, -1),
    new Coords(8, -2),
    new Coords(7, -3),
    new Coords(6, -4),
    new Coords(5, -5),
    new Coords(3, -5),
    new Coords(1, -5),
    new Coords(-1, -5),
    new Coords(-3, -5),
    new Coords(-5, -5),
    new Coords(-6, -4),
    new Coords(-7, -3),
    new Coords(-8, -2),
    new Coords(-9, -1),
    new Coords(-10, 0),
    new Coords(-9, 1),
    new Coords(-8, 2),
    new Coords(-7, 3),
    new Coords(-6, 4),
    new Coords(-5, 5),
    new Coords(-3, 5),
    new Coords(-1, 5),
    new Coords(1, 5),
    new Coords(3, 5),
    new Coords(5, 5),
    new Coords(6, 4),
    new Coords(7, 3),
    new Coords(8, 2),
    new Coords(9, 1), // 90
    // layer 6
    new Coords(12, 0), // 91
    new Coords(11, -1),
    new Coords(10, -2),
    new Coords(9, -3),
    new Coords(8, -4),
    new Coords(7, -5),
    new Coords(6, -6),
    new Coords(4, -6),
    new Coords(2, -6),
    new Coords(0, -6),
    new Coords(-2, -6),
    new Coords(-4, -6),
    new Coords(-6, -6),
    new Coords(-7, -5),
    new Coords(-8, -4),
    new Coords(-9, -3),
    new Coords(-10, -2),
    new Coords(-11, -1),
    new Coords(-12, 0),
    new Coords(-11, 1),
    new Coords(-10, 2),
    new Coords(-9, 3),
    new Coords(-8, 4),
    new Coords(-7, 5),
    new Coords(-6, 6),
    new Coords(-4, 6),
    new Coords(-2, 6),
    new Coords(0, 6),
    new Coords(2, 6),
    new Coords(4, 6),
    new Coords(6, 6),
    new Coords(7, 5),
    new Coords(8, 4),
    new Coords(9, 3),
    new Coords(10, 2),
    new Coords(11, 1), // 126
]

export const ADJACENT = [
    new Coords(2, 0), // 1
    new Coords(1, -1),
    new Coords(-1, -1),
    new Coords(-2, 0),
    new Coords(-1, 1),
    new Coords(1, 1), // 6
]

export const CLIENT_ORIGIN = (process.env.NODE_ENV === "production") ?
    "https://galapagotchi.run" :
    "http://127.0.0.1:3000"

export const API_ORIGIN = (process.env.NODE_ENV === "production") ?
    "https://galapagotchi.run" :
    "http://127.0.0.1:8000"
