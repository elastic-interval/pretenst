/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export interface IMemory {
    buffer: ArrayBuffer
}

export enum Stage {
    Busy = 0,
    Growing = 1,
    Shaping = 2,
    Slack = 3,
    Realizing = 4,
    Realized = 6,
}

export function doNotClick(stage: Stage): boolean {
    return stage === Stage.Growing || stage === Stage.Slack
}

export enum FabricFeature {

    Gravity = 0,
    Drag = 1,
    PretenstFactor = 2,
    IterationsPerFrame = 3,
    IntervalCountdown = 4,
    PretenstCountdown = 5,
    FacePullEndZone = 6,
    FacePullOrientationForce = 7,
    SlackThreshold = 8,
    ShapingPretenstFactor = 9,
    ShapingStiffnessFactor = 10,
    ShapingDrag = 11,

    NexusPushLength = 15,
    ColumnPushLength = 16,
    TriangleLength = 17,
    RingLength = 18,
    CrossLength = 19,
    BowMidLength = 20,
    BowEndLength = 21,

    PushOverPull = 25,
    PushRadiusFactor = 26,
    PullRadiusFactor = 27,
    MaxStiffness = 28,
}

export const FEATURE_FLOATS = 30

export const FABRIC_FEATURES: FabricFeature[] = Object.keys(FabricFeature)
    .filter(k => isNaN(parseInt(k, 10)))
    .map(k => FabricFeature[k])

export enum IntervalRole {
    NexusPush = 0,
    ColumnPush = 1,
    Triangle = 2,
    Ring = 3,
    Cross = 4,
    BowMid = 5,
    BowEnd = 6,
    FacePull = 7,
    Shaper = 8,
}

export function isPush(intervalRole: IntervalRole): boolean {
    return intervalRole === IntervalRole.ColumnPush || intervalRole === IntervalRole.NexusPush
}

export function fabricFeatureIntervalRole(fabricFeature: FabricFeature): IntervalRole | undefined {
    const firstLengthFeature = FabricFeature.NexusPushLength
    if (fabricFeature < firstLengthFeature || fabricFeature > FabricFeature.BowEndLength) {
        return undefined
    }
    return IntervalRole[IntervalRole[fabricFeature - firstLengthFeature]]
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
    Frozen = 0,
    Sticky = 1,
    Slippery = 2,
    Bouncy = 3,
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

    initInstance(): Stage

    finishGrowing(): Stage

    getAge(): number

    getCurrentState(): FabricDirection

    getNextState(): FabricDirection

    setNextState(state: FabricDirection): void

    iterate(nextStage: Stage): Stage

    adoptLengths(): Stage

    renderNumbers(): number

    centralize(): void

    setAltitude(altitude: number): number

    nextJointTag(): number

    getJointCount(): number

    createJoint(jointTag: number, laterality: Laterality, x: number, y: number, z: number): number

    getJointTag(jointIndex: number): number

    getJointLaterality(jointIndex: number): number

    getIntervalCount(): number

    createInterval(alphaIndex: number, omegaIndex: number, intervalRole: IntervalRole,
                   restLength: number, stiffness: number, linearDensity: number, countdown: number): number

    setIntervalRole(intervalIndex: number, intervalRole: IntervalRole): void

    changeRestLength(intervalIndex: number, length: number, countdown: number): void

    multiplyRestLength(intervalIndex: number, length: number, countdown: number): void

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

    _jointVelocities(): number

    _intervalUnits(): number

    _intervalStrains(): number

    _intervalStrainNuances(): number

    _stiffnesses(): number

    _linearDensities(): number

    _fabricFeatures(): number

}
