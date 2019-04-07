/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Fabric } from "../body/fabric"
import { Direction } from "../body/fabric-exports"
import { Behavior } from "../genetics/behavior"
import { Genome, IGenomeData } from "../genetics/genome"
import { Growth } from "../genetics/growth"
import { Hexalot } from "../island/hexalot"

export interface IGotchiFactory {

    createGotchiSeed(home: Hexalot, rotation: number, genome: Genome): Gotchi | undefined

    copyLiveGotchi(gotchi: Gotchi, genome: Genome): Gotchi | undefined
}

export class Gotchi {
    private growth?: Growth

    constructor(
        readonly home: Hexalot,
        readonly fabric: Fabric,
        private genome: Genome,
        private gotchiFactory: IGotchiFactory,
    ) {
        if (fabric.isGestating) {
            this.growth = new Growth(fabric, genome.createReader(Direction.REST))
        } else {
            if (fabric.nextDirection !== Direction.REST) {
                throw new Error("Cannot create gotchi from fabric that is not at rest")
            }
            this.applyBehaviorGenes()
        }
    }

    public copyWithGenome(genome: Genome): Gotchi | undefined {
        return this.gotchiFactory.copyLiveGotchi(this, genome)
    }

    public get isResting(): boolean {
        return this.fabric.isResting
    }

    public recycle(): void {
        this.fabric.recycle()
    }

    public get index(): number {
        return this.fabric.index
    }

    public get midpoint(): Vector3 {
        return this.fabric.midpoint
    }

    public get age(): number {
        return this.fabric.age
    }

    public getDistanceFrom(location: Vector3): number {
        const xx = this.fabric.vectors[0] - location.x
        const zz = this.fabric.vectors[2] - location.z
        return Math.sqrt(xx * xx + zz * zz)
    }

    public get genomeData(): IGenomeData {
        return this.genome.genomeData
    }

    public get currentDirection(): Direction {
        return this.fabric.currentDirection
    }

    public set nextDirection(direction: Direction) {
        this.fabric.nextDirection = direction
    }

    public approach(location: Vector3, towards: boolean): void {
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
        this.nextDirection = towards ? distances[0].direction : distances[3].direction
    }

    public iterate(ticks: number): boolean {
        const timeSweepTick = this.fabric.iterate(ticks)
        if (!timeSweepTick) {
            return timeSweepTick
        }
        if (this.growth) {
            const growthStep = this.growth.step()
            if (!growthStep) {
                this.growth = undefined
                this.applyBehaviorGenes()
                this.fabric.endGestation()
            }
        }
        return timeSweepTick
    }

    private applyBehaviorGenes(): void {
        for (let direction = Direction.FORWARD; direction <= Direction.REVERSE; direction++) {
            new Behavior(this.fabric, direction, this.genome.createReader(direction)).apply()
        }
    }
}
