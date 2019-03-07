import {Vector3} from "three"

export interface IMemory {
    buffer: ArrayBuffer
}

export enum Direction {
    REST = 0,
    FORWARD = 1,
    LEFT = 2,
    RIGHT = 3,
    REVERSE = 4,
}

export function turn(direction: Direction, right: boolean): Direction {
    switch (direction) {
        case Direction.FORWARD:
            return right ? Direction.RIGHT : Direction.LEFT
        case Direction.REVERSE:
            return right ? Direction.LEFT : Direction.RIGHT
        case Direction.LEFT:
            return right ? Direction.FORWARD : Direction.REVERSE
        case Direction.RIGHT:
            return right ? Direction.REVERSE : Direction.FORWARD
        default:
            return Direction.FORWARD
    }
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

    setElasticFactor(factor: number): number

    setMaxSpanVariation(factor: number): number

    setSpanVariationSpeed(factor: number): number

    init(joints: number, intervals: number, faces: number, instances: number): number

    setInstance(index: number): void

    cloneInstance(fromIndex: number, index: number): void

    // below methods use instance index

    reset(): void

    getAge(): number

    isGestating(): boolean

    getCurrentDirection(): Direction

    setNextDirection(direction: Direction): void

    iterate(ticks: number): boolean

    centralize(): void

    setAltitude(altitude: number): number

    endGestation(): void

    nextJointTag(): number

    getJointCount(): number

    createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number

    getJointTag(jointIndex: number): number

    getJointLaterality(jointIndex: number): number

    getIntervalCount(): number

    createInterval(alphaIndex: number, omegaIndex: number, span: number, growing: boolean): number

    findOppositeIntervalIndex(intervalIndex: number): number

    setIntervalHighLow(intervalIndex: number, direction: Direction, highLow: number): void

    getFaceCount(): number

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number

    removeFace(faceIndex: number): void

    findOppositeFaceIndex(faceIndex: number): number

    getFaceJointIndex(faceIndex: number, jointNumber: number): number

    getFaceAverageIdealSpan(faceIndex: number): number
}

export interface IFabricInstanceExports {

    index: Readonly<number>

    recycle(): void

    freshGeometry(): void

    getDimensions(): IFabricDimensions

    getMidpoint(): Vector3

    getSeed(): Vector3

    getForward(): Vector3

    getRight(): Vector3

    getFaceMidpoints(): Float32Array

    getFaceLocations(): Float32Array

    getFaceNormals(): Float32Array

    getVectors(): Float32Array

    reset(): void

    getAge(): number

    isGestating(): boolean

    getCurrentDirection(): Direction

    setNextDirection(direction: Direction): void

    iterate(ticks: number): boolean

    centralize(): void

    setAltitude(altitude: number): number

    endGestation(): void

    nextJointTag(): number

    getJointCount(): number

    createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number

    getJointTag(jointIndex: number): number

    getJointLaterality(jointIndex: number): number

    getIntervalCount(): number

    createInterval(alphaIndex: number, omegaIndex: number, span: number, growing: boolean): number

    findOppositeIntervalIndex(intervalIndex: number): number

    setIntervalHighLow(intervalIndex: number, direction: Direction, highLow: number): void

    getFaceCount(): number

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number

    removeFace(faceIndex: number): void

    findOppositeFaceIndex(faceIndex: number): number

    getFaceJointIndex(faceIndex: number, jointNumber: number): number

    getFaceAverageIdealSpan(faceIndex: number): number
}
