
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { AppEvent } from "../app-event"
import { FabricDirection } from "../fabric/fabric-engine"
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
        public readonly home: Hexalot,
        public readonly body: GotchiBody,
        private genome: Genome,
        private gotchiFactory: IGotchiFactory,
    ) {
        const bodyIsBusy = true
        if (bodyIsBusy) {
            this.growth = new Growth(body, genome.createReader(FabricDirection.Rest))
        } else {
            if (body.nextState !== FabricDirection.Rest) {
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
        // const xx = this.body.vectors[0] - location.x
        // const zz = this.body.vectors[2] - location.z
        // return Math.sqrt(xx * xx + zz * zz)
        return 0 // TODO
    }

    public get genomeData(): IGenomeData {
        return this.genome.genomeData
    }

    public get currentState(): FabricDirection {
        return this.body.currentState
    }

    public set nextState(state: FabricDirection) {
        this.body.nextState = state
    }

    public approach(location: Vector3, towards: boolean): void {
        const distance = (direction: Vector3, factor: number) => new Vector3()
            .add(this.body.midpoint)
            .addScaledVector(direction, factor)
            .sub(location)
            .length()
        const distances = [
            {state: FabricDirection.Forward, distance: distance(this.body.forward, 1)},
            {state: FabricDirection.TurnLeft, distance: distance(this.body.right, -1)},
            {state: FabricDirection.TurnRight, distance: distance(this.body.right, 1)},
            {state: FabricDirection.Reverse, distance: distance(this.body.forward, -1)},
        ].sort((a, b) => a.distance < b.distance ? -1 : b.distance > a.distance ? 1 : 0)
        this.nextState = towards ? distances[0].state : distances[3].state
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
            if (this.currentState === FabricDirection.Rest) {
                return undefined
            }
            return AppEvent.Cycle
        }
    }

    private applyBehaviorGenes(): void {
        for (let state = FabricDirection.Forward; state <= FabricDirection.Reverse; state++) {
            new Behavior(this.body, state, this.genome.createReader(state)).apply()
        }
    }
}
