import { Column } from "typeorm"

export class Coords {
    @Column("int")
    public x: number

    @Column("int")
    public y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }

    public equals(other: Coords): boolean {
        return this.x === other.x && this.y === other.y
    }

    public plus(delta: Coords): Coords {
        return new Coords(this.x + delta.x, this.y + delta.y)
    }

    public minus(delta: Coords): Coords {
        return new Coords(this.x - delta.x, this.y - delta.y)
    }

    public toString(): string {
        return `${this.x},${this.y}`
    }
}
