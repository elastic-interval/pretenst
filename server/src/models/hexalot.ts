import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm"
import { HexalotID } from "../types"

import { Coords } from "./coords"
import { Island } from "./island"
import { Spot } from "./spot"
import { User } from "./user"

@Entity()
export class Hexalot {
    @PrimaryColumn({length: 32})
    public id: HexalotID

    @ManyToOne(type => Island)
    public island: Island

    @OneToMany(type => Spot, spot => spot.hexalot, {cascade: true})
    public spots: Spot[]

    @ManyToOne(type => User, {nullable: true})
    public owner?: User

    @Column(type => Coords)
    public center: Coords

    @Column("int")
    public nonce: number

    @ManyToOne(type => Hexalot, child => child.childHexalots, {nullable: true})
    public parent?: Hexalot

    @OneToMany(type => Hexalot, lot => lot.parent)
    public childHexalots?: Hexalot[]

    @Column("jsonb", {nullable: true})
    public genomeData?: object

    @Column("jsonb", {nullable: true})
    public journey?: object
}
