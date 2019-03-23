/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BRANCH_STEP, ERROR_STEP, HEXALOT_SHAPE, STOP_STEP } from "./shapes"

export interface ICoords {
    x: number
    y: number
}

export enum Surface {
    Unknown = "unknown",
    Land = "land",
    Water = "water",
}

export interface ISpot {
    readonly coords: ICoords
    surface: Surface
}

export interface IHexalot {
    readonly coords: ICoords
    readonly spots: ISpot[]
    childHexalots: IHexalot[]
    visited: boolean
    nonce: number
    refreshId(): void
}

export function coordSort(a: ICoords, b: ICoords): number {
    return a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0
}

export function sortSpotsOnCoord(a: ISpot, b: ISpot): number {
    return coordSort(a.coords, b.coords)
}

export function equals(a: ICoords, b: ICoords): boolean {
    return a.x === b.x && a.y === b.y
}

export function minus(a: ICoords, b: ICoords): ICoords {
    return {x: a.x - b.x, y: a.y - b.y}
}

export function plus(a: ICoords, b: ICoords): ICoords {
    return {x: a.x + b.x, y: a.y + b.y}
}

export function padRightTo4(s: string): string {
    return s.length < 4 ? padRightTo4(s + "0") : s
}

export function spotsToString(spots: ISpot[]): string {
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

export function spotsToHexalotId(spots: ISpot[]): string {
    const lit = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = lit
        .map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join("") : undefined)
        .filter(chunk => chunk)
    const nybbleChars = nybbleStrings.map((s: string) => parseInt(padRightTo4(s), 2).toString(16))
    return nybbleChars.join("")
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

export function hexalotTreeString(hexalots: IHexalot[]): string {
    const root = hexalots.find(hexalot => hexalot.nonce === 0)
    if (!root) {
        console.error("No root hexalot found")
        return ""
    }
    hexalots.forEach(hexalot => hexalot.visited = false)
    return generateOctalTreePattern(root, []).join("")
}

export interface IIsland {
    readonly name: string
    readonly islandIsLegal: boolean
    readonly hexalots: IHexalot[]
    readonly spots: ISpot[]
    getOrCreateHexalot(parent: IHexalot | undefined, coords: ICoords): IHexalot
    hexalotAroundSpot(spot: ISpot): IHexalot
}

export interface IslandData {
    name: string
    hexalots: string
    spots: string
}

export function extractIslandData(island: IIsland): IslandData {
    if (!island.islandIsLegal) {
        throw new Error("Saving illegal island")
    }
    island.spots.sort(sortSpotsOnCoord)
    return {
        name: island.name,
        hexalots: hexalotTreeString(island.hexalots),
        spots: spotsToString(island.spots),
    } as IslandData
}

export function constructIsland(data: IslandData, island: IIsland): void {
    let hexalot: IHexalot | undefined = island.getOrCreateHexalot(undefined, {x: 0, y: 0})
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
            default:
                console.error("Error step")
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
    island.hexalots.forEach(h => h.refreshId())
}
