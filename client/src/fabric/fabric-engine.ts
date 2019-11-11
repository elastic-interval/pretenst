/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { LifePhase } from "./fabric-state"

export interface IMemory {
    buffer: ArrayBuffer
}

export enum FabricFeature {
    Gravity = 0,
    Drag = 1,
    PretenseFactor = 2,
    PushStrainFactor = 3,
    PushPullDifferential = 4,

    TicksPerFrame = 5,
    IntervalBusyTicks = 6,
    PretenseTicks = 7,

    PretenseIntensity = 8,
    SlackThreshold = 9,
    RadiusFactor = 10,
    MaxStiffness = 11,

    PushLength = 12,
    TriangleLength = 13,
    RingLength = 14,
    CrossLength = 15,
    BowMidLength = 16,
    BowEndLength = 17,
}

export enum IntervalRole {
    Push = 0,
    Triangle = 1,
    Ring = 2,
    Cross = 3,
    BowMid = 4,
    BowEnd = 5,
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
    Sticky = 0,
    Bouncy = 1,
    Slippery = 2,
    Frozen = 3,
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

    initInstance(): LifePhase

    finishGrowing(): LifePhase

    getAge(): number

    getCurrentState(): FabricDirection

    getNextState(): FabricDirection

    setNextState(state: FabricDirection): void

    iterate(ticks: number, nextLifePhase: LifePhase): LifePhase

    centralize(): void

    setAltitude(altitude: number): number

    nextJointTag(): number

    getJointCount(): number

    createJoint(jointTag: number, laterality: Laterality, x: number, y: number, z: number): number

    getJointTag(jointIndex: number): number

    getJointLaterality(jointIndex: number): number

    getIntervalCount(): number

    createInterval(alphaIndex: number, omegaIndex: number, intervalRole: IntervalRole, restLength: number, stiffness: number, linearDensity: number): number

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

    _stiffnesses(): number

    _linearDensities(): number

    _fabricFeatures(): number

}
