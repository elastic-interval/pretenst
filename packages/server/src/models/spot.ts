import { ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { Column } from "typeorm/decorator/columns/Column"
import { Entity } from "typeorm/decorator/entity/Entity"

import { Surface } from "../types"

import { Coords } from "./coords"
import { Hexalot } from "./hexalot"
import { Island } from "./island"

@Entity()
export class Spot {
    @PrimaryGeneratedColumn()
    public id: number

    @Column(type => Coords)
    public coords: Coords

    @ManyToOne(type => Island, island => island.spots)
    public island: Island

    @OneToOne(type => Hexalot, lot => lot.centerSpot, {nullable: true})
    public centerOfHexalot?: Hexalot

    @Column("enum", {nullable: false, enum: Surface, default: Surface.Unknown})
    public surface: Surface
}
