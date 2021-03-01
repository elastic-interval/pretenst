/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, SurfaceCharacter, View, WorldFeature } from "eig"
import { Quaternion, Vector3 } from "three"

import { FORWARD } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { ITenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { FaceName, Spin } from "../fabric/tensegrity-types"

import { fromGeneData, GeneName, Genome, IGeneData, randomModifierName } from "./genome"
import { Patch } from "./patch"
import { Twitch, Twitcher } from "./twitcher"

export const GOTCHI_CODE: ITenscript = {
    name: "Gorillagotchi",
    code: ["(A(4,S80,Mb0),b(4,S80,Mb0),a(2,S70,Md0),B(2,Md0,S70))"],
    spin: Spin.Left,
    marks: {
        0: "distance-60",
    },
    surfaceCharacter: SurfaceCharacter.Frozen,
    featureValues: {},
}
export const SATOSHI_TREE_CODE: ITenscript = {
    name: "Satoshi Tree",
    code: ["(2,S85,b(4,S85,MA0),c(4,S85,MA0),d(4,S85,MA0))"],
    spin: Spin.Left,
    marks: {
        0: "subtree(b(3, S85),c(3, S85),d(3, S85))",
    },
    surfaceCharacter: SurfaceCharacter.Frozen,
    featureValues: {},
}

export enum Direction {
    Rest = "Rest",
    Forward = "Forward",
    Left = "Left",
    Right = "Right",
}

export const DIRECTIONS: Direction[] = Object.keys(Direction).map(k => Direction[k])

const CLOSE_ENOUGH_TO_TARGET = 4

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
    group: FaceName
    faceName: FaceName
}

export enum Limb {
    FrontLeft = "front-left",
    FrontRight = "front-right",
    BackLeft = "back-left",
    BackRight = "back-right",
}

export interface IGotchiState {
    patch: Patch
    targetPatch: Patch
    instance: FabricInstance
    muscles: IMuscle[]
    extremities: IExtremity[]
    genome: Genome
    direction: Direction
    directionHistory: Direction[]
    autopilot: boolean
    timeSlice: number
    twitchesPerCycle: number
}

export function freshGotchiState(patch: Patch, instance: FabricInstance, genome: Genome): IGotchiState {
    return <IGotchiState>{
        patch,
        targetPatch: patch.adjacent[patch.rotation],
        instance,
        muscles: [],
        extremities: [],
        genome,
        direction: Direction.Rest,
        directionHistory: [],
        autopilot: false,
        timeSlice: 0,
        reachedTarget: false,
        twitchesPerCycle: 30,
    }
}

export class Gotchi {
    // private shapingTime = 50
    private twitcher?: Twitcher

    constructor(public readonly state: IGotchiState, public embryo?: Tensegrity) {
        if (!embryo) {
            this.twitcher = new Twitcher(this.state)
        }
    }

    public get twitcherString(): string {
        return this.twitcher ? this.twitcher.toString() : "no twitcher"
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
    }

    public recycled(instance: FabricInstance, geneData?: IGeneData[]): Gotchi {
        const genome = fromGeneData(geneData ? geneData : this.patch.storedGenes[0])
        const state: IGotchiState = {...this.state, instance, genome, directionHistory: []}
        return new Gotchi(state)
    }

    public getCycleCount(useTwitches: boolean): number {
        return !this.twitcher ? 0 : useTwitches ? Math.floor(this.twitcher.twitchCount / this.state.twitchesPerCycle) : this.twitcher.cycleCount
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
        const nonzero = counts.filter(count => count.count > 0)
        const geneNames = nonzero.map(d => d.dir).map(directionGene)
        const modifierName = Math.random() > 0.95 ? randomModifierName() : undefined
        return this.state.genome.withMutations(geneNames, modifierName).geneData
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
        const instance = this.state.instance
        const view = instance.view
        if (midpoint) {
            midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        }
        if (this.embryo) {
            return true // todo
            // const nextStage = embryo.iterate()
            // const life = embryo.life$.getValue()
            // if (life.stage === Stage.Pretensing && nextStage === Stage.Pretenst) {
            //     embryo.transition = {stage: Stage.Pretenst}
            // } else if (nextStage !== undefined && nextStage !== life.stage && life.stage !== Stage.Pretensing) {
            //     embryo.transition = {stage: nextStage}
            // }
            // switch (nextStage) {
            //     case Stage.Shaping:
            //         if (this.shapingTime <= 0) {
            //             instance.fabric.adopt_lengths()
            //             // const faceIntervals = [...embryo.faceIntervals]
            //             // faceIntervals.forEach(interval => embryo.removeFaceInterval(interval))
            //             // instance.iterate(Stage.Slack)
            //             // instance.iterate(Stage.Pretensing)
            //         } else {
            //             this.shapingTime--
            //         }
            //         return false
            //     case Stage.Pretensing:
            //         return true
            //     case Stage.Pretenst:
            //         extractGotchiFaces(embryo, state.muscles, state.extremities)
            //         embryo.transition = {stage: Stage.Pretenst}
            //         embryo.iterate()
            //         this.embryo = undefined
            //         this.twitcher = new Twitcher(state)
            //         return true
            //     default:
            //         return false
            // }
        } else {
            // instance.iterate(Stage.Pretenst)
            if (this.twitcher) {
                const twitch: Twitch = (m, a, d, n) => this.twitch(m, a, d, n)
                if (this.twitcher.tick(twitch) && this.state.autopilot) {
                    if (this.reachedTarget) {
                        this.direction = Direction.Rest
                    } else {
                        this.checkDirection()
                    }
                }
            }
            return true
        }
    }

