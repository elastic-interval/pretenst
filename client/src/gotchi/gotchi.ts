/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage, View } from "eig"
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

export interface IGotchiState {
    hexalot: Hexalot
    instance: FabricInstance
    muscles: IMuscle[]
    extremities: IExtremity[]
    genome: Genome
    direction: Direction
    autopilot: boolean
    timeSlice: number
    leg: Leg
}

export function freshGotchiState(hexalot: Hexalot, instance: FabricInstance, genome: Genome, leg: Leg): IGotchiState {
    return <IGotchiState>{
        hexalot,
        instance,
        muscles: [],
        extremities: [],
        genome,
        direction: Direction.Rest,
        autopilot: false,
        timeSlice: 0,
        leg,
    }
}

export type CreateGotchi = (hexalot: Hexalot, instance: FabricInstance, genome: Genome, rotation: number) => Gotchi

export class Gotchi {
    public cycleCount = 0
    public timeCycles = 0

    private _embryo?: Tensegrity
    private shapingTime = 60
    private twitchCycle: Record<string, TimeCycle> = {}

    constructor(public readonly state: IGotchiState, embryo?: Tensegrity) {
        if (embryo) {
            this._embryo = embryo
        } else {
            this.genomeToTwitchCycles(state.genome)
        }
    }

    public snapshot(): void {
        this.state.instance.snapshot()
    }

    public saveGenome(genome: Genome): void {
        this.state.genome = genome
        this.state.hexalot.genome = genome
    }

    public recycled(instance: FabricInstance, genome?: Genome): Gotchi {
        const hexalotGenome = this.state.hexalot.genome
        const state: IGotchiState = {...this.state, instance, genome: genome ? genome : hexalotGenome}
        return new Gotchi(state)
    }

    public get isMature(): boolean {
        return !this._embryo
    }

    public get hexalot(): Hexalot {
        return this.state.hexalot
    }

    public get instance(): FabricInstance {
        return this.state.instance
    }

    public get genome(): Genome {
        return this.state.genome
    }

    public get autopilot(): boolean {
        return this.state.autopilot
    }

    public set autopilot(auto: boolean) {
        this.state.autopilot = auto
    }

    public get direction(): Direction {
        return this.state.direction
    }

    public set direction(direction: Direction) {
        this.state.direction = direction
    }

    public get fabricClone(): Fabric {
        return this.state.instance.fabricClone
    }

    public adoptFabric(fabric: Fabric): FabricInstance {
        return this.state.instance.adoptFabric(fabric)
    }

    public get view(): View {
        return this.state.instance.view
    }

    public getExtremity(whichLimb: Limb): IExtremity {
        const extremity = this.state.extremities.find(({limb}) => limb === whichLimb)
        if (!extremity) {
            throw new Error("No extremity found")
        }
        return extremity
    }

    public mutatedGenome(mutationCount: number): IGenomeData {
        return this.state.genome.withMutations(directionGene(this.state.direction), mutationCount).genomeData
    }

    public get age(): number {
        return this.state.instance.fabric.age
    }

    public iterate(midpoint: Vector3): void {
        const instance = this.state.instance
        const view = instance.view
        midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        const embryo = this._embryo
        if (embryo) {
            const stage = embryo.iterate()
            switch (stage) {
                case Stage.Shaping:
                    if (this.shapingTime <= 0) {
                        instance.fabric.adopt_lengths()
                        const faceIntervals = [...embryo.faceIntervals]
                        faceIntervals.forEach(interval => embryo.removeFaceInterval(interval))
                        instance.iterate(Stage.Slack)
                        instance.iterate(Stage.Realizing)
                    } else {
                        this.shapingTime--
                        // console.log("shaping", this.shapingTime)
                    }
                    break
                case Stage.Realized:
                    extractGotchiFaces(embryo, this.state.muscles, this.state.extremities)
                    this._embryo = undefined
                    this.genomeToTwitchCycles(this.state.genome)
                    break
            }
        } else {
            instance.iterate(Stage.Realized)
            this.timeCycles++
            if (this.timeCycles < 7) {
                return
            }
            this.timeCycles = 0
            const state = this.state
            state.timeSlice++
            if (state.timeSlice >= 36) {
                state.timeSlice = 0
                this.cycleCount++
                if (state.autopilot) {
                    this.reorient()
                }
            }
            if (state.direction !== Direction.Rest) {
                const twitchCycle = this.twitchCycle[state.direction]
                if (!twitchCycle) {
                    console.error("no twitch cycle", state.direction)
                    return
                }
                twitchCycle.activate(state.timeSlice, (whichMuscle: number, attack: number, decay: number) => (
                    twitch(state.instance, state.muscles[whichMuscle], attack, decay)
                ))
            }
        }
    }

    public get facesGeometry(): BufferGeometry {
        const floatView = this.state.instance.floatView
        const faceLocations = new Float32BufferAttribute(floatView.faceLocations, 3)
        const faceNormals = new Float32BufferAttribute(floatView.faceNormals, 3)
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", faceLocations)
        geometry.addAttribute("normal", faceNormals)
        geometry.computeBoundingSphere()
        return geometry
    }

    public get linesGeometry(): BufferGeometry {
        const floatView = this.state.instance.floatView
        const lineLocations = new Float32BufferAttribute(floatView.lineLocations, 3)
        const lineColors = new Float32BufferAttribute(floatView.lineColors, 3)
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", lineLocations)
        geometry.addAttribute("color", lineColors)
        geometry.computeBoundingSphere()
        return geometry
    }

    public get target(): Vector3 {
        return this.state.leg.goTo.center
    }

    public reorient(): void {
        const touchedDestination = false
        const state = this.state
        if (touchedDestination) {
            const nextLeg = state.leg.nextLeg
            if (nextLeg) {
                state.leg = nextLeg
            } else {
                state.direction = Direction.Rest
            }
        } else {
            state.direction = this.directionToTarget
        }
    }

    public get showDirection(): boolean {
        return this.state.direction !== Direction.Rest
    }

    public get directionQuaternion(): Quaternion {
        return this.quaternionForDirection(this.state.direction)
    }

    private quaternionForDirection(direction: Direction): Quaternion {
        const towards = () => {
            const instance = this.state.instance
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
        const loc = this.state.instance.floatView.jointLocations
        return new Vector3(loc[topJoint * 3], loc[topJoint * 3 + 1], loc[topJoint * 3 + 2])
    }

    private genomeToTwitchCycles(genome: Genome): void {
        const generaton = genome.generation
        const musclePeriod = genome.createReader(GeneName.MusclePeriod).modifyFeature(1000, generaton)
        const attackPeriod = genome.createReader(GeneName.AttackPeriod).modifyFeature(musclePeriod, generaton)
        const decayPeriod = genome.createReader(GeneName.DecayPeriod).modifyFeature(musclePeriod, generaton)
        const twitchCount = 1 + generaton
        DIRECTIONS.filter(d => d !== Direction.Rest).forEach(direction => {
            const geneName = directionGene(direction)
            const reader = genome.createReader(geneName)
            this.twitchCycle[direction] = new TimeCycle(reader, this.state.muscles, twitchCount, attackPeriod, decayPeriod)
        })
    }

    private get directionToTarget(): Direction {
        const toTarget = this.toTarget
        const instance = this.state.instance
        const degreeForward = toTarget.dot(instance.forward)
        const degreeRight = toTarget.dot(instance.right)
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
        const view = this.state.instance.view
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
