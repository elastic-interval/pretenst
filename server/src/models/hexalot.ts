import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm"

import { IGenomeData } from "../../../client/src/genetics/genome"
import { IHexalot } from "../island-logic"

import { Coords } from "./coords"
import { IJourneyData, Island } from "./island"
import { Spot } from "./spot"
import { User } from "./user"

@Entity()
export class Hexalot extends BaseEntity implements IHexalot {
    @PrimaryColumn({length: 32})
    public id: string

    @ManyToOne(type => Hexalot)
    public parent: Hexalot

    @ManyToOne(type => User)
    public owner: User

    @Column(type => Coords)
    public center: Coords

    @Column("int")
    public nonce: number

    @Column("jsonb")
    public genomeData: IGenomeData

    @Column("jsonb")
    public journey: IJourneyData

    @OneToMany(type => Spot, spot => spot.hexalot)
    public spots: Spot[]

    @ManyToOne(type => Island)
    public island: Island

    @ManyToMany(type => Hexalot, lot => lot.parent)
    @JoinColumn()
    public childHexalots: Hexalot[]

    public visited: boolean
}
