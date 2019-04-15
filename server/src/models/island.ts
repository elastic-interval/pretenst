import { BaseEntity, EntityManager, getManager, OneToMany, PrimaryColumn } from "typeorm"
import { Column } from "typeorm/decorator/columns/Column"
import { Entity } from "typeorm/decorator/entity/Entity"

import { IGenomeData } from "../../../client/src/genetics/genome"
import {
    equals,
    extractIslandData,
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

    @Column("jsonb", {default: {hexalots: "", spots: ""}})
    public compressedData: IslandData

    @OneToMany(type => Hexalot, lot => lot.island, {cascade: true})
    public hexalots: Hexalot[]

    @OneToMany(type => Spot, spot => spot.island, {cascade: true})
    public spots: Spot[]


    private db?: EntityManager

    public async claimHexalot(user: User, center: ICoords, lotID: HexalotID, genomeData: IGenomeData): Promise<void> {
        await getManager().transaction(async db => {
            this.db = db
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
                hexalot = await this.createHexalot(ZERO)
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
            user.ownedLots.push(hexalot)
            this.compressedData = await extractIslandData(this)
            await db.save([this, user])
            this.db = undefined
        })
    }

    public async getOrCreateHexalot(coords: ICoords, parent?: Hexalot): Promise<Hexalot> {
        const existing = await this.db!.findOne(Hexalot, {where: {center: coords, island: this}})
        if (existing) {
            return existing
        }
        return this.createHexalot(coords, parent)
    }

    public async hexalotAroundSpot(spot: Spot): Promise<Hexalot> {
        const parent = await findParentHexalot(spot) as (Hexalot | undefined)
        return this.getOrCreateHexalot(spot.coords, parent)
    }

    // ================================================================================================

    private async createHexalot(center: ICoords, parent?: Hexalot): Promise<Hexalot> {
        const spots = await Promise.all(
            HEXALOT_SHAPE.map(c => this.getOrCreateSpot(plus(c, center))),
        )
        const id = spotsToHexalotId(spots)
        const nonce = parent ? parent.nonce + 1 : 0
        const hexalot = Hexalot.create({
            island: this,
            nonce,
            id,
            center,
            parent,
            spots,
        })
        await this.db!.save(hexalot)
        return hexalot
    }

    private async getOrCreateSpot(coords: ICoords): Promise<Spot> {
        const existing = await Spot.findOne({where: {coords, island: this}})
        if (existing) {
            return existing
        }
        const spot = Spot.create({
            island: this,
            coords,
        })
        await this.db!.save(spot)
        return spot
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
