/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage, View } from "eig"
import { Quaternion, Vector3 } from "three"

import { FabricInstance, FORWARD } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, Triangle, TRIANGLE_DEFINITIONS } from "../fabric/tensegrity-types"

import { fromGeneData, GeneName, Genome, IGeneData } from "./genome"
import { Patch } from "./patch"
import { Twitch, Twitcher } from "./twitcher"

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
    patch: Patch
    instance: FabricInstance
    muscles: IMuscle[]
    extremities: IExtremity[]
    genome: Genome
    direction: Direction
    directionHistory: Direction[]
    autopilot: boolean
    timeSlice: number
    targetPatch: Patch
}

export function freshGotchiState(patch: Patch, instance: FabricInstance, genome: Genome): IGotchiState {
    return <IGotchiState>{
        patch,
        instance,
        muscles: [],
        extremities: [],
        genome,
        direction: Direction.Rest,
        directionHistory: [],
        autopilot: false,
        timeSlice: 0,
        targetPatch: patch.adjacent[patch.rotation],
    }
}

export class Gotchi {
    private shapingTime = 50
    private twitcher?: Twitcher

    constructor(public readonly state: IGotchiState, public embryo?: Tensegrity) {
        if (!embryo) {
            this.twitcher = new Twitcher(this.state)
        }
    }

    public get growing(): boolean {
        return !!this.embryo
    }

    public snapshot(): void {
        this.state.instance.snapshot()
    }

    public get genome(): Genome {
        return this.state.genome
    }

    public set genome(genome: Genome) {
        this.state.genome = genome
        this.state.patch.storedGenes = genome.geneData
    }

    public recycled(instance: FabricInstance, mutant?: IGeneData[]): Gotchi {
        const genome = mutant ? fromGeneData(mutant) : this.genome
        const state: IGotchiState = {...this.state, instance, genome, directionHistory: []}
        return new Gotchi(state)
    }

    public get cycleCount(): number {
        return this.twitcher ? this.twitcher.cycleCount : 0
    }

    public get patch(): Patch {
        return this.state.patch
    }

    public get instance(): FabricInstance {
        return this.state.instance
    }

    public get autopilot(): boolean {
        return this.state.autopilot
    }

    public set autopilot(auto: boolean) {
        this.state.autopilot = auto
        if (auto) {
            this.checkDirection()
        }
    }

    public get direction(): Direction {
        return this.state.direction
    }

    public set direction(direction: Direction) {
        this.state.direction = direction
        this.autopilot = false
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

    public mutatedGeneData(): IGeneData[] {
        const counts = DIRECTIONS.map(dir => {
            const count = this.state.directionHistory.filter(d => d === dir).length
            return ({dir, count})
        })
        const nonzero = counts.sort((a, b) => {
            if (a.count > b.count) {
                return -1
            } else if (b.count > a.count) {
                return 1
            } else {
                return 0
            }
        }).filter(count => count.count > 0)
        const geneNames = nonzero.map(d => d.dir).map(directionGene)
        return this.state.genome.withDirectionMutations(geneNames).geneData
    }

    public get age(): number {
        return this.state.instance.fabric.age
    }

    public getMidpoint(midpoint?: Vector3): Vector3 {
        if (!midpoint) {
            midpoint = new Vector3()
        }
        const view = this.state.instance.view
        midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        return midpoint
    }

    public get distanceFromTarget(): number {
        return this.getMidpoint().distanceTo(this.target)
    }

    public iterate(midpoint?: Vector3): boolean {
        const state = this.state
        const instance = state.instance
        const view = instance.view
        if (midpoint) {
            midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        }
        const embryo = this.embryo
        if (embryo) {
            const nextStage = embryo.iterate()
            const life = embryo.life$.getValue()
            if (life.stage === Stage.Pretensing && nextStage === Stage.Pretenst) {
                embryo.transition = {stage: Stage.Pretenst}
            } else if (nextStage !== undefined && nextStage !== life.stage && life.stage !== Stage.Pretensing) {
                embryo.transition = {stage: nextStage}
            }
            switch (nextStage) {
                case Stage.Shaping:
                    if (this.shapingTime <= 0) {
                        instance.fabric.adopt_lengths()
                        const faceIntervals = [...embryo.faceIntervals]
                        faceIntervals.forEach(interval => embryo.removeFaceInterval(interval))
                        instance.iterate(Stage.Slack)
                        instance.iterate(Stage.Pretensing)
                    } else {
                        this.shapingTime--
                    }
                    return false
                case Stage.Pretensing:
                    return true
                case Stage.Pretenst:
                    extractGotchiFaces(embryo, state.muscles, state.extremities)
                    embryo.transition = {stage: Stage.Pretenst}
                    embryo.iterate()
                    this.embryo = undefined
                    this.twitcher = new Twitcher(state)
                    return true
                default:
                    return false
            }
        } else {
            instance.iterate(Stage.Pretenst)
            if (this.twitcher) {
                const twitch: Twitch = (m, a, d, n) => this.twitch(m, a, d, n)
                const cycleIncrement = this.twitcher.tick(twitch)
                if (cycleIncrement && this.autopilot) {
                    this.checkDirection()
                }
            }
            return true
        }
    }

    public get target(): Vector3 {
        return this.state.targetPatch.center
    }

    public get showDirection(): boolean {
        return this.state.direction !== Direction.Rest
    }

    public get directionQuaternion(): Quaternion {
        return this.quaternionForDirection(this.state.direction)
    }

    private checkDirection(): void {
        const state = this.state
        const touchedDestination = this.getMidpoint().distanceTo(this.target) < 5 // TODO
        if (touchedDestination) {
            this.direction = Direction.Rest
        } else {
            state.direction = this.directionToTarget
            state.directionHistory.push(state.direction)
        }
    }

    private twitch(whichMuscle: number, attack: number, decay: number, intensity: number): void {
        const state = this.state
        const muscle = state.muscles[whichMuscle]
        state.instance.fabric.twitch_face(muscle.faceIndex, attack, decay, intensity)
        // console.log(`twitch ${muscle.name} ${muscle.faceIndex}: ${attack}, ${decay}`)
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

    private get directionToTarget(): Direction {
        const toTarget = this.toTarget
        const instance = this.state.instance
        instance.refreshFloatView()
        const degreeForward = toTarget.dot(instance.forward)
        const degreeRight = toTarget.dot(instance.right)
        if (degreeRight > 0) {
            return degreeForward > degreeRight ? Direction.Forward : Direction.Right
        } else {
            return degreeForward > -degreeRight ? Direction.Forward : Direction.Left
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
