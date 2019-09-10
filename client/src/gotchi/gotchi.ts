/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { AppEvent } from "../app-event"
import { Direction } from "../fabric/fabric-exports"
import { GotchiBody } from "../fabric/gotchi-body"
import { Behavior } from "../genetics/behavior"
import { Genome, IGenomeData } from "../genetics/genome"
import { Growth } from "../genetics/growth"
import { Hexalot } from "../island/hexalot"

export interface IGotchiFactory {

    createGotchiSeed(home: Hexalot, rotation: number, genome: Genome): Gotchi | undefined

    copyLiveGotchi(gotchi: Gotchi, genome: Genome): Gotchi | undefined
}

export class Gotchi {
    private growthStarted = false
    private growth?: Growth

    constructor(
        readonly home: Hexalot,
        readonly body: GotchiBody,
        private genome: Genome,
        private gotchiFactory: IGotchiFactory,
    ) {
        if (body.isGestating) {
            this.growth = new Growth(body, genome.createReader(Direction.Rest))
        } else {
            if (body.nextDirection !== Direction.Rest) {
                throw new Error("Cannot create gotchi from fabric that is not at rest")
            }
            this.applyBehaviorGenes()
        }
    }

    public copyWithGenome(genome: Genome): Gotchi | undefined {
        return this.gotchiFactory.copyLiveGotchi(this, genome)
    }

    public get isResting(): boolean {
        return this.body.isResting
    }

    public recycle(): void {
        this.body.recycle()
    }

    public get index(): number {
        return this.body.index
    }

    public get midpoint(): Vector3 {
        return this.body.midpoint
    }

    public get age(): number {
        return this.body.age
    }

    public getDistanceFrom(location: Vector3): number {
        const xx = this.body.vectors[0] - location.x
        const zz = this.body.vectors[2] - location.z
        return Math.sqrt(xx * xx + zz * zz)
    }

    public get genomeData(): IGenomeData {
        return this.genome.genomeData
    }

    public get currentDirection(): Direction {
        return this.body.currentDirection
    }

    public set nextDirection(direction: Direction) {
        this.body.nextDirection = direction
    }

    public approach(location: Vector3, towards: boolean): void {
        const distance = (direction: Vector3, factor: number) => new Vector3()
            .add(this.body.midpoint)
            .addScaledVector(direction, factor)
            .sub(location)
            .length()
        const distances = [
            {direction: Direction.Forward, distance: distance(this.body.forward, 1)},
            {direction: Direction.TurnLeft, distance: distance(this.body.right, -1)},
            {direction: Direction.TurnRight, distance: distance(this.body.right, 1)},
            {direction: Direction.Reverse, distance: distance(this.body.forward, -1)},
        ].sort((a, b) => {
            return a.distance < b.distance ? -1 : b.distance > a.distance ? 1 : 0
        })
        this.nextDirection = towards ? distances[0].direction : distances[3].direction
    }

    public iterate(ticks: number): AppEvent | undefined {
        if (this.growth && !this.growthStarted) {
            this.growthStarted = true
            return AppEvent.StartGrowth
        }
        const wrapAround = this.body.iterate(ticks)
        if (!wrapAround) {
            return undefined
        }
        if (this.growth) {
            const growthStep = this.growth.step()
            if (!growthStep) {
                this.growth = undefined
                this.applyBehaviorGenes()
                // TODO: this.body.endGestation()
                return AppEvent.GrowthComplete
            }
            return AppEvent.GrowthStep
        } else {
            if (this.currentDirection === Direction.Rest) {
                return undefined
            }
            return AppEvent.Cycle
        }
    }

    private applyBehaviorGenes(): void {
        for (let direction = Direction.Forward; direction <= Direction.Reverse; direction++) {
            new Behavior(this.body, direction, this.genome.createReader(direction)).apply()
        }
    }
}
