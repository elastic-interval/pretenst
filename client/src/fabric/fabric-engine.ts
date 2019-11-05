
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { LifePhase } from "./fabric-state"

export interface IMemory {
    buffer: ArrayBuffer
}

export enum FabricFeature {
    TicksPerFrame = 0,
    Gravity = 1,
    PushMass = 2,
    PullMass = 3,
    Drag = 4,
    SlackThreshold = 5,
    PushMaxElastic = 6,
    PullMaxElastic = 7,
    IntervalBusyTicks = 8,
    PretenseTicks = 9,
    PretenseIntensity = 10,
    PushLength = 11,
    TriangleLength = 12,
    RingLength = 13,
    BowMidLength = 14,
    BowEndLength = 15,
}

export enum IntervalRole {
    Push = 0,
    Triangle = 1,
    Ring = 2,
    BowMid = 3,
    BowEnd = 4,
}

export function roleToLengthFeature(intervalRole: IntervalRole): FabricFeature {
    return FabricFeature[FabricFeature[intervalRole + FabricFeature.PushLength]]
}

export function lengthFeatureToRole(fabricFeature: FabricFeature): IntervalRole | undefined {
    const roleIndex: number = fabricFeature - FabricFeature.PushLength
    if (roleIndex < 0 || roleIndex > IntervalRole.BowEnd) {
        return undefined
    }
    return IntervalRole[IntervalRole[roleIndex]]
}

export enum FabricDirection {
    Rest,
    Forward,
    TurnLeft,
    TurnRight,
    Reverse,
}

export enum Laterality {
    Middle = 0,
    RightSide = 1,
    LeftSide = 2,
}

export enum Limit {
    MinPushStrain = 0,
    MaxPushStrain = 1,
    MinPullStrain = 2,
    MaxPullStrain = 3,
}

export enum SurfaceCharacter {
    Bouncy = 0,
    Slippery = 1,
    Sticky = 2,
    Frozen = 4,
}

export interface IFabricEngine {

    memory: IMemory

    init(): number

    setSurfaceCharacter(character: SurfaceCharacter): void

    getLimit(limit: Limit): number

    setColoring(pushes: boolean, pulls: boolean): void

    setInstance(index: number): void

    cloneInstance(fromIndex: number, index: number): void

    getInstanceCount(): number

    // below methods use instance index

    getAge(): number

    setLifePhase(lifePhase: LifePhase, pretenst: number): LifePhase

    getCurrentState(): FabricDirection

    getNextState(): FabricDirection

    setNextState(state: FabricDirection): void

    iterate(ticks: number): boolean

    centralize(): void

    setAltitude(altitude: number): number

    nextJointTag(): number

    getJointCount(): number

    createJoint(jointTag: number, laterality: Laterality, x: number, y: number, z: number): number

    getJointTag(jointIndex: number): number

    getJointLaterality(jointIndex: number): number

    getIntervalCount(): number

    createInterval(alphaIndex: number, omegaIndex: number, intervalRole: IntervalRole, restLength: number, elasticFactor: number): number

    setIntervalRole(intervalIndex: number, intervalRole: IntervalRole): void

    changeRestLength(intervalIndex: number, length: number): void

    multiplyRestLength(intervalIndex: number, length: number): void

    removeInterval(intervalIndex: number): void

    findOppositeIntervalIndex(intervalIndex: number): number

    getIntervalStateLength(intervalIndex: number, state: FabricDirection): number

    setIntervalStateLength(intervalIndex: number, state: FabricDirection, length: number): void

    getFaceCount(): number

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number

    removeFace(faceIndex: number): void

    findOppositeFaceIndex(faceIndex: number): number

    getFaceJointIndex(faceIndex: number, jointNumber: number): number

    // these methods give addresses for buffer access

    _fabricOffset(): number

    _midpoint(): number

    _lineLocations(): number

    _lineColors(): number

    _faceMidpoints(): number

    _faceNormals(): number

    _faceLocations(): number

    _jointLocations(): number

    _intervalUnits(): number

    _intervalStrains(): number

    _elasticFactors(): number

    _fabricFeatures(): number

}
