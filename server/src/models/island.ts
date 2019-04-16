import { OneToMany, PrimaryColumn } from "typeorm"
import { Column } from "typeorm/decorator/columns/Column"
import { Entity } from "typeorm/decorator/entity/Entity"

import { IslandGeography } from "../types"

import { Hexalot } from "./hexalot"
import { Spot } from "./spot"

@Entity()
export class Island {
    @PrimaryColumn()
    public name: string

    @Column("jsonb", {default: {hexalots: "", spots: ""}})
    public geography: IslandGeography

    @OneToMany(type => Hexalot, lot => lot.island)
    public hexalots: Hexalot[]

    @OneToMany(type => Spot, spot => spot.island)
    public spots: Spot[]

    public get compressedJSON(): object {
        return {
            name: this.name,
            ...this.geography,
        }
    }
}
