/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage } from "eig"
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, Triangle, TRIANGLE_DEFINITIONS } from "../fabric/tensegrity-types"

import { Genome, IGenomeData } from "./genome"
import { Hexalot } from "./hexalot"
import { Leg } from "./journey"
import { TimeCycle } from "./time-cycle"

const MAX_VOTES = 30
const GRASP_COUNT = 5
const TWITCH_COUNT = 15

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
    index: number
    name: string
    limb: Limb
}

export interface IActuator {
    index: number
    name: string
    limb: Limb
    distance: number
    triangle: Triangle
}

export enum Limb {
    FrontLeft = "front-left",
    FrontRight = "front-right",
    BackLeft = "back-left",
    BackRight = "back-right",
}

export type GotchiFactory = (hexalot: Hexalot, index: number, rotation: number, genome: Genome) => Gotchi

export class Gotchi {
    public readonly instance: FabricInstance

    private embryo?: Tensegrity
    private actuators: IActuator[] = []
    private sensors: ISensor[] = []
    private votes: Direction[] = []
    private _direction = Direction.Rest
    private _nextDirection = Direction.Rest
    private currentLeg: Leg
    private shapingTime = 100
    private twitchCycle: Record<string, TimeCycle> = {}
    private timeSlice = 0
    private timeSliceIterations = 0

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

    public getActuator(whichLimb: Limb): IActuator {
        const actuator = this.actuators.find(({limb}) => limb === whichLimb)
        if (!actuator) {
            throw new Error("No actuator found")
        }
        return actuator
    }

    public actuate(limb: Limb, triangle: Triangle): void {
        const attackDecay = 10000
        this.actuators
            .filter(actuator => actuator.limb === limb && actuator.triangle === triangle)
            .forEach(actuator => this.fabric.twitch_face(actuator.index, 0.5, attackDecay, attackDecay))
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
        return this.fabric.age
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
        const embryo = this.embryo
        if (!embryo) {
            this.instance.iterate(Stage.Realized)
            const nextSliceIterations = this.timeSliceIterations + 1
            this.timeSliceIterations = nextSliceIterations >= 5 ? 0 : nextSliceIterations
            if (this.timeSliceIterations === 0) {
                this.twitchCycle[Direction.Forward].activate(this.timeSlice, this)
                const nextSlice = this.timeSlice + 1
                this.timeSlice = nextSlice >= 36 ? 0 : nextSlice
            }
        } else {
            const stage = embryo.iterate()
            switch (stage) {
                case Stage.Shaping:
                    if (this.shapingTime <= 0) {
                        this.fabric.adopt_lengths()
                        const faceIntervals = [...embryo.faceIntervals]
                        faceIntervals.forEach(interval => embryo.removeFaceInterval(interval))
                        this.instance.iterate(Stage.Slack)
                        this.instance.iterate(Stage.Realizing)
                    } else {
                        this.shapingTime--
                        // console.log("shaping", this.shapingTime)
                    }
                    break
                case Stage.Slack:
                    console.error("slack?")
                    break
                case Stage.Realizing:
                    break
                case Stage.Realized:
                    extractGotchiFaces(embryo, this.actuators, this.sensors)
                    this.embryo = undefined
                    Object.keys(Direction).forEach(direction => {
                        const reader = this.genome.createReader(Direction[direction])
                        const faceCount = this.actuators.length
                        this.twitchCycle[direction] = new TimeCycle(reader, faceCount, GRASP_COUNT, TWITCH_COUNT)
                    })
                    console.log("Genome", this.genome.toString())
                    break
            }
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

    public get facesGeometry(): BufferGeometry {
        const faceLocations = new Float32BufferAttribute(this.instance.floatView.faceLocations, 3)
        const faceNormals = new Float32BufferAttribute(this.instance.floatView.faceNormals, 3)
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", faceLocations)
        geometry.addAttribute("normal", faceNormals)
        geometry.computeBoundingSphere()
        return geometry
    }

    public get linesGeometry(): BufferGeometry {
        const lineLocations = new Float32BufferAttribute(this.instance.floatView.lineLocations, 3)
        const lineColors = new Float32BufferAttribute(this.instance.floatView.lineColors, 3)
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", lineLocations)
        geometry.addAttribute("color", lineColors)
        geometry.computeBoundingSphere()
        return geometry
    }

    public get fabric(): Fabric {
        return this.instance.fabric
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
        const limb = limbFromTriangle(triangles[0])
        const distance = lastIndex
        const triangle = triangles[lastIndex]
        const index = face.index
        const name = sensor ? `[${limb}]` : `[${limb}]:[${lastIndex}:${triangle}]`
        if (isSensor(face)) {
            sensors.push({index, name, limb})
        } else {
            actutors.push({index, name, limb, distance, triangle})
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
            return Limb.BackLeft
        case Triangle.PNN:
            return Limb.BackRight
        case Triangle.NPP:
            return Limb.FrontLeft
        case Triangle.PPP:
            return Limb.FrontRight
        default:
            throw new Error("Strange limb")
    }
}
