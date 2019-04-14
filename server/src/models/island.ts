import { BaseEntity, OneToMany, PrimaryColumn } from "typeorm"
import { Column } from "typeorm/decorator/columns/Column"
import { Entity } from "typeorm/decorator/entity/Entity"

import { IGenomeData } from "../../../client/src/genetics/genome"
import {
    ADJACENT,
    equals,
    findParentHexalot,
    findSpot,
    HEXALOT_SHAPE,
    ICoords,
    IslandData,
    plus,
    spotsToHexalotId,
    Surface,
    ZERO,
} from "../island-logic"
import { HexalotID } from "../types"

import { Hexalot } from "./hexalot"
import { Spot } from "./spot"
import { User } from "./user"

@Entity()
export class Island extends BaseEntity {
    @PrimaryColumn()
    public name: string

    @Column("jsonb", {nullable: true})
    public compressedData: IslandData

    @OneToMany(type => Hexalot, lot => lot.island)
    public hexalots: Hexalot[]

    @OneToMany(type => Spot, spot => spot.hexalot.island)
    public spots: Spot[]

    public async claimHexalot(user: User, center: ICoords, lotID: HexalotID, genomeData: IGenomeData): Promise<void> {
        const existingLot = await Hexalot.findOne(lotID)
        if (existingLot !== undefined) {
            throw new Error("hexalot already claimed")
        }
        let hexalot: Hexalot
        if (this.hexalots.length === 0) {
            // GENESIS LOT
            if (!equals(center, ZERO)) {
                throw new Error("genesis lot must have coords 0,0")
            }
            hexalot = await this.getOrCreateHexalot(ZERO)
        } else {
            const centerSpot = findSpot(this, center)
            if (!centerSpot) {
                throw new Error("center spot doesn't exist")
            }
            hexalot = await this.hexalotAroundSpot(centerSpot)
        }
        hexalot.id = lotID
        hexalot.genomeData = genomeData
        const surfaces = hexalotIDToSurfaces(lotID)
        hexalot.spots.forEach((spot, i) => {
            spot.surface = surfaces[i]
        })
        await hexalot.save()

        user.ownedLots.push(hexalot)
        await user.save()

        await this.save()
    }

    public async getOrCreateHexalot(coords: ICoords, parent?: Hexalot): Promise<Hexalot> {
        const existing = this.hexalots.find(existingHexalot => equals(existingHexalot.center, coords))
        if (existing) {
            return existing
        }
        return this.createHexalot(coords, parent)
    }

    public async hexalotAroundSpot(spot: Spot): Promise<Hexalot> {
        return this.getOrCreateHexalot(spot.coords, findParentHexalot(spot))
    }

    // ================================================================================================

    private async createHexalot(coords: ICoords, parent?: Hexalot): Promise<Hexalot> {
        const spots = await Promise.all(
            HEXALOT_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords))),
        )
        const hexalot = Hexalot.create({
            id: spotsToHexalotId(spots),
            nonce: parent ? parent.nonce + 1 : 0,
            center: coords,
            childHexalots: [],
            visited: false,
            spots,
        })
        for (const adjacent of ADJACENT) {
            const adjacentSpot = await this.getOrCreateSpot(plus(coords, adjacent))
            adjacentSpot.adjacentHexalots.push(hexalot)
        }
        if (parent) {
            parent.childHexalots.push(hexalot)
        }
        this.hexalots.push(hexalot)
        await hexalot.save()
        return hexalot
    }

    private async getOrCreateSpot(coords: ICoords): Promise<Spot> {
        const existing = findSpot(this, coords)
        if (existing) {
            return existing
        }
        const newSpot = Spot.create({
            coords,
            surface: Surface.Unknown,
            adjacentSpots: [],
            adjacentHexalots: [],
            connected: false,
        })
        await newSpot.save()
        return newSpot
    }
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

export interface IJourneyData {
    hexalots: string[]
}
