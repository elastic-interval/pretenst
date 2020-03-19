/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import { Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, Triangle, TRIANGLE_DEFINITIONS } from "../fabric/tensegrity-types"

import { Genome, IGenomeData } from "./genome"
import { Hexalot } from "./hexalot"
import { Leg } from "./journey"

const MAX_VOTES = 30

export enum Direction {
    Rest,
    Forward,
    Left,
    Right,
}

export interface IEvaluatedGotchi {
    gotchi: Gotchi
    distanceFromTarget: number
}

export interface ISensor {
    name: string
    limb: Limb
    submerged?: () => boolean
}

export interface IActuator {
    name: string
    limb: Limb
    distance: number
    triangle: Triangle
    contract?: (sizeNuance: number, countdown: number) => void
}

export enum Limb {
    FrontLeft,
    FrontRight,
    BackLeft,
    BackRight,
}

export type GotchiFactory = (hexalot: Hexalot, index: number, rotation: number, genome: Genome) => Gotchi

export class Gotchi {
    private embryo?: Tensegrity
    private instance: FabricInstance
    private actuators: IActuator[] = []
    private sensors: ISensor[] = []
    private votes: Direction[] = []
    private _direction = Direction.Rest
    private _nextDirection = Direction.Rest
    private currentLeg: Leg

    constructor(
        public readonly hexalot: Hexalot,
        public readonly index: number,
        private genome: Genome,
        tensegrity: Tensegrity,
        leg: Leg,
    ) {
        this.embryo = tensegrity
        this.instance = tensegrity.instance
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
        if (!this.embryo) {
            this.instance.iterate(Stage.Realized)
        } else if (this.embryo.iterate() === Stage.Realized) {
            extractGotchiFaces(this.embryo, this.actuators, this.sensors)
            this.embryo = undefined
        }
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

function extractGotchiFaces(tensegrity: Tensegrity, actutors: IActuator[], sensors: ISensor[]): void {
    tensegrity.faces.filter(face => !face.removed && face.brick.parent).forEach(face => {
        const ancestorTriangles = (f: IFace, t: Triangle[]) => {
            const p = f.brick.parent
            if (!p) {
                t.push(f.triangle)
            } else {
                ancestorTriangles(p, t)
                const definition = TRIANGLE_DEFINITIONS[f.triangle]
                t.push(definition.negative ? definition.opposite : f.triangle)
            }
            return t
        }
        const triangles = ancestorTriangles(face, [])
        const lastIndex = triangles.length - 1
        const sensor = triangles[lastIndex] === Triangle.PPP
        if (sensor) {
            const submerged = () => tensegrity.instance.fabric.is_face_joint_submerged(face.index)
            const setSubmergedFunctionOf = (f: IFace) => {
                const existingSubmerged = f.submerged
                f.submerged = !existingSubmerged ? submerged : () => submerged() || existingSubmerged()
                const parent = f.brick.parent
                if (parent) {
                    setSubmergedFunctionOf(parent)
                }
            }
            setSubmergedFunctionOf(face)
        }
        const limb = limbFromTriangle(triangles[0])
        const distance = lastIndex
        const triangle = triangles[lastIndex]
        const name = sensor ? `[${limb}]` : `[${limb}]:[${lastIndex}:${triangle}]`
        if (isSensor(face)) {
            sensors.push({name, limb, submerged: face.submerged})
        } else {
            actutors.push({name, limb, distance, triangle, contract: face.contract})
        }
    })
}

function isSensor(face: IFace): boolean {
    const definition = TRIANGLE_DEFINITIONS[face.triangle]
    const triangle = definition.negative ? definition.opposite : face.triangle
    return triangle === Triangle.PPP
}

function limbFromTriangle(triangle: Triangle): Limb {
    switch (triangle) {
        case Triangle.NNN:
            return Limb.FrontLeft
        case Triangle.PNN:
            return Limb.FrontRight
        case Triangle.NPP:
            return Limb.BackLeft
        case Triangle.PPP:
            return Limb.BackRight
        default:
            throw new Error("Strange limb")
    }
}
