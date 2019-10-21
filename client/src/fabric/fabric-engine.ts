/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole } from "./interval-role"
import { PhysicsFeature } from "./physics-feature"

export interface IMemory {
    buffer: ArrayBuffer
}

export const MAX_INSTANCES = 32
export const SLACK_THRESHOLD = 0.0001

export enum LifePhase {
    Growing = 0,
    Shaping = 1,
    Slack = 2,
    Pretensing = 3,
    Pretenst = 4,
}

export function doNotTouch(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Slack
}

export function hideSurface(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Shaping
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

export interface IFabricEngine {

    memory: IMemory

    init(): number

    setPhysicsFeature(physicsFeature: PhysicsFeature, factor: number): number

    getLimit(limit: Limit): number

    setColoring(bars: boolean, cables: boolean): void

    setInstance(index: number): void

    cloneInstance(fromIndex: number, index: number): void

    // below methods use instance index

    getAge(): number

    setLifePhase(lifePhase: LifePhase, pretenst: number): LifePhase

    getCurrentState(): FabricState

    getNextState(): FabricState

    setNextState(state: FabricState): void

    iterate(ticks: number): boolean

    centralize(): void

    setAltitude(altitude: number, countdown: number): number

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

}
