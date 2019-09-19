/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export interface IMemory {
    buffer: ArrayBuffer
}

export enum FabricState {
    Rest,
    Forward,
    TurnLeft,
    TurnRight,
    Reverse,
}

export enum IntervalRole {
    Muscle = 0,
    Bar = 1,
    Triangle = 2,
    Ring = 3,
    Cross = 4,
    BowMid = 5,
    BowEndLow = 6,
    BowEndHigh = 7,
}

export enum Laterality {
    Middle = 0,
    RightSide = 1,
    LeftSide = 2,
}

export enum GlobalFeature {
    GravityAbove = 0,
    GravityBelowLand = 1,
    GravityBelowWater = 2,
    DragAbove = 3,
    DragBelowLand = 4,
    DragBelowWater = 5,
    LengthVariationSpeed = 6,
    PushElastic = 7,
    PullElastic = 8,
}

export const SEED_CORNERS = 5
export const SEED_RADIUS = 1

export interface IFabricDimensions {
    instanceMax: number,
    jointCountMax: number,
    intervalCountMax: number,
    faceCountMax: number,
}

export interface IFabricEngine {

    memory: IMemory

    setGlobalFeature(globalFeature: GlobalFeature, factor: number): number

    init(joints: number, intervals: number, faces: number, instances: number): number

    setInstance(index: number): void

    cloneInstance(fromIndex: number, index: number): void

    // below methods use instance index

    reset(): void

    getAge(): number

    isGestating(): boolean

    setGestating(countdown: number): void

    getCurrentState(): FabricState

    getNextState(): FabricState

    setNextState(state: FabricState): void

    iterate(ticks: number): boolean

    centralize(): void

    setAltitude(altitude: number): number

    getRoleLength(intervalRole: IntervalRole): number

    setRoleLength(intervalRole: IntervalRole, factor: number): void

    nextJointTag(): number

    getJointCount(): number

    createJoint(jointTag: number, laterality: Laterality, x: number, y: number, z: number): number

    getJointTag(jointIndex: number): number

    getJointLaterality(jointIndex: number): number

    getIntervalCount(): number

    createInterval(alphaIndex: number, omegaIndex: number, intervalRole: IntervalRole): number

    changeRestIntervalRole(intervalIndex: number, intervalRole: IntervalRole): void

    changeRestLength(intervalIndex: number, length: number): void

    removeInterval(intervalIndex: number): void

    findOppositeIntervalIndex(intervalIndex: number): number

    setIntervalStateLength(intervalIndex: number, state: FabricState, length: number): void

    getFaceCount(): number

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number

    removeFace(faceIndex: number): void

    findOppositeFaceIndex(faceIndex: number): number

    getFaceJointIndex(faceIndex: number, jointNumber: number): number
}
