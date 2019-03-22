/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { ADJACENT, BRANCH_STEP, ERROR_STEP, HEXALOT_SHAPE, STOP_STEP } from "./constants"
import { DataStore } from "./store"
import { HexalotID } from "./types"

enum Surface {
    Unknown = "unknown",
    Land = "land",
    Water = "water",
}

interface ISpot {
    // REQUIRED
    coords: ICoords
    surface: Surface
    adjacentHexalots: IHexalot[]

    // OPTIONAL
    adjacentSpots?: ISpot[]
    memberOfHexalot?: IHexalot[]
    centerOfHexalot?: IHexalot
    connected?: boolean
}

interface IHexalot {
    // REQUIRED
    spots: ISpot[]
    coords: ICoords
    nonce: number
    childHexalots: IHexalot[]

    // OPTIONAL
    id?: HexalotID
    genomeData?: string
}

interface IHexalotIndexed extends IHexalot {
    index: number
}

const ZERO: ICoords = {x: 0, y: 0}
const coordsEquals = (a: ICoords, b: ICoords): boolean => a.x === b.x && a.y === b.y
const coordSort = (a: ICoords, b: ICoords): number =>
    a.y < b.y ?
        -1 :
        a.y > b.y ?
            1 :
            a.x < b.x ?
                -1 :
                a.x > b.x ?
                    1 :
                    0

function coordsToString({x, y}: ICoords): string {
    return `${x},${y}`
}

const plus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x + b.x, y: a.y + b.y}
}

const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + "0") : s

