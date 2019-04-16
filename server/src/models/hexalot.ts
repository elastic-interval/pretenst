import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm"
import { HexalotID } from "../types"

import { Coords } from "./coords"
import { Island } from "./island"
import { Spot } from "./spot"
import { User } from "./user"

@Entity()
export class Hexalot {
    @PrimaryColumn({length: 32})
    public id: HexalotID

    @ManyToOne(type => Island, island => island.hexalots)
    public island: Island

    @OneToOne(type => Spot, spot => spot.centerOfHexalot)
    @JoinColumn()
    public centerSpot: Spot

    @ManyToOne(type => User, {nullable: true})
    public owner?: User

    @Column("int")
    public nonce: number

    @ManyToOne(type => Hexalot, parent => parent.childHexalots, {nullable: true})
    public parent?: Hexalot

    @OneToMany(type => Hexalot, child => child.parent)
    public childHexalots: Hexalot[]

    @Column("jsonb", {nullable: true})
    public genomeData?: object

    @Column("jsonb", {nullable: true})
    public journey?: object

    public get center(): Coords {
        return this.centerSpot.coords
    }
}
