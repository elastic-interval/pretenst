/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Spot } from "./models/spot"

export interface ICoords {
    x: number
    y: number
}

export interface IJourneyData {
    hexalots: string[]
}

export const ZERO: ICoords = {x: 0, y: 0}

export enum Surface {
    Unknown = "unknown",
    Land = "land",
    Water = "water",
}

export interface ISpot {
    readonly coords: ICoords
    connected: boolean
    surface: Surface

    getAdjacentSpots(): Promise<ISpot[]>

    getAdjacentHexalots(): Promise<IHexalot[]>
}

export interface IHexalot {
    readonly center: ICoords
    readonly spots: ISpot[]
    readonly childHexalots?: IHexalot[]
    readonly nonce: number
    id: string
}

export interface IIsland {
    readonly name: string
    readonly hexalots: IHexalot[]
    readonly spots: ISpot[]

    getOrCreateHexalot(coords: ICoords, parent?: IHexalot): Promise<IHexalot>

    hexalotAroundSpot(spot: ISpot): Promise<IHexalot>
}

export interface IslandData {
    name: string
    hexalots: string
    spots: string
}

export function equals(a: ICoords, b: ICoords): boolean {
    return a.x === b.x && a.y === b.y
}

export function plus(a: ICoords, b: ICoords): ICoords {
    return {x: a.x + b.x, y: a.y + b.y}
}

export async function findParentHexalot(spot: ISpot): Promise<IHexalot | undefined> {
    return (await spot.getAdjacentHexalots())
        .reduce(greatestNonce, undefined)
}

export async function isSpotLegal(spot: ISpot): Promise<boolean> {
    let landCount = 0
    let waterCount = 0
    const adjacentSpots = await spot.getAdjacentSpots()
    adjacentSpots.forEach(adjacent => {
            switch (adjacent.surface) {
                case Surface.Land:
                    landCount++
                    break
                case Surface.Water:
                    waterCount++
                    break
            }
        })
    switch (spot.surface) {
        case Surface.Land:
            // land must be connected and either on the edge or have adjacent at least 2 land and 1 water
            return spot.connected && adjacentSpots.length < 6 || (landCount >= 2 && waterCount >= 1)
        case Surface.Water:
            // water must have some land around
            return landCount > 0
        default:
            return false
    }
}

export async function isIslandLegal(island: IIsland): Promise<boolean> {
    for (const spot of island.spots) {
        if (!await isSpotLegal(spot)) {
            return false
        }
    }
    return true
}

export async function extractIslandData(island: IIsland): Promise<IslandData> {
    await recalculateIsland(island)
    if (!isIslandLegal(island)) {
        throw new Error("Saving illegal island")
    }
    island.spots.sort(sortSpotsOnCoord)
    return {
        name: island.name,
        hexalots: hexalotTreeString(island.hexalots),
        spots: spotsToString(island.spots),
    } as IslandData
}

export function findSpot(island: IIsland, coords: ICoords): Spot | undefined {
    return island.spots.find(p => equals(p.coords, coords)) as (Spot | undefined)
}

export async function recalculateIsland(island: IIsland): Promise<void> {
    const spots = island.spots
    for (const spot of spots) {
        spot.connected = (await spot.getAdjacentSpots()).length < 6
    }
    let flowChanged = true
    while (flowChanged) {
        flowChanged = false
        for (const spot of spots) {
            if (spot.connected) {
                continue
            }
            const byAdjacent = (await spot.getAdjacentSpots())
                .find(adj => (adj.surface === spot.surface) && adj.connected)
            if (byAdjacent) {
                spot.connected = true
                flowChanged = true
            }
        }
    }
}

// =====================================================================================================================

// const STOP_STEP = 0
// const BRANCH_STEP = 7
// const ERROR_STEP = 8

export function spotsToHexalotId(spots: ISpot[]): string {
    const lit = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = lit
        .map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join("") : undefined)
        .filter(chunk => chunk)
    const nybbleChars = nybbleStrings.map((s: string) => parseInt(padRightTo4(s), 2).toString(16))
    return nybbleChars.join("")
}

function greatestNonce(parent: IHexalot | undefined, candidate: IHexalot): IHexalot | undefined {
    if (parent && parent.nonce >= candidate.nonce) {
        return parent
    }
    return candidate
}

function coordSort(a: ICoords, b: ICoords): number {
    return a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0
}

function sortSpotsOnCoord(a: ISpot, b: ISpot): number {
    return coordSort(a.coords, b.coords)
}
//
// function ringIndex(coords: ICoords, origin: ICoords): number {
//     const ringCoords: ICoords = {x: coords.x - origin.x, y: coords.y - origin.y}
//     for (let index = 1; index <= 6; index++) {
//         if (ringCoords.x === HEXALOT_SHAPE[index].x && ringCoords.y === HEXALOT_SHAPE[index].y) {
//             return index
//         }
//     }
//     return 0
// }

