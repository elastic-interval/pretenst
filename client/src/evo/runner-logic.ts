/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"

import { FabricInstance } from "../fabric/fabric-instance"
import { FaceName } from "../fabric/tensegrity-types"

import { GeneName, Genome } from "./genome"
import { Patch } from "./patch"

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
    group: FaceName
    faceName: FaceName
}

export enum Limb {
    FrontLeft = "front-left",
    FrontRight = "front-right",
    BackLeft = "back-left",
    BackRight = "back-right",
}

export interface IRunnerState {
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

export function freshRunnerState(patch: Patch, instance: FabricInstance, genome: Genome): IRunnerState {
    return <IRunnerState>{
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

// function extractRunnerFaces(tensegrity: Tensegrity, muscles: IMuscle[], extremities: IExtremity[]): void {
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

export function runnerNumeric(feature: WorldFeature, defaultValue: number): number {
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
