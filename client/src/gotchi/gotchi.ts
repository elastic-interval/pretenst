/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import { BufferGeometry, Float32BufferAttribute, Quaternion, Vector3 } from "three"

import { FabricInstance, FORWARD } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, Triangle, TRIANGLE_DEFINITIONS } from "../fabric/tensegrity-types"

import { GeneName, Genome, IGenomeData } from "./genome"
import { Hexalot } from "./hexalot"
import { Leg } from "./journey"
import { TimeCycle } from "./time-cycle"

export enum Direction {
    Rest = "Rest",
    Forward = "Forward",
    Left = "Left",
    Right = "Right",
}

export const DIRECTIONS: Direction[] = Object.keys(Direction).map(k => Direction[k])

export function directionGene(direction: Direction): GeneName {
    switch (direction) {
        case Direction.Forward:
            return GeneName.Forward
        case Direction.Left:
            return GeneName.Left
        case Direction.Right:
            return GeneName.Right
        default:
            throw new Error(`No gene for direction ${direction}`)
    }
}

export interface IExtremity {
    faceIndex: number
    name: string
    limb: Limb
}

export interface IMuscle {
    faceIndex: number
    name: string
    limb: Limb
    distance: number
    group: Triangle
    triangle: Triangle
}

export enum Limb {
    FrontLeft = "front-left",
    FrontRight = "front-right",
    BackLeft = "back-left",
    BackRight = "back-right",
}

export interface IGotchiSeed {
    instance: object
    timeSlice: number
    autopilot: boolean
    direction: Direction
    genome?: Genome
    embryo?: Tensegrity
    muscles: IMuscle[]
    extremities: IExtremity[]
}

export type CreateGotchi = (hexalot: Hexalot, rotation: number, seed: IGotchiSeed) => Gotchi

export class Gotchi {
    public instance: FabricInstance
    public direction = Direction.Rest
    public genome: Genome
    public muscles: IMuscle[] = []
    public extremities: IExtremity[] = []
    public cycleCount = 0
    public timeSlice = 0
    public timeCycles = 0
    public autopilot = false

    private embryo?: Tensegrity
    private currentLeg: Leg
    private shapingTime = 60
    private twitchCycle: Record<string, TimeCycle> = {}

    constructor(public readonly hexalot: Hexalot, leg: Leg, seed: IGotchiSeed) {
        if (!seed.instance) {
            throw new Error("Missing instance")
        }
        if (!seed.genome) {
            throw new Error("Missing genome")
        }
        this.instance = seed.instance as FabricInstance
        this.genome = seed.genome
        this.currentLeg = leg
        this.embryo = seed.embryo
        this.muscles = seed.muscles
        this.extremities = seed.extremities
        this.timeSlice = seed.timeSlice
        this.autopilot = seed.autopilot
        this.direction = seed.direction
        if (!this.embryo) {
            this.genomeToTwitchCycle(this.genome)
        }
    }

    public get isMature(): boolean {
        return !this.embryo
    }

    public getExtremity(whichLimb: Limb): IExtremity {
        const extremity = this.extremities.find(({limb}) => limb === whichLimb)
        if (!extremity) {
            throw new Error("No extremity found")
        }
        return extremity
    }

    public mutatedGenome(mutationCount: number): IGenomeData {
        if (!this.genome) {
            throw new Error("Not evolving")
        }
        return this.genome.withMutations(directionGene(this.direction), mutationCount).genomeData
    }

    public get age(): number {
        return this.instance.fabric.age
    }

    public set leg(leg: Leg) {
        this.currentLeg = leg
        this.reorient()
    }

    public get leg(): Leg {
        return this.currentLeg
    }

