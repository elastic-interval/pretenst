import { Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { OneToOne } from "typeorm/decorator/relations/OneToOne"

import { Hexalot } from "./hexalot"
import { TwitterProfile } from "./twitterProfile"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id: number

    @OneToMany(type => Hexalot, lot => lot.owner, {cascade: true})
    public ownedLots: Hexalot[]

    @OneToOne(type => TwitterProfile, profile => profile.user, {cascade: true})
    @JoinColumn()
    public twitterProfile: TwitterProfile
}
