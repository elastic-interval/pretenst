import { Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm"

import { Hexalot } from "./hexalot"
import { TwitterProfile } from "./twitterProfile"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id: number

    @OneToMany(type => Hexalot, lot => lot.owner, {cascade: true})
    public ownedLots: Hexalot[]

    @OneToOne(type => TwitterProfile, profile => profile.user, {cascade: true, eager: true})
    @JoinColumn()
    public twitterProfile: TwitterProfile

    public toJSON(): object {
        const {ownedLots, twitterProfile: profile} = this
        return {ownedLots, profile}
    }
}
