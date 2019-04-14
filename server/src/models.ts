import { BaseEntity, Entity, PrimaryGeneratedColumn } from "typeorm"
import { PrimaryColumn } from "typeorm/decorator/columns/PrimaryColumn"

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    public id: number
}

@Entity()
export class Hexalot extends BaseEntity {
    @PrimaryColumn({length: 32})
    public id: string
}
