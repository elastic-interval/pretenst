import { OneToMany, PrimaryColumn } from "typeorm"
import { Column } from "typeorm/decorator/columns/Column"
import { Entity } from "typeorm/decorator/entity/Entity"

import { IslandGeography } from "../types"

import { Coords } from "./coords"
import { Hexalot } from "./hexalot"
import { Spot } from "./spot"

@Entity()
export class Island {
    @PrimaryColumn()
    public name: string

    @Column("jsonb", {default: {hexalots: "", spots: ""}})
    public geography: IslandGeography

    @OneToMany(type => Hexalot, lot => lot.island, {cascade: true})
    public hexalots: Hexalot[]

    @OneToMany(type => Spot, spot => spot.island, {cascade: true})
    public spots: Spot[]

    public getSpotAtCoords(coords: Coords): Spot | undefined {
        return this.spots.find(s => s.coords.equals(coords))
    }

    public get compressedJSON(): object {
        return {
            name: this.name,
            ...this.geography,
        }
    }
}
