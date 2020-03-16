/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"

import { FabricInstance } from "../fabric/fabric-instance"
import { Hexalot } from "./hexalot"
import { Leg } from "./journey"
import { Vector3 } from "three"

const MAX_VOTES = 30

export enum Direction {
    Rest,
    Forward,
    Left,
    Right,
}

export interface IGotchiFactory {
    createGotchi: (hexalot: Hexalot) => Gotchi
}

export class Gotchi {
    private votes: Direction[] = []
    private currentDirection = Direction.Rest
    private nextDirection = Direction.Rest
    private currentLeg: Leg

    constructor(
        public readonly instance: FabricInstance,
        leg: Leg) {
        this.currentLeg = leg
    }

    public get direction() {
        return this.currentDirection
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
        this.nextDirection = this.voteDirection()
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
            if (voteCounts[direction] === MAX_VOTES && this.nextDirection !== direction) {
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
