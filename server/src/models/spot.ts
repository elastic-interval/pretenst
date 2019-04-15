import { BaseEntity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { Column } from "typeorm/decorator/columns/Column"
import { Entity } from "typeorm/decorator/entity/Entity"

import { ADJACENT, ISpot, plus, Surface } from "../island-logic"

import { Coords } from "./coords"
import { Hexalot } from "./hexalot"
import { Island } from "./island"

@Entity()
export class Spot extends BaseEntity implements ISpot {
    @PrimaryGeneratedColumn()
    public id: number

    @Column(type => Coords)
    public coords: Coords

    @ManyToOne(type => Island, island => island.spots)
    public island: Island

    @ManyToOne(type => Hexalot, lot => lot.spots, {nullable: true})
    public hexalot?: Hexalot

    @Column({default: false})
    public connected: boolean

    @Column("enum", {nullable: false, enum: Surface, default: Surface.Unknown})
    public surface: Surface

    public async getAdjacentSpots(): Promise<Spot[]> {
        const spots: Spot[] = []
        for (const adjacent of ADJACENT) {
            const coords = plus(this.coords, adjacent)
            const spot = await Spot.findOne({where: {coords, island: this.island}})
            if (spot) {
                spots.push(spot)
            }
        }
        return spots
    }

    public async getAdjacentHexalots(): Promise<Hexalot[]> {
        return (await this.getAdjacentSpots())
            .map(spot => spot.hexalot)
            .filter(lot => lot !== undefined) as Hexalot[]
    }
}
