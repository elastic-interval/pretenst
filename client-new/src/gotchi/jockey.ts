/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Geometry, Vector3 } from "three"

import { AppEvent } from "../app-event"
import { FabricState } from "../fabric/fabric-engine"
import { GotchiBody } from "../fabric/gotchi-body"
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
    private votes: FabricState[] = []
    private currentLeg: Leg

    constructor(readonly gotchi: Gotchi, leg: Leg, private mutatingGenome?: Genome) {
        this.leg = leg
    }

    public get height(): number {
        return this.gotchi.body.midpoint.y
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
        this.gotchi.nextState = this.voteState()
    }

    public reorient(): void {
        if (this.touchedDestination) {
            const nextLeg = this.leg.nextLeg
            if (nextLeg) {
                this.leg = nextLeg
            } else {
                this.gotchi.nextState = FabricState.Rest
            }
        }
        if (this.fabric.nextState !== FabricState.Rest) {
            const state = this.voteState()
            // todo: fix all this
            if (this.nextState !== state) {
                console.log(`${this.index} turned ${FabricState[this.nextState]} to ${FabricState[state]}`)
                this.gotchi.nextState = state
            }
        }
    }

    public get pointerGeometry(): Geometry {
        return this.gotchi.body.pointerGeometryFor(this.gotchi.body.currentState)
    }

    public get facesGeometry(): BufferGeometry {
        return this.gotchi.body.facesGeometry
    }

    public startMoving(): void {
        this.leg = this.currentLeg
    }

    public stopMoving(): void {
        this.gotchi.nextState = FabricState.Rest
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
        return this.gotchi.body
    }

    public get vectors(): Float32Array {
        return this.gotchi.body.vectors
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
        this.mutatingGenome = this.mutatingGenome.withMutatedBehavior(this.nextState, mutationCount)
    }

    public get nextState(): FabricState {
        return this.fabric.nextState
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

    private voteState(): FabricState {
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
        for (let state = FabricState.Forward; state <= FabricState.Reverse; state++) {
            if (voteCounts[state] === MAX_VOTES && this.nextState !== state) {
                return state
            }
        }
        return latestVote
    }

    private get directionToTarget(): FabricState {
        const toTarget = this.toTarget
        const degreeForward = toTarget.dot(this.gotchi.body.forward)
        const degreeRight = toTarget.dot(this.gotchi.body.right)
        if (degreeForward > 0) {
            if (degreeRight > 0) {
                return degreeForward > degreeRight ? FabricState.Forward : FabricState.TurnRight
            } else {
                return degreeForward > -degreeRight ? FabricState.Forward : FabricState.TurnLeft
            }
        } else {
            if (degreeRight > 0) {
                return -degreeForward > degreeRight ? FabricState.Reverse : FabricState.TurnRight
            } else {
                return -degreeForward > -degreeRight ? FabricState.Reverse : FabricState.TurnLeft
            }
        }
    }

    private get toTarget(): Vector3 {
        const toTarget = new Vector3()
        toTarget.subVectors(this.target, this.gotchi.body.seed)
        toTarget.y = 0
        toTarget.normalize()
        return toTarget
    }

    private get target(): Vector3 {
        return this.currentLeg.goTo.center
    }
}