    public iterate(midpoint: Vector3): void {
        const view = this.instance.view
        midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        const embryo = this.embryo
        if (embryo) {
            const stage = embryo.iterate()
            switch (stage) {
                case Stage.Shaping:
                    if (this.shapingTime <= 0) {
                        this.instance.fabric.adopt_lengths()
                        const faceIntervals = [...embryo.faceIntervals]
                        faceIntervals.forEach(interval => embryo.removeFaceInterval(interval))
                        this.instance.iterate(Stage.Slack)
                        this.instance.iterate(Stage.Realizing)
                    } else {
                        this.shapingTime--
                        // console.log("shaping", this.shapingTime)
                    }
                    break
                case Stage.Realized:
                    extractGotchiFaces(embryo, this.muscles, this.extremities)
                    this.embryo = undefined
                    this.genomeToTwitchCycle(this.genome)
                    break
            }
        } else {
            this.instance.iterate(Stage.Realized)
            this.timeCycles++
            if (this.timeCycles < 7) {
                return
            }
            this.timeCycles = 0
            this.timeSlice++
            if (this.timeSlice >= 36) {
                this.timeSlice = 0
                this.cycleCount++
                if (this.autopilot) {
                    this.reorient()
                }
            }
            if (this.direction !== Direction.Rest) {
                const twitchCycle = this.twitchCycle[this.direction]
                if (!twitchCycle) {
                    console.error("no twitch cycle", this.direction)
                    return
                }
                twitchCycle.activate(this.timeSlice, (whichMuscle: number, attack: number, decay: number) => (
                    twitch(this.instance, this.muscles[whichMuscle], attack, decay)
                ))
            }
        }
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

    public get target(): Vector3 {
        return this.currentLeg.goTo.center
    }

    public reorient(): void {
        const touchedDestination = false
        if (touchedDestination) {
            const nextLeg = this.leg.nextLeg
            if (nextLeg) {
                this.leg = nextLeg
            } else {
                this.direction = Direction.Rest
            }
        } else {
            this.direction = this.directionToTarget
        }
    }

    public get showDirection(): boolean {
        return this.direction !== Direction.Rest
    }

    public get directionQuaternion(): Quaternion {
        return this.quaternionForDirection(this.direction)
    }

    private quaternionForDirection(direction: Direction): Quaternion {
        const towards = () => {
            const instance = this.instance
            switch (direction) {
                case Direction.Rest:
                case Direction.Forward:
                    return instance.forward
                case Direction.Left:
                    return instance.left
                case Direction.Right:
                    return instance.right
            }
        }
        return new Quaternion().setFromUnitVectors(FORWARD, towards())
    }

    public get topJointLocation(): Vector3 {
        const topJoint = 3
        const loc = this.instance.floatView.jointLocations
        return new Vector3(loc[topJoint * 3], loc[topJoint * 3 + 1], loc[topJoint * 3 + 2])
    }

    private genomeToTwitchCycle(genome: Genome): void {
        DIRECTIONS.filter(d => d !== Direction.Rest).forEach(direction => {
            const geneName = directionGene(direction)
            const reader = genome.createReader(geneName)
            const mutationCount = genome.mutationCount(geneName)
            const twitchCount = (mutationCount === 0 ? 0 : Math.ceil(Math.log(mutationCount))) + 1
            if (direction === Direction.Rest) {
                console.log(`twitchCount=${twitchCount} from ${mutationCount}`)
            }
            this.twitchCycle[direction] = new TimeCycle(reader, this.muscles, twitchCount)
        })
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
}

function twitch(instance: FabricInstance, muscle: IMuscle, attack: number, decay: number): void {
    const deltaSize = 0.4
    instance.fabric.twitch_face(muscle.faceIndex, deltaSize, attack, decay)
    // console.log(`twitch ${muscle.name} ${muscle.faceIndex}: ${attack}, ${decay}`)
}

export function oppositeMuscleIndex(whichMuscle: number, muscles: IMuscle[]): number {
    const {name, limb, distance, triangle} = muscles[whichMuscle]
    const oppositeTriangle = TRIANGLE_DEFINITIONS[triangle].opposite
    const findLimb = oppositeLimb(limb)
    const oppositeIndex = muscles.findIndex(m => m.limb === findLimb && m.distance === distance && m.triangle === oppositeTriangle)
    if (oppositeIndex < 0) {
        throw new Error(`Unable to find opposite muscle to ${name}`)
    }
    // console.log(`opposite of ${name} is ${muscles[oppositeIndex].name}`)
    return oppositeIndex
}

function extractGotchiFaces(tensegrity: Tensegrity, muscles: IMuscle[], extremities: IExtremity[]): void {
    tensegrity.faces
        .filter(face => !face.removed && face.brick.parentFace)
        .forEach(face => {
            const gatherAncestors = (f: IFace, id: Triangle[]): Limb => {
                const definition = TRIANGLE_DEFINITIONS[f.triangle]
                id.push(definition.negative ? definition.opposite : definition.name)
                const parentFace = f.brick.parentFace
                if (parentFace) {
                    return gatherAncestors(parentFace, id)
                } else {
                    return limbFromTriangle(f.triangle)
                }
            }
            const identities: Triangle[] = []
            const limb = gatherAncestors(face, identities)
            const group = identities.shift()
            const triangle = face.triangle
            if (!group) {
                throw new Error("no top!")
            }
            const distance = identities.length
            const faceIndex = face.index
            if (isTriangleExtremity(group)) {
                const name = `[${limb}]`
                extremities.push({faceIndex, name, limb})
            } else {
                const name = `[${limb}]:[${distance}:${Triangle[group]}]:{tri=${Triangle[triangle]}}`
                muscles.push({faceIndex, name, limb, distance, group, triangle})
            }
        })
}

function isTriangleExtremity(triangle: Triangle): boolean {
    const definition = TRIANGLE_DEFINITIONS[triangle]
    const normalizedTriangle = definition.negative ? definition.opposite : triangle
    return normalizedTriangle === Triangle.PPP
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

function oppositeLimb(limb: Limb): Limb {
    switch (limb) {
        case Limb.BackRight:
            return Limb.BackLeft
        case Limb.BackLeft:
            return Limb.BackRight
        case Limb.FrontRight:
            return Limb.FrontLeft
        case Limb.FrontLeft:
            return Limb.FrontRight
        default:
            throw new Error("Strange limb")
    }
}
