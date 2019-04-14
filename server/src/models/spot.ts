import { BaseEntity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { Column } from "typeorm/decorator/columns/Column"
import { Entity } from "typeorm/decorator/entity/Entity"

import { ISpot, Surface } from "../island-logic"

import { Coords } from "./coords"
import { Hexalot } from "./hexalot"

@Entity()
export class Spot extends BaseEntity implements ISpot {
    @PrimaryGeneratedColumn()
    public id: number

    @ManyToOne(type => Hexalot)
    public hexalot: Hexalot

    @Column()
    public connected: boolean

    @Column("enum", {nullable: false, enum: Surface})
    public surface: Surface

    @Column(type => Coords)
    public coords: Coords

    @ManyToMany(type => Hexalot)
    @JoinTable()
    public adjacentHexalots: Hexalot[]

    @ManyToMany(type => Spot)
    @JoinTable()
    public adjacentSpots: Spot[]
}
