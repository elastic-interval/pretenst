/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { LifePhase } from "./life-phase"

export interface IMemory {
    buffer: ArrayBuffer
}

export enum FabricFeature {
    Gravity = 0,
    Drag = 1,
    PushOverPull = 2,
    SlackThreshold = 3,
    BarMass = 4,
    CableMass = 5,
    IntervalBusyTicks = 6,
    PretensingTicks = 7,
    PretensingIntensity = 8,
    TicksPerFrame = 9,
    BarLength = 10,
    TriangleLength = 11,
    RingLength = 12,
    CrossLength = 13,
    BowMidLength = 14,
    BowEndLength = 15,
}

export enum IntervalRole {
    Bar = 0,
    Triangle = 1,
    Ring = 2,
    Cross = 3,
    BowMid = 4,
    BowEnd = 5,
}

export function roleToLengthFeature(intervalRole: IntervalRole): FabricFeature {
    return FabricFeature[FabricFeature[intervalRole + FabricFeature.BarLength]]
}

export enum FabricState {
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
    MinBarStrain = 0,
    MaxBarStrain = 1,
    MinCableStrain = 2,
    MaxCableStrain = 3,
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

    setColoring(bars: boolean, cables: boolean): void

    setInstance(index: number): void

    cloneInstance(fromIndex: number, index: number): void

    getInstanceCount(): number

    // below methods use instance index

    getAge(): number

    setLifePhase(lifePhase: LifePhase, pretenst: number): LifePhase

    getCurrentState(): FabricState

    getNextState(): FabricState

    setNextState(state: FabricState): void

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

    getIntervalStateLength(intervalIndex: number, state: FabricState): number

    setIntervalStateLength(intervalIndex: number, state: FabricState, length: number): void

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
