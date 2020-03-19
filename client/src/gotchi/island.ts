/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { GotchiFactory } from "./gotchi"
import { Hexalot } from "./hexalot"
import {
    calculateHexalotId,
    equals,
    fillIsland,
    findParentHexalot,
    findSpot,
    HEXALOT_SHAPE,
    ICoords,
    IIsland,
    IIslandData,
    plus,
} from "./island-logic"
import { Spot } from "./spot"

export class Island implements IIsland {
    public readonly name: string
    public spots: Spot[] = []
    public hexalots: Hexalot[] = []
    public vacantHexalot?: Hexalot

    constructor(islandData: IIslandData, public readonly gotchiFactory: GotchiFactory) {
        fillIsland(islandData, this)
        this.name = islandData.name
    }

    public get singleHexalot(): Hexalot | undefined {
        return this.hexalots.length !== 1 ? undefined : this.hexalots[0]
    }

    public findHexalot(id: string): Hexalot | undefined {
        return this.hexalots.find(hexalot => hexalot.id === id)
    }

    public createHexalot(spot: Spot): Hexalot {
        return this.hexalotAroundSpot(spot)
    }

    public get midpoint(): Vector3 {
        return this.spots
            .reduce((sum: Vector3, spot: Spot) => sum.add(spot.center), new Vector3())
            .multiplyScalar(1 / this.spots.length)
    }

    public hexalotAroundSpot(spot: Spot): Hexalot {
        return this.getOrCreateHexalot(findParentHexalot(spot) as Hexalot, spot.coords)
    }

    public getOrCreateHexalot(parent: Hexalot | undefined, coords: ICoords): Hexalot {
        const existing = this.hexalots.find(existingHexalot => equals(existingHexalot.coords, coords))
        if (existing) {
            return existing
        }
        const spots = HEXALOT_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)))
        const hexalot = new Hexalot(parent, coords, spots, this.gotchiFactory)
        calculateHexalotId(hexalot)
        this.hexalots.push(hexalot)
        return hexalot
    }

    // ================================================================================================

    private getOrCreateSpot(coords: ICoords): Spot {
        const existing = findSpot(this, coords)
        if (existing) {
            return existing as Spot
        }
        const spot = new Spot(coords)
        this.spots.push(spot)
        return spot
    }
}