// function generateOctalTreePattern(hexalot: IHexalot, steps: number[]): number[] {
//     const remainingChildren = hexalot.childHexalots.filter(child => {
//         return !child.visited
//     }).map(h => {
//         const index = ringIndex(h.center, hexalot.center)
//         return {index, hexalot: h}
//     }).sort((a, b) => {
//         return a.index < b.index ? 1 : a.index > b.index ? -1 : 0
//     })
//     if (remainingChildren.length > 0) {
//         for (let child = remainingChildren.pop(); child; child = remainingChildren.pop()) {
//             if (remainingChildren.length > 0) {
//                 steps.push(BRANCH_STEP)
//             }
//             steps.push(child.index > 0 ? child.index : ERROR_STEP)
//             generateOctalTreePattern(child.hexalot, steps)
//         }
//     } else {
//         steps.push(STOP_STEP)
//     }
//     hexalot.visited = true
//     return steps
// }

function padRightTo4(s: string): string {
    return s.length < 4 ? padRightTo4(s + "0") : s
}

function spotsToString(spots: ISpot[]): string {
    const land = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = land.map((l, index, array) =>
        (index % 4 === 0) ? array.slice(index, index + 4).join("") : undefined)
    const nybbleChars = nybbleStrings.map(chunk => {
        if (chunk) {
            return parseInt(padRightTo4(chunk), 2).toString(16)
        } else {
            return ""
        }
    })
    return nybbleChars.join("")
}

function hexalotTreeString(hexalots: IHexalot[]): string {
    const root = hexalots.find(hexalot => hexalot.nonce === 0)
    if (!root) {
        return ""
    }
    // hexalots.forEach(hexalot => hexalot.visited = false)
    return ""
    // return generateOctalTreePattern(root, []).join("")
}

export const HEXALOT_SHAPE = [
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
    // layer 4
    {x: 8, y: 0}, // 37
    {x: 7, y: -1},
    {x: 6, y: -2},
    {x: 5, y: -3},
    {x: 4, y: -4},
    {x: 2, y: -4},
    {x: 0, y: -4},
    {x: -2, y: -4},
    {x: -4, y: -4},
    {x: -5, y: -3},
    {x: -6, y: -2},
    {x: -7, y: -1},
    {x: -8, y: 0},
    {x: -7, y: 1},
    {x: -6, y: 2},
    {x: -5, y: 3},
    {x: -4, y: 4},
    {x: -2, y: 4},
    {x: -0, y: 4},
    {x: 2, y: 4},
    {x: 4, y: 4},
    {x: 5, y: 3},
    {x: 6, y: 2},
    {x: 7, y: 1}, // 60
    // layer 5
    {x: 10, y: 0}, // 61
    {x: 9, y: -1},
    {x: 8, y: -2},
    {x: 7, y: -3},
    {x: 6, y: -4},
    {x: 5, y: -5},
    {x: 3, y: -5},
    {x: 1, y: -5},
    {x: -1, y: -5},
    {x: -3, y: -5},
    {x: -5, y: -5},
    {x: -6, y: -4},
    {x: -7, y: -3},
    {x: -8, y: -2},
    {x: -9, y: -1},
    {x: -10, y: 0},
    {x: -9, y: 1},
    {x: -8, y: 2},
    {x: -7, y: 3},
    {x: -6, y: 4},
    {x: -5, y: 5},
    {x: -3, y: 5},
    {x: -1, y: 5},
    {x: 1, y: 5},
    {x: 3, y: 5},
    {x: 5, y: 5},
    {x: 6, y: 4},
    {x: 7, y: 3},
    {x: 8, y: 2},
    {x: 9, y: 1}, // 90
    // layer 6
    {x: 12, y: 0}, // 91
    {x: 11, y: -1},
    {x: 10, y: -2},
    {x: 9, y: -3},
    {x: 8, y: -4},
    {x: 7, y: -5},
    {x: 6, y: -6},
    {x: 4, y: -6},
    {x: 2, y: -6},
    {x: 0, y: -6},
    {x: -2, y: -6},
    {x: -4, y: -6},
    {x: -6, y: -6},
    {x: -7, y: -5},
    {x: -8, y: -4},
    {x: -9, y: -3},
    {x: -10, y: -2},
    {x: -11, y: -1},
    {x: -12, y: 0},
    {x: -11, y: 1},
    {x: -10, y: 2},
    {x: -9, y: 3},
    {x: -8, y: 4},
    {x: -7, y: 5},
    {x: -6, y: 6},
    {x: -4, y: 6},
    {x: -2, y: 6},
    {x: 0, y: 6},
    {x: 2, y: 6},
    {x: 4, y: 6},
    {x: 6, y: 6},
    {x: 7, y: 5},
    {x: 8, y: 4},
    {x: 9, y: 3},
    {x: 10, y: 2},
    {x: 11, y: 1}, // 126
]

export const ADJACENT = [
    {x: 2, y: 0}, // 1
    {x: 1, y: -1},
    {x: -1, y: -1},
    {x: -2, y: 0},
    {x: -1, y: 1},
    {x: 1, y: 1}, // 6
]
