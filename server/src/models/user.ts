import { Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"

import { Hexalot } from "./hexalot"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id: number

    @OneToMany(type => Hexalot, lot => lot.owner, {cascade: true})
    public ownedLots: Hexalot[]
}
