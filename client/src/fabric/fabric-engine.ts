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
    MaxStrain = 12,
    VisualStrain = 13,

    NexusPushLength = 20,
    ColumnPushLength = 21,
    TriangleLength = 22,
    RingLength = 23,
    NexusCrossLength = 24,
    ColumnCrossLength = 25,
    BowMidLength = 26,
    BowEndLength = 27,

    PushOverPull = 30,
    PushRadiusFactor = 31,
    PullRadiusFactor = 32,
    MaxStiffness = 33,
}

export const FEATURE_FLOATS = 60

export const FABRIC_FEATURES: FabricFeature[] = Object.keys(FabricFeature)
    .filter(k => isNaN(parseInt(k, 10)))
    .map(k => FabricFeature[k])

export enum IntervalRole {
    NexusPush = 0,
    ColumnPush = 1,
    Triangle = 2,
    Ring = 3,
    NexusCross = 4,
    ColumnCross = 5,
    BowMid = 6,
    BowEnd = 7,
    FacePull = 8,
}

export function intervalRoleName(intervalRole: IntervalRole): string {
    switch (intervalRole) {
        case IntervalRole.NexusPush:
            return "Nex Push"
        case IntervalRole.ColumnPush:
            return "Col Push"
        case IntervalRole.Triangle:
            return "Tri"
        case IntervalRole.Ring:
            return "Ring"
        case IntervalRole.NexusCross:
            return "Nex Cross"
        case IntervalRole.ColumnCross:
            return "Col Cross"
        case IntervalRole.BowMid:
            return "Bow Mid"
        case IntervalRole.BowEnd:
            return "Bow End"
        case IntervalRole.FacePull:
            return "Face Pull"
    }
}

export const INTERVAL_ROLES: IntervalRole[] = Object.keys(IntervalRole)
    .filter(role => role.length > 1 && IntervalRole[role] !== IntervalRole.FacePull)
    .map(role => IntervalRole[role])

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

export function intervalRoleFabricFeature(intervalRole: IntervalRole): FabricFeature {
    return FabricFeature[FabricFeature[intervalRole + FabricFeature.NexusPushLength]]
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

    setPushAndPull(value: boolean): void

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
