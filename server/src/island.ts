/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import {
    ADJACENT,
    calculateHexalotId,
    equals,
    extractIslandData,
    fillIsland,
    findParentHexalot,
    findSpot,
    HEXALOT_SHAPE,
    ICoords,
    IHexalot,
    IIsland,
    ISpot,
    plus,
    recalculateIsland,
    Surface,
    ZERO,
} from "./island-logic"
import { DataStore } from "./store"
import { HexalotID } from "./types"

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

export interface IJourneyData {
    hexalots: string[]
}

export class Island implements IIsland {

    public spots: ISpot[] = []
    public hexalots: IHexalot[] = []

    constructor(readonly name: string, readonly store: DataStore, readonly islandName: string) {
    }

    public async load(): Promise<void> {
        const data = await this.store.getIslandData(this.islandName)
        if (!data) {
            this.spots = []
            this.hexalots = []
            return
        }
        fillIsland(data, this)
    }

    public async save(): Promise<void> {
        recalculateIsland(this)
        return this.store.setIslandData(this.islandName, extractIslandData(this))
    }

    public async claimHexalot(userId: string, center: ICoords, lotID: HexalotID, genomeData: string): Promise<void> {
        if (await this.store.getGenomeData(lotID) !== undefined) {
            throw new Error("hexalot already claimed")
        }
        let lot: IHexalot
        if (this.hexalots.length === 0) {
            // GENESIS LOT
            if (!equals(center, ZERO)) {
                throw new Error("genesis lot must have coords 0,0")
            }
            lot = this.getOrCreateHexalot(undefined, ZERO)
        } else {
            const centerSpot = findSpot(this, center)
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
        await this.store.addOwnedLot(userId, userId)
        await this.store.setGenomeData(lotID, genomeData)
    }

    public getOrCreateHexalot(parent: IHexalot | undefined, coords: ICoords): IHexalot {
        const existing = this.hexalots.find(existingHexalot => equals(existingHexalot.coords, coords))
        if (existing) {
            return existing
        }
        return this.createHexalot(parent, coords)
    }

    public hexalotAroundSpot(spot: ISpot): IHexalot {
        return this.getOrCreateHexalot(findParentHexalot(spot), spot.coords)
    }

    // ================================================================================================

    private createHexalot(parent: IHexalot | undefined, coords: ICoords): IHexalot {
        const spots = HEXALOT_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)))
        const hexalot: IHexalot = {
            id: "?",
            nonce: parent ? parent.nonce + 1 : 0,
            coords,
            spots,
            childHexalots: [],
            visited: false,
        }
        calculateHexalotId(hexalot)
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
        const existing = findSpot(this, coords)
        if (existing) {
            return existing
        }
        const newSpot: ISpot = {
            coords,
            surface: Surface.Unknown,
            adjacentSpots: [],
            adjacentHexalots: [],
            connected: false,
        }
        this.spots.push(newSpot)
        return newSpot
    }

    // @ts-ignore
    private checkSurfaces(center: ICoords, surfaces: Surface[]): void {
        const illegalSpots = surfaces
            .map((surface, i) => {
                const coords = plus(center, HEXALOT_SHAPE[i])
                const spot = findSpot(this, coords)!
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
