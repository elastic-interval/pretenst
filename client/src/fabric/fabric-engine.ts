/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export interface IMemory {
    buffer: ArrayBuffer
}

export enum LifePhase {
    Busy = 0,
    Growing = 1,
    Shaping = 2,
    Slack = 3,
    Pretensing = 4,
    Pretenst = 5,
}

export function doNotClick(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Slack
}

export function hideSurface(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Shaping || lifePhase === LifePhase.Slack
}

export enum FabricFeature {
    Gravity = 0,
    Drag = 1,
    PretenseFactor = 2,
    PushStrainFactor = 3,

    TicksPerFrame = 4,
    IntervalBusyTicks = 5,
    PretenseTicks = 6,

    PushLength = 7,
    TriangleLength = 8,
    RingLength = 9,
    CrossLength = 10,
    BowMidLength = 11,
    BowEndLength = 12,
}

export enum IntervalRole {
    Push = 0,
    Triangle = 1,
    Ring = 2,
    Cross = 3,
    BowMid = 4,
    BowEnd = 5,
    FacePull = 6,
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
