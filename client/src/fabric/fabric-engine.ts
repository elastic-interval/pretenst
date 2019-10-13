
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export interface IMemory {
    buffer: ArrayBuffer
}

export const MAX_INSTANCES = 32

export enum PhysicsFeature {
    GravityAbove = 0,
    DragAbove = 1,
    AntigravityBelow = 2,
    DragBelow = 3,
    AntigravityBelowWater = 4,
    DragBelowWater = 5,
    PushElastic = 6,
    PullElastic = 7,
    IntervalCountdown = 8,
}

export function notWater(feature?: PhysicsFeature): boolean {
    if (feature === undefined) {
        return false
    }
    return feature !== PhysicsFeature.AntigravityBelowWater && feature !== PhysicsFeature.DragBelowWater
}

export enum IntervalRole {
    Bar = 1,
    Triangle = 2,
    Ring = 3,
    Cross = 4,
    BowMid = 5,
    BowEndLow = 6,
    BowEndHigh = 7,
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
    MinBarDisplacement = 0,
    MaxBarDisplacement = 1,
    MinCableDisplacement = 2,
    MaxCableDisplacement = 3,
}

export interface IFabricEngine {

    memory: IMemory

    setPhysicsFeature(physicsFeature: PhysicsFeature, factor: number): number

    getLimit(limit: Limit): number

    setDisplacementThreshold(selectBars: boolean, selectCables: boolean, greaterThan: boolean, threshold: number): void

    init(): number

    setInstance(index: number): void

    cloneInstance(fromIndex: number, index: number): void

    // below methods use instance index

    extendBusyCountdown(factor: number): void

    reset(): void

    getAge(): number

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

    createInterval(alphaIndex: number, omegaIndex: number, intervalRole: IntervalRole, restLength: number): number

    setElasticFactor(intervalIndex: number, elasticFactor: number): void

    getElasticFactor(intervalIndex: number): number

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

    _fabricOffset(instance: number): number

    _midpoint(): number

    _lineLocations(): number

    _lineColors(): number

    _faceMidpoints(): number

    _faceNormals(): number

    _faceLocations(): number

    _jointLocations(): number

    _intervalUnits(): number

    _intervalDisplacements(): number

}
