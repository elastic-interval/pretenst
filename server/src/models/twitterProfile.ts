import { Profile as TwitterPassportProfile } from "passport-twitter"
import { Column, Entity, PrimaryColumn } from "typeorm"
import { OneToOne } from "typeorm/decorator/relations/OneToOne"

import { User } from "./user"

@Entity()
export class TwitterProfile implements TwitterPassportProfile {
    @PrimaryColumn()
    public id: string

    @OneToOne(type => User, user => user.twitterProfile)
    public user: User

    @Column()
    public username: string

    @Column()
    public displayName: string

    @Column("jsonb")
    public photos: Array<{ value: string }>

    @Column("jsonb")
    public emails: Array<{ value: string; type?: string }>

    @Column()
    public provider: string

    @Column()
    public gender: string

    @Column("jsonb")
    public name: {
        familyName: string;
        givenName: string;
        middleName?: string
    }

    @Column()
    public _accessLevel: string

    @Column("jsonb")
    public _json: any

    @Column()
    public _raw: string
}
