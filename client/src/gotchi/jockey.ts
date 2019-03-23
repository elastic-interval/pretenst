/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Fabric } from "../body/fabric"
import { Direction } from "../body/fabric-exports"
import { fromGenomeData, Genome, IGenomeData } from "../genetics/genome"
import { HEXAPOD_RADIUS } from "../island/constants"
import { Leg } from "../island/journey"

import { Gotchi } from "./gotchi"

const MAX_VOTES = 30

export interface IEvaluatedJockey {
    jockey: Jockey
    distanceFromTarget: number
}

export class Jockey {
    private votes: Direction[] = []
    private currentLeg: Leg
    private nextDirection = Direction.REST

    constructor(readonly gotchi: Gotchi, leg: Leg, private mutatingGenome?: Genome) {
        this.leg = leg
    }

    public get leg(): Leg {
        return this.currentLeg
    }

    public set leg(leg: Leg) {
        this.currentLeg = leg
        this.votes = []
        this.nextDirection = this.gotchi.nextDirection = this.voteDirection()
    }

    public adjustDirection(): boolean {
        const direction = this.voteDirection()
        if (this.nextDirection === direction) {
            return false
        }
        console.log(`${this.index} turned ${Direction[this.nextDirection]} to ${Direction[direction]}`)
        this.nextDirection = this.gotchi.nextDirection = direction
        return true
    }

    public get index(): number {
        return this.gotchi.index
    }

    public get age(): number {
        return this.gotchi.age
    }

    public get gestating(): boolean {
        return this.fabric.isGestating
    }

    public get fabric(): Fabric {
        return this.gotchi.fabric
    }

    public get vectors(): Float32Array {
        return this.gotchi.fabric.vectors
    }

    public get offspringGenome(): IGenomeData {
        if (!this.mutatingGenome) {
            throw new Error("Not evolving")
        }
        return this.mutatingGenome.genomeData
    }

    public mutateGenome(mutationCount: number): void {
        if (!this.mutatingGenome) {
            throw new Error("Not evolving")
        }
        // console.log(`mutating ${this.index} ${Direction[this.nextDirection]} ${mutationCount} dice`)
        this.mutatingGenome = this.mutatingGenome.withMutatedBehavior(this.nextDirection, mutationCount)
    }

    public get direction(): Direction {
        return this.nextDirection
    }

    public get evaluated(): IEvaluatedJockey {
        const distanceFromTarget = this.gotchi.getDistanceFrom(this.target)
        return {jockey: this, distanceFromTarget}
    }

    public get touchedDestination(): boolean {
        return this.gotchi.getDistanceFrom(this.target) < HEXAPOD_RADIUS
    }

    public iterate(ticks: number): boolean {
        return this.gotchi.iterate(ticks)
    }

    public get genomeData(): IGenomeData {
        return this.gotchi.genomeData
    }

    public gotchiWithGenome(genome: Genome): Gotchi | undefined {
        return this.gotchi.copyWithGenome(genome)
    }

    public recycle(): void {
        this.gotchi.recycle()
    }

    // ============================

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
        for (let direction = Direction.FORWARD; direction <= Direction.REVERSE; direction++) {
            if (voteCounts[direction] === MAX_VOTES && this.nextDirection !== direction) {
                return direction
            }
        }
        return latestVote
    }

    private get directionToTarget(): Direction {
        const toTarget = this.toTarget
        const degreeForward = toTarget.dot(this.gotchi.fabric.forward)
        const degreeRight = toTarget.dot(this.gotchi.fabric.right)
        if (degreeForward > 0) {
            if (degreeRight > 0) {
                return degreeForward > degreeRight ? Direction.FORWARD : Direction.RIGHT
            } else {
                return degreeForward > -degreeRight ? Direction.FORWARD : Direction.LEFT
            }
        } else {
            if (degreeRight > 0) {
                return -degreeForward > degreeRight ? Direction.REVERSE : Direction.RIGHT
            } else {
                return -degreeForward > -degreeRight ? Direction.REVERSE : Direction.LEFT
            }
        }
    }

    private get toTarget(): Vector3 {
        const toTarget = new Vector3()
        toTarget.subVectors(this.target, this.gotchi.fabric.seed)
        toTarget.y = 0
        toTarget.normalize()
        return toTarget
    }

    private get target(): Vector3 {
        return this.currentLeg.goTo.center
    }
}

