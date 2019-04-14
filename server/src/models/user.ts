import { BaseEntity, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"

import { Hexalot } from "./hexalot"

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    public id: number

    @OneToMany(type => Hexalot, lot => lot.owner)
    public ownedLots: Hexalot[]
}