function spotsToHex(spots: ISpot[]): HexalotID {
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

function hexalotIDToSurfaces(hexalotID: HexalotID): Surface[] {
    function* surfaceIterator(): Iterable<Surface> {
        for (const nybStr of hexalotID.split("")) {
            const nyb = parseInt(nybStr, 16)
            for (let bit = 0; bit < 4; bit++) {
                const surface: Surface = (nyb & (0x1 << (3 - bit))) !== 0 ?
                    Surface.Land :
                    Surface.Water
                yield surface
            }
        }
    }

    return [...surfaceIterator()].slice(0, 127)
}

const ringIndex = (coords: ICoords, origin: ICoords): number => {
    const ringCoords: ICoords = {x: coords.x - origin.x, y: coords.y - origin.y}
    for (let index = 1; index <= 6; index++) {
        if (coordsEquals(ringCoords, ADJACENT[index])) {
            return index
        }
    }
    return 0
}

function generateOctalTreePattern(
    root: IHexalot,
    steps: number[],
    visited: { [coords: string]: boolean },
): number[] {
    const remainingChildren = root.childHexalots!
        .filter(child => !visited[coordsToString(child.coords)])
        .map(child => {
            const index = ringIndex(child.coords, root.coords)
            return {index, ...child} as IHexalotIndexed
        })
        .sort((a, b) => a.index < b.index ? 1 : a.index > b.index ? -1 : 0)
    if (remainingChildren.length > 0) {
        for (let child = remainingChildren.pop(); child; child = remainingChildren.pop()) {
            if (remainingChildren.length > 0) {
                steps.push(BRANCH_STEP)
            }
            steps.push(child.index > 0 ? child.index : ERROR_STEP)
            generateOctalTreePattern(child, steps, visited)
        }
    } else {
        steps.push(STOP_STEP)
    }
    visited[coordsToString(root.coords)] = true
    return steps
}

function hexalotTreeString(hexalots: IHexalot[]): string {
    const root = hexalots.find(hexalot => hexalot.nonce === 0)
    if (!root) {
        console.error("No root hexalot found")
        return ""
    }
    return generateOctalTreePattern(root, [], {}).join("")
}

interface ICoords {
    x: number
    y: number
}

export interface IslandData {
    name: string
    hexalots: string
    spots: string
}

export interface IJourneyData {
    hexalots: string[]
}


const sortSpotsOnCoord = (a: ISpot, b: ISpot) => coordSort(a.coords, b.coords)

const hexalotWithMaxNonce = (hexalots: IHexalot[]): IHexalot | undefined =>
    hexalots.length === 0 ?
        undefined :
        hexalots.reduce((withMax, adjacent) => {
            if (withMax) {
                return adjacent.nonce > withMax.nonce ? adjacent : withMax
            } else {
                return adjacent
            }
        })


function refreshSpot(spot: ISpot): ISpot {
    return spot
}

export class Island {
    public get data(): IslandData {
        this.spots.sort(sortSpotsOnCoord)
        const spots = spotsToHex(this.spots)
        const hexalots = hexalotTreeString(this.hexalots)
        const data = {
            name: this.islandName,
            hexalots,
            spots,
        }
        console.log(`Saving data: ${JSON.stringify(data, null, 2)}`)
        return data
    }

    public spots: ISpot[] = []
    public hexalots: IHexalot[] = []

    constructor(
        readonly store: DataStore,
        readonly islandName: string,
    ) {
    }

    public async load(): Promise<void> {
        const data = await this.store.getIslandData(this.islandName)
        if (!data) {
            this.spots = []
            this.hexalots = []
            return
        }
        this.applyPattern(data)
    }

    public async save(): Promise<void> {
        return this.store.setIslandData(this.islandName, this.data)
    }

    public async claimHexalot(
        center: ICoords,
        lotID: HexalotID,
        genomeData: string,
    ): Promise<void> {
        if (await this.store.getGenomeData(lotID) !== undefined) {
            throw new Error("hexalot already claimed")
        }
        let lot: IHexalot
        if (this.hexalots.length === 0) {
            // GENESIS LOT
            if (!coordsEquals(center, ZERO)) {
                throw new Error("genesis lot must have coords 0,0")
            }
            lot = this.getOrCreateHexalot(undefined, ZERO)
        } else {
            const centerSpot = this.getSpot(center)
            if (!centerSpot) {
                throw new Error("center spot doesn't exist")
            }
            lot = this.hexalotAroundSpot(centerSpot)
        }
        lot.id = lotID
        const surfaces = hexalotIDToSurfaces(lotID)
        lot.spots.forEach((spot, i) => {
            spot.surface = surfaces[i]
        })
        await this.save()
        await this.store.setGenomeData(lotID, genomeData)
    }

    public findHexalot(id: HexalotID): IHexalot | undefined {
        return this.hexalots.find(hexalot => hexalot.id === id)
    }

    private refreshStructure(): void {
        this.spots.forEach(spot => {
            spot.adjacentSpots = this.getAdjacentSpots(spot)
            spot.connected = spot.adjacentSpots.length < 6
        })
        let flowChanged = true
        while (flowChanged) {
            flowChanged = false
            this.spots.forEach(spot => {
                if (!spot.connected) {
                    const connectedByAdjacent = spot.adjacentSpots!
                        .find(adj => (adj.surface === spot.surface) && !!adj.connected)
                    if (connectedByAdjacent) {
                        spot.connected = true
                        flowChanged = true
                    }
                }
            })
        }
        this.spots.forEach(refreshSpot)
    }

    // ================================================================================================

    private applyPattern(pattern: IslandData): void {
        let hexalot: IHexalot | undefined = this.getOrCreateHexalot(undefined, ZERO)
        const stepStack = pattern.hexalots.split("").reverse().map(Number)
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
                        hexalot = this.hexalotAroundSpot(hexalot.spots[step])
                    }
                    break
                default:
                    console.error("Error step")
            }
        }
        const hexChars = pattern.spots ? pattern.spots.split("") : []
        const numbers = hexChars.map(hexChar => parseInt(hexChar, 16))
        const booleanArrays = numbers.map(nyb => {
            const b0 = (nyb & 8) !== 0
            const b1 = (nyb & 4) !== 0
            const b2 = (nyb & 2) !== 0
            const b3 = (nyb & 1) !== 0
            return [b0, b1, b2, b3]
        })
        const landStack = [].concat.apply([], booleanArrays).reverse()
        this.spots.sort(sortSpotsOnCoord)
        if (landStack.length) {
            this.spots.forEach(spot => {
                const land = landStack.pop()
                spot.surface = land ? Surface.Land : Surface.Water
            })
        }
        this.refreshStructure()
    }

    private hexalotAroundSpot(spot: ISpot): IHexalot {
        const adjacentMaxNonce = hexalotWithMaxNonce(spot.adjacentHexalots)
        return this.getOrCreateHexalot(adjacentMaxNonce, spot.coords)
    }

    private getOrCreateHexalot(parent: IHexalot | undefined, coords: ICoords): IHexalot {
        const existing = this.hexalots.find(existingHexalot => coordsEquals(existingHexalot.coords, coords))
        if (existing) {
            return existing
        }
        return this.createHexalot(parent, coords)
    }

    private createHexalot(parent: IHexalot | undefined, coords: ICoords) {
        const spots = HEXALOT_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)))
        const hexalot: IHexalot = {
            nonce: parent ? parent.nonce + 1 : 0,
            coords,
            spots,
            childHexalots: [],
        }
        for (const adjacent of ADJACENT) {
            const adjacentSpot = this.getOrCreateSpot(plus(coords, adjacent))
            adjacentSpot.adjacentHexalots.push(hexalot)
        }
        if (parent) {
            parent.childHexalots.push(hexalot)
        }
        this.hexalots.push(hexalot)
        return hexalot
    }

    private getOrCreateSpot(coords: ICoords): ISpot {
        const existing = this.getSpot(coords)
        if (existing) {
            return existing
        }
        const spot: ISpot = {
            coords,
            surface: Surface.Unknown,
            adjacentHexalots: [],
        }
        this.spots.push(spot)
        return spot
    }

    private getAdjacentSpots(spot: ISpot): ISpot[] {
        const adjacentSpots: ISpot[] = []
        const coords = spot.coords
        ADJACENT.forEach(a => {
            const adjacentSpot = this.getSpot(plus(a, coords))
            if (adjacentSpot) {
                adjacentSpots.push(adjacentSpot)
            }
        })
        return adjacentSpots
    }

    private getSpot(coords: ICoords): ISpot | undefined {
        return this.spots.find(p => coordsEquals(p.coords, coords))
    }

    // @ts-ignore
    private checkSurfaces(center: ICoords, surfaces: Surface[]) {
        const illegalSpots = surfaces
            .map((surface, i) => {
                const coords = plus(center, HEXALOT_SHAPE[i])
                const spot = this.getSpot(coords)!
                if (spot.surface === surface) {
                    return undefined
                }
                return spot.coords
            })
            .filter(u => u !== undefined)
        if (illegalSpots.length > 0) {
            throw new Error(`illegal spots: ${JSON.stringify(illegalSpots)}`)
        }
    }
}
