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

    roles(): number;

    iterate(ticks: number, hanging: boolean): number;

    centralize(altitude: number, intensity: number): number;

    removeHanger(): void;

    nextJointTag(): number;

    createJoint(jointTag: number, laterality: number, x: number, y: number, z: number): number;

    getJointTag(jointIndex: number): number;

    getJointLaterality(jointIndex: number): number;

    createInterval(role: number, alphaIndex: number, omegaIndex: number, span: number): number;

    getIntervalRole(intervalIndex: number): number;

    setIntervalRole(intervalIndex: number, intervalRole: number): number;

    findOppositeIntervalIndex(intervalIndex: number): number;

    createFace(joint0Index: number, joint1Index: number, joint2Index: number): number;

    removeFace(faceIndex: number): void;

    findOppositeFaceIndex(faceIndex: number): number;

    getFaceJointIndex(faceIndex: number, jointNumber: number): number;

    getFaceAverageIdealSpan(faceIndex: number): number;

    setRoleState(roleIndex: number, stateIndex: number, time: number, spanVariation: number): void;

    prepareRoles(): void;

    triggerRole(roleIndex: number): void;
}