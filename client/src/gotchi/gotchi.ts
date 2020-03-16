/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"

import { FabricInstance } from "../fabric/fabric-instance"
import { Hexalot } from "./hexalot"
import { Leg } from "./journey"
import { Vector3 } from "three"
import { Genome, IGenomeData } from "./genome"

const MAX_VOTES = 30

export enum Direction {
    Rest,
    Forward,
    Left,
    Right,
}

export interface IGotchiFactory {
    createGotchi: (hexalot: Hexalot, rotation: number, genome?: Genome) => Gotchi
}

export interface IEvaluatedGotchi {
    gotchi: Gotchi
    distanceFromTarget: number
}

export class Gotchi {
    private votes: Direction[] = []
    private _direction = Direction.Rest
    private _nextDirection = Direction.Rest
    private currentLeg: Leg

    constructor(
        public readonly index: number,
        public readonly instance: FabricInstance,
        leg: Leg,
        private genome: Genome) {
        this.currentLeg = leg
    }

    public recycle(): void {
        console.error("recycle?")
    }

    public get genomeData(): IGenomeData {
        return this.genome.genomeData
    }

    public get offspringGenome(): IGenomeData {
        return this.genome.genomeData // todo
    }

    public mutateGenome(mutationCount: number): void {
        if (!this.genome) {
            throw new Error("Not evolving")
        }
        console.log(`mutating ${this.index} ${Direction[this.nextDirection]} ${mutationCount} dice`)
        this.genome = this.genome.withMutatedBehavior(this.nextDirection, mutationCount)
    }

    public get age(): number {
        return this.instance.fabric.age
    }

    public get direction(): Direction {
        return this._direction
    }

    public get nextDirection(): Direction {
        return this._nextDirection
    }

    public set nextDirection(direction: Direction) {
        this._nextDirection = direction
    }

    public iterate(): void {
        this.instance.iterate(Stage.Realized)
    }

    public get leg(): Leg {
        return this.currentLeg
    }

    public set leg(leg: Leg) {
        this.currentLeg = leg
        this.votes = []
        this._nextDirection = this.voteDirection()
    }

    public reorient(): void {
        if (this.touchedDestination) {
            const nextLeg = this.leg.nextLeg
            if (nextLeg) {
                this.leg = nextLeg
            } else {
                this.nextDirection = Direction.Rest
            }
        }
        if (this.nextDirection !== Direction.Rest) {
            const direction = this.voteDirection()
            if (this.nextDirection !== direction) {
                // console.log(`${this.index} turned ${Direction[this.nextDirection]} to ${Direction[direction]}`)
                this.nextDirection = direction
            }
        }
    }

    public get evaluated(): IEvaluatedGotchi {
        const view = this.instance.view
        const midpoint = new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        const distanceFromTarget = midpoint.distanceTo(this.target)
        return {gotchi: this, distanceFromTarget}
    }

    private get touchedDestination(): boolean {
        const view = this.instance.view
        const midpoint = new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        return midpoint.distanceTo(this.target) < 1 // TODO: how close?
    }

    private voteDirection(): Direction {
        const votes = this.votes
        const latestVote = this.directionToTarget
        votes.push(latestVote)
        if (votes.length > MAX_VOTES) {
            votes.shift()
        }
        const voteCounts = votes.reduce((c: number[], vote) => {
            c[vote]++
            return c
        }, [0, 0, 0, 0, 0])
        for (let direction = Direction.Forward; direction <= Direction.Right; direction++) {
            if (voteCounts[direction] === MAX_VOTES && this._nextDirection !== direction) {
                return direction
            }
        }
        return latestVote
    }

    private get directionToTarget(): Direction {
        const toTarget = this.toTarget
        const degreeForward = toTarget.dot(this.instance.forward)
        const degreeRight = toTarget.dot(this.instance.right)
        if (degreeForward > 0) {
            if (degreeRight > 0) {
                return degreeForward > degreeRight ? Direction.Forward : Direction.Right
            } else {
                return degreeForward > -degreeRight ? Direction.Forward : Direction.Left
            }
        } else {
            return Direction.Forward // was reverse logic?
        }
    }

    private get toTarget(): Vector3 {
        const toTarget = new Vector3()
        const view = this.instance.view
        const midpoint = new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        toTarget.subVectors(this.target, midpoint)
        toTarget.y = 0
        toTarget.normalize()
        return toTarget
    }

    private get target(): Vector3 {
        return this.currentLeg.goTo.center
    }

}