    public showFrozen(): void {
        this.instance.showFrozen(this.reachedTarget)
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

    public get reachedTarget(): boolean {
        return this.distanceFromTarget < CLOSE_ENOUGH_TO_TARGET
    }

    public checkDirection(): void {
        const state = this.state
        if (this.reachedTarget) {
            this.direction = Direction.Rest
        } else {
            state.direction = this.directionToTarget
            state.directionHistory.push(state.direction)
        }
    }

    private twitch(muscle: IMuscle, attack: number, decay: number, intensity: number): void {
        this.state.instance.fabric.twitch_face(muscle.faceIndex, attack, decay, intensity)
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

export function oppositeMuscle(muscle: IMuscle, muscles: IMuscle[]): IMuscle {
    const {name, limb, distance} = muscle
    const oppositeFace = FaceName.a
    const findLimb = oppositeLimb(limb)
    const opposite = muscles.find(m => m.limb === findLimb && m.distance === distance && m.faceName === oppositeFace)
    if (!opposite) {
        throw new Error(`Unable to find opposite muscle to ${name}`)
    }
    // console.log(`opposite of ${name} is ${muscles[oppositeIndex].name}`)
    return opposite
}

// function extractGotchiFaces(tensegrity: Tensegrity, muscles: IMuscle[], extremities: IExtremity[]): void {
// tensegrity.brickFaces
//     .filter(face => !face.removed && face.brick.parentFace)
//     .forEach(face => {
//         const gatherAncestors = (f: IBrickFace, faceNames: FaceName[]): Limb => {
//             const definition = BRICK_FACE_DEF[f.faceName]
//             faceNames.push(definition.negative ? definition.opposite : definition.name)
//             const parentFace = f.brick.parentFace
//             if (parentFace) {
//                 return gatherAncestors(parentFace, faceNames)
//             } else {
//                 return limbFromFaceName(f.faceName)
//             }
//         }
//         const identities: FaceName[] = []
//         const limb = gatherAncestors(face, identities)
//         const group = identities.shift()
//         const faceName = face.faceName
//         if (!group) {
//             throw new Error("no top!")
//         }
//         const distance = identities.length
//         const faceIndex = face.index
//         if (isExtremity(group)) {
//             const name = `[${limb}]`
//             extremities.push({faceIndex, name, limb})
//         } else {
//             const name = `[${limb}]:[${distance}:${FaceName[group]}]:{tri=${FaceName[faceName]}}`
//             muscles.push({faceIndex, name, limb, distance, group, faceName})
//         }
//     })
// }

// function isExtremity(faceName: FaceName): boolean {
//     const definition = BRICK_FACE_DEF[faceName]
//     const normalizedFace = definition.negative ? definition.opposite : faceName
//     return normalizedFace === FaceName.PPP
// }
//
// function limbFromFaceName(face: FaceName): Limb {
//     switch (face) {
//         case FaceName.NNN:
//             return Limb.BackLeft
//         case FaceName.PNN:
//             return Limb.BackRight
//         case FaceName.NPP:
//             return Limb.FrontLeft
//         case FaceName.PPP:
//             return Limb.FrontRight
//         default:
//             throw new Error("Strange limb")
//     }
// }

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

export function gotchiNumeric(feature: WorldFeature, defaultValue: number): number {
    switch (feature) {
        case WorldFeature.IterationsPerFrame:
            return defaultValue * 2
        case WorldFeature.Gravity:
            return defaultValue
        case WorldFeature.Drag:
            return defaultValue * 5
        case WorldFeature.PretensingCountdown:
            return defaultValue * 0.5
        case WorldFeature.PretenstFactor:
            return defaultValue
        case WorldFeature.PushOverPull:
            return 0.25
        default:
            return defaultValue
    }
}

export function treeNumeric(feature: WorldFeature, defaultValue: number): number {
    switch (feature) {
        case WorldFeature.Gravity:
            return defaultValue * 5
        case WorldFeature.IntervalCountdown:
            return defaultValue * 0.1
        case WorldFeature.Antigravity:
            return defaultValue * 0.3
        case WorldFeature.Drag:
            return 0
        case WorldFeature.PretenstFactor:
            return defaultValue * 5
        case WorldFeature.PretensingCountdown:
            return defaultValue * 0.02
        default:
            return defaultValue
    }
}
