import {Vector3} from "three"

import {Fabric} from "../body/fabric"
import {Direction} from "../body/fabric-exports"
import {Genome, IGenomeData} from "../genetics/genome"
import {Growth} from "../genetics/growth"
import {ITravel} from "../island/trip"

export interface IGotchiFactory {
    createGotchiAt(location: Vector3, genome: Genome): Gotchi
}

export class Gotchi {
    public travel?: ITravel
    private growth?: Growth

    constructor(public fabric: Fabric, private genome: Genome, private freeFabric: (index: number) => void) {
        this.growth = genome.growth(fabric)
    }

    public dispose() {
        this.fabric.disposeOfGeometry()
        this.freeFabric(this.fabric.index)
    }

    public get midpoint() {
        return this.fabric.midpoint
    }

    public get master() {
        return this.genome.master
    }

    public get age(): number {
        return this.fabric.age
    }

    public get isGestating(): boolean {
        return this.fabric.isGestating
    }

    public getDistanceFrom(location: Vector3) {
        const xx = this.fabric.vectors[0] - location.x
        const zz = this.fabric.vectors[2] - location.z
        return Math.sqrt(xx * xx + zz * zz)
    }

    // public withNewBody(fabric: Fabric): Gotchi {
    //     return new Gotchi(fabric, this.genome)
    // }

    public get genomeData(): IGenomeData {
        return this.genome.data
    }

    public get direction(): Direction {
        return this.fabric.direction
    }

    public set direction(direction: Direction) {
        this.fabric.direction = direction
    }

    public approach(location: Vector3, towards: boolean) {
        const distance = (direction: Vector3, factor: number) => new Vector3()
            .add(this.fabric.midpoint)
            .addScaledVector(direction, factor)
            .sub(location)
            .length()
        const distances = [
            {direction: Direction.FORWARD, distance: distance(this.fabric.forward, 1)},
            {direction: Direction.LEFT, distance: distance(this.fabric.right, -1)},
            {direction: Direction.RIGHT, distance: distance(this.fabric.right, 1)},
            {direction: Direction.REVERSE, distance: distance(this.fabric.forward, -1)},
        ].sort((a, b) => {
            return a.distance < b.distance ? -1 : b.distance > a.distance ? 1 : 0
        })
        this.direction = towards ? distances[0].direction : distances[3].direction
    }

    public iterate(ticks: number): void {
        const nextTimeSweep = this.fabric.iterate(ticks)
        if (nextTimeSweep && this.growth) {
            if (!this.growth.step()) {
                this.growth = undefined
                for (let direction = Direction.FORWARD; direction <= Direction.REVERSE; direction++) {
                    this.genome.behavior(this.fabric, direction).apply()
                }
                this.fabric.endGestation()
            }
        }
    }

}
