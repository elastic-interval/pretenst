import { Profile as TwitterPassportProfile } from "passport-twitter"
import { Column, Entity, PrimaryColumn } from "typeorm"
import { OneToOne } from "typeorm/decorator/relations/OneToOne"

import { User } from "./user"

@Entity()
export class TwitterProfile implements TwitterPassportProfile {

    // --- TwitterPassportProfile fields ---

    @PrimaryColumn()
    public id: string

    @Column()
    public username: string

    @Column()
    public displayName: string

    @Column()
    public provider: string

    @Column("jsonb", {nullable: true})
    public photos: Array<{ value: string }>

    @Column("jsonb", {nullable: true})
    public emails: Array<{ value: string; type?: string }>

    @Column({nullable: true})
    public gender: string

    @Column("jsonb", {nullable: true})
    public name: {
        familyName: string;
        givenName: string;
        middleName?: string
    }

    @Column()
    public _accessLevel: string

    @Column("jsonb", {nullable: true})
    public _json: any

    @Column()
    public _raw: string

    // --- Custom fields ---

    @OneToOne(type => User, user => user.twitterProfile)
    public user?: User
}
