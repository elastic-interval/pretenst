/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export interface IMemory {
    buffer: ArrayBuffer
}

export enum Direction {
    REST,
    FORWARD,
    LEFT,
    RIGHT,
    REVERSE,
}

export enum IntervalRole {
    MUSCLE = 0,
    BAR = 1,
    TRIANGLE = 2,
    RING = 3,
    CROSS = 4,
    BOW_MID = 5,
    BOW_END = 6,
}

export enum Laterality {
    BILATERAL_MIDDLE = 0,
    BILATERAL_RIGHT = 1,
    BILATERAL_LEFT = 2,
}

export const SEED_CORNERS = 5
export const SEED_RADIUS = 1

export interface IFabricDimensions {
    instanceMax: number,
    jointCountMax: number,
    intervalCountMax: number,
    faceCountMax: number,
}

export interface IFabricExports {

    memory: IMemory

    setDragAbove(factor: number): number

    setGravityAbove(factor: number): number

    setDragBelowLand(factor: number): number

    setGravityBelowLand(factor: number): number

    setDragBelowWater(factor: number): number

    setGravityBelowWater(factor: number): number

    setGlobalElasticFactor(factor: number): number

    setMaxSpanVariation(factor: number): number

    setSpanVariationSpeed(factor: number): number

    init(joints: number, intervals: number, faces: number, instances: number): number

    setInstance(index: number): void

    cloneInstance(fromIndex: number, index: number): void

    // below methods use instance index

    reset(): void

    getAge(): number

    isGestating(): boolean

    endGestation(): void

    getCurrentDirection(): Direction

    getNextDirection(): Direction

    setNextDirection(direction: Direction): void

    iterate(ticks: number): boolean

    centralize(): void

    setAltitude(altitude: number): number

    setElasticFactor(intervalRole: IntervalRole, factor: number): number

    nextJointTag(): number

    getJointCount(): number

    createJoint(jointTag: number, laterality: Laterality, x: number, y: number, z: number): number

    getJointTag(jointIndex: number): number

    getJointLaterality(jointIndex: number): number

    getIntervalCount(): number

    createInterval(alphaIndex: number, omegaIndex: number, idealSpan: number, intervalRole: IntervalRole, growing: boolean): number

    setIntervalRole(intervalIndex: number, intervalRole: IntervalRole): void

    setIntervalIdealSpan(intervalIndex: number, span: number): void

    multiplyAdjacentIdealSpan(jointIndex: number, bar: boolean, factor: number): void

    multiplyIntervalIdealSpan(intervalIndex: number, factor: number): void

    multiplyFaceIdealSpan(faceIndex: number, factor: number): void

    removeInterval(intervalIndex: number): void

    findOppositeIntervalIndex(intervalIndex: number): number

    setIntervalHighLow(intervalIndex: number, direction: Direction, highLow: number): void

    getFaceCount(): number

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number

    removeFace(faceIndex: number): void

    findOppositeFaceIndex(faceIndex: number): number

    getFaceJointIndex(faceIndex: number, jointNumber: number): number

    getFaceAverageIdealSpan(faceIndex: number): number
}
