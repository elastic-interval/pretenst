/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Hexalot } from "./hexalot"

export interface ICoords {
    x: number
    y: number
}

export function coordsToString(coords: ICoords): string {
    return `(${coords.x},${coords.y})`
}

export const ZERO: ICoords = {x: 0, y: 0}

export enum Surface {
    Unknown = "unknown",
    Land = "land",
    Water = "water",
}

export interface ISpot {
    readonly coords: ICoords
    adjacentHexalots: IHexalot[]
    adjacentSpots: ISpot[]
    connected: boolean
    surface: Surface

    isMemberOfOneHexalot(id: string): boolean
}

export interface IHexalot {
    readonly coords: ICoords
    readonly spots: ISpot[]
    readonly childHexalots: IHexalot[]
    readonly nonce: number
    id: string
    visited: boolean
}

export interface IIsland {
    readonly name: string
    readonly hexalots: IHexalot[]
    readonly spots: ISpot[]
    readonly vacantHexalot?: Hexalot

    getOrCreateHexalot(parent: IHexalot | undefined, coords: ICoords): IHexalot

    hexalotAroundSpot(spot: ISpot): IHexalot
}

export interface IIslandData {
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

export function findParentHexalot(spot: ISpot): IHexalot | undefined {
    return spot.adjacentHexalots.reduce(greatestNonce, undefined)
}

export function isSpotLegal(spot: ISpot): boolean {
    let landCount = 0
    let waterCount = 0
    spot.adjacentSpots.forEach(adjacent => {
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
            return spot.connected && spot.adjacentSpots.length < 6 || (landCount >= 2 && waterCount >= 1)
        case Surface.Water:
            // water must have some land around
            return landCount > 0
        default:
            return false
    }
}

export function isIslandLegal(island: IIsland): boolean {
    return island.spots.every(isSpotLegal)
}

export function extractIslandData(island: IIsland): IIslandData {
    const vacant = island.vacantHexalot
    if (vacant) {
        const parent = vacant.parentHexalot
        if (!parent) {
            throw new Error("No parent")
        }
        parent.childHexalots = parent.childHexalots.filter(child => child.id !== vacant.id)
        const hexalots = island.hexalots.filter(h => h.id !== vacant.id)
        const spotsToRemove = island.spots.filter(p => p.isMemberOfOneHexalot(vacant.id))
        const spots = spotsToRemove.reduce(removeSpot, island.spots).sort(sortSpotsOnCoord)
        return {
            name: island.name,
            hexalots: hexalotTreeString(hexalots),
            spots: spotsToString(spots),
        } as IIslandData
    }
    if (!isIslandLegal(island)) {
        throw new Error("Saving illegal island")
    }
    island.spots.sort(sortSpotsOnCoord)
    return {
        name: island.name,
        hexalots: hexalotTreeString(island.hexalots),
        spots: spotsToString(island.spots),
    } as IIslandData
}

export function fillIsland(data: IIslandData, island: IIsland): void {
    let hexalot: IHexalot | undefined = island.getOrCreateHexalot(undefined, ZERO)
    const stepStack = data.hexalots.split("").reverse().map(stepChar => Number(stepChar))
    const hexalotStack: IHexalot[] = []
    while (stepStack.length > 0) {
        const step = stepStack.pop()
        switch (step) {
            case STOP_STEP:
                hexalot = hexalotStack.pop()
                break
            case BRANCH_STEP:
                if (hexalot) {
                    hexalotStack.push(hexalot)
                }
                break
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
                if (hexalot) {
                    hexalot = island.hexalotAroundSpot(hexalot.spots[step])
                }
                break
        }
    }
    const hexChars = data.spots ? data.spots.split("") : []
    const numbers = hexChars.map(hexChar => parseInt(hexChar, 16))
    const booleanArrays = numbers.map(nyb => {
        const b0 = (nyb & 8) !== 0
        const b1 = (nyb & 4) !== 0
        const b2 = (nyb & 2) !== 0
        const b3 = (nyb & 1) !== 0
        return [b0, b1, b2, b3]
    })
    const landStack = [].concat.apply([], booleanArrays).reverse()
    island.spots.sort(sortSpotsOnCoord)
    if (landStack.length) {
        island.spots.forEach(spot => {
            const land = landStack.pop()
            spot.surface = land ? Surface.Land : Surface.Water
        })
    } else if (island.hexalots.length === 1) {
        const singleHexalot = island.hexalots[0]
        singleHexalot.spots.map(spot => spot.surface = Math.random() > 0.5 ? Surface.Land : Surface.Water)
        singleHexalot.spots[0].surface = Surface.Land
    }
    island.hexalots.forEach(calculateHexalotId)
}

export function calculateHexalotId(hexalot: IHexalot): void {
    hexalot.id = spotsToHexalotId(hexalot.spots)
}

export function findSpot(island: IIsland, coords: ICoords): ISpot | undefined {
    return island.spots.find(p => equals(p.coords, coords))
}

export function recalculateIsland(island: IIsland): void {
    const spots = island.spots
    spots.forEach(spot => {
        spot.adjacentSpots = getAdjacentSpots(island, spot)
        spot.connected = spot.adjacentSpots.length < 6
    })
    let flowChanged = true
    while (flowChanged) {
        flowChanged = false
        spots.forEach(spot => {
            if (spot.connected) {
                return
            }
            const byAdjacent = spot.adjacentSpots.find(adj => (adj.surface === spot.surface) && adj.connected)
            if (byAdjacent) {
                spot.connected = true
                flowChanged = true
            }
        })
    }
}

// =====================================================================================================================

const STOP_STEP = 0
const BRANCH_STEP = 7
const ERROR_STEP = 8

function removeSpot(spots: ISpot[], spotToRemove: ISpot): ISpot[] {
    return spots.filter(s => !equals(s.coords, spotToRemove.coords))
}

function spotsToHexalotId(spots: ISpot[]): string {
    const lit = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = lit
        .map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join("") : undefined)
        .filter(chunk => chunk)
    const nybbleChars = nybbleStrings.map((s: string) => parseInt(padRightTo4(s), 2).toString(16))
    return nybbleChars.join("")
}

function greatestNonce(parent: IHexalot | undefined, candiate: IHexalot): IHexalot | undefined {
    if (parent && parent.nonce >= candiate.nonce) {
        return parent
    }
    return candiate
}

function coordSort(a: ICoords, b: ICoords): number {
    return a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0
}

function sortSpotsOnCoord(a: ISpot, b: ISpot): number {
    return coordSort(a.coords, b.coords)
}

function ringIndex(coords: ICoords, origin: ICoords): number {
    const ringCoords: ICoords = {x: coords.x - origin.x, y: coords.y - origin.y}
    for (let index = 1; index <= 6; index++) {
        if (ringCoords.x === HEXALOT_SHAPE[index].x && ringCoords.y === HEXALOT_SHAPE[index].y) {
            return index
        }
    }
    return 0
}

function generateOctalTreePattern(hexalot: IHexalot, steps: number[]): number[] {
    const remainingChildren = hexalot.childHexalots.filter(child => {
        return !child.visited
    }).map(h => {
        const index = ringIndex(h.coords, hexalot.coords)
        return {index, hexalot: h}
    }).sort((a, b) => {
        return a.index < b.index ? 1 : a.index > b.index ? -1 : 0
    })
    if (remainingChildren.length > 0) {
        for (let child = remainingChildren.pop(); child; child = remainingChildren.pop()) {
            if (remainingChildren.length > 0) {
                steps.push(BRANCH_STEP)
            }
            steps.push(child.index > 0 ? child.index : ERROR_STEP)
            generateOctalTreePattern(child.hexalot, steps)
        }
    } else {
        steps.push(STOP_STEP)
    }
    hexalot.visited = true
    return steps
}

function getAdjacentSpots(island: IIsland, spot: ISpot): ISpot[] {
    const adjacentSpots: ISpot[] = []
    const coords = spot.coords
    ADJACENT.forEach(a => {
        const adjacentSpot = findSpot(island, plus(a, coords))
        if (adjacentSpot) {
            adjacentSpots.push(adjacentSpot)
        }
    })
    return adjacentSpots
}

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
    hexalots.forEach(hexalot => hexalot.visited = false)
    return generateOctalTreePattern(root, []).join("")
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
