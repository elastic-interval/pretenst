import { Column } from "typeorm"

export class Coords {
    @Column("int")
    public x: number

    @Column("int")
    public y: number
}
