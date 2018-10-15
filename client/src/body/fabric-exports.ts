export interface IMemory {
    buffer: ArrayBuffer;
}

export enum Direction {
    REST = 0,
    AHEAD = 1,
    LEFT = 2,
    RIGHT = 3
}

export const SEED_CORNERS = 5;

export interface IFabricExports {

    memory: IMemory;

    setDragAbove(factor: number): number;

    setGravityAbove(factor: number): number;

    setDragBelow(factor: number): number

    setGravityBelow(factor: number): number;

    setElasticFactor(factor: number): number;

    setMaxSpanVariation(factor: number): number;

    setSpanVariationSpeed(factor: number): number;

    init(joints: number, intervals: number, faces: number): number;

    age(): number;

    iterate(ticks: number, direction: Direction, intensity: number): number;

    centralize(): void;

    setAltitude(altitude: number): number;

    endGestation(): void;

    nextJointTag(): number;

    joints(): number;

    createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number;

    getJointTag(jointIndex: number): number;

    getJointLaterality(jointIndex: number): number;

    intervals(): number;

    createInterval(intervalMuscle: number, alphaIndex: number, omegaIndex: number, span: number): number;

    getIntervalMuscle(intervalIndex: number): number;

    setIntervalMuscle(intervalIndex: number, intervalMuscle: number): number;

    findOppositeIntervalIndex(intervalIndex: number): number;

    triggerInterval(intervalIndex: number): void;

    faces(): number;

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number;

    removeFace(faceIndex: number): void;

    findOppositeFaceIndex(faceIndex: number): number;

    getFaceJointIndex(faceIndex: number, jointNumber: number): number;

    getFaceAverageIdealSpan(faceIndex: number): number;

    muscles(): number;

    setMuscleHighLow(muscleIndex: number, direction:number, highLow: number): void;
}