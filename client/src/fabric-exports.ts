export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabricExports {

    memory: IMemory;

    init(joints: number, intervals: number, faces: number): number;

    age(): number;

    joints(): number;

    intervals(): number;

    faces(): number;

    iterate(ticks: number, hanging: boolean): number;

    centralize(altitude: number, intensity: number): number;

    nextJointTag(): number;

    createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number;

    getJointTag(jointIndex: number): number;

    getJointLaterality(jointIndex: number): number;

    createInterval(role: number, alphaIndex: number, omegaIndex: number, span: number): number;

    getIntervalRole(intervalIndex: number): number;

    setIntervalRole(intervalIndex: number, role: number): number;

    findOppositeIntervalIndex(intervalIndex: number): number;

    triggerInterval(intervalIndex: number): void;

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number;

    removeFace(faceIndex: number): void;

    findOppositeFaceIndex(faceIndex: number): number;

    getFaceJointIndex(faceIndex: number, jointNumber: number): number;

    getFaceAverageIdealSpan(faceIndex: number): number;

    setBehaviorTime(behaviorIndex: number, variationIndex: number, behaviorTime: number): void;

    setBehaviorSpanVariation(behaviorIndex: number, variationIndex: number, behaviorVariation: number): void;
}