export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabricExports {

    memory: IMemory;

    init(joints: number, intervals: number, faces: number): number;

    joints(): number;

    intervals(): number;

    faces(): number;

    iterate(ticks: number): void;

    centralize(altitude: number): void;

    nextJointTag(): number;

    createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number;

    getJointTag(jointIndex: number): number;

    getJointLaterality(jointIndex: number): number;

    createInterval(role: number, alphaIndex: number, omegaIndex: number, span: number): number;

    getIntervalRole(intervalIndex: number): number;

    setIntervalRole(intervalIndex: number, role: number): number;

    findOppositeIntervalIndex(intervalIndex: number): number;

    triggerInterval(intervalIndex: number): void;

    createFace(joint0Index: number, joint1Index: number, joint2Index: number, apexJointIndex: number): number;

    removeFace(faceIndex: number): void;

    findOppositeFaceIndex(faceIndex: number): number;

    getFaceJointIndex(faceIndex: number, jointNumber: number): number;

    getFaceAverageIdealSpan(faceIndex: number): number;

    setBehaviorTime(behaviorIndex: number, variationIndex: number, behaviorTime: number): void;

    setBehaviorSpanVariation(behaviorIndex: number, variationIndex: number, behaviorVariation: number): void;
}