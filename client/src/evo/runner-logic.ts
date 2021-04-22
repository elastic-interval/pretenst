/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"

import { FabricInstance } from "../fabric/fabric-instance"

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

export interface IMuscle {
    intervalIndex: number
    name: string
    distance: number
}

export interface IRunnerState {
    patch: Patch
    targetPatch: Patch
    instance: FabricInstance
    muscles: IMuscle[]
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
