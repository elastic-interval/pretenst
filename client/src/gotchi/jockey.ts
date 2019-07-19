/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Geometry, Vector3 } from "three"

import { AppEvent } from "../app-event"
import { Direction } from "../body/fabric-exports"
import { GotchiBody } from "../body/gotchi-body"
import { Genome, IGenomeData } from "../genetics/genome"
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

    constructor(readonly gotchi: Gotchi, leg: Leg, private mutatingGenome?: Genome) {
        this.leg = leg
    }

    public get height(): number {
        return this.gotchi.fabric.midpoint.y
    }

    public get isResting(): boolean {
        return this.gotchi.isResting
    }

    public get leg(): Leg {
        return this.currentLeg
    }

    public set leg(leg: Leg) {
        this.currentLeg = leg
        this.votes = []
        this.gotchi.nextDirection = this.voteDirection()
    }

    public reorient(): void {
        if (this.touchedDestination) {
            const nextLeg = this.leg.nextLeg
            if (nextLeg) {
                this.leg = nextLeg
            } else {
                this.gotchi.nextDirection = Direction.REST
            }
        }
        if (this.fabric.nextDirection !== Direction.REST) {
            const direction = this.voteDirection()
            if (this.nextDirection !== direction) {
                console.log(`${this.index} turned ${Direction[this.nextDirection]} to ${Direction[direction]}`)
                this.gotchi.nextDirection = direction
            }
        }
    }

    public get pointerGeometry(): Geometry {
        return this.gotchi.fabric.pointerGeometryFor(this.gotchi.fabric.currentDirection)
    }

    public get facesGeometry(): BufferGeometry {
        return this.gotchi.fabric.facesGeometry
    }

    public startMoving(): void {
        this.leg = this.currentLeg
    }

    public stopMoving(): void {
        this.gotchi.nextDirection = Direction.REST
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

    public get fabric(): GotchiBody {
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

    public get nextDirection(): Direction {
        return this.fabric.nextDirection
    }

    public get evaluated(): IEvaluatedJockey {
        const distanceFromTarget = this.gotchi.getDistanceFrom(this.target)
        return {jockey: this, distanceFromTarget}
    }

    public iterate(ticks: number): AppEvent | undefined {
        return this.gotchi.iterate(ticks)
    }

    public get genomeData(): IGenomeData {
        return this.gotchi.genomeData
    }

    public createGotchi(genome: Genome): Gotchi | undefined {
        return this.gotchi.copyWithGenome(genome)
    }

    public recycle(): void {
        this.gotchi.recycle()
    }

    // ============================

    private get touchedDestination(): boolean {
        return this.gotchi.getDistanceFrom(this.target) < HEXAPOD_RADIUS
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

