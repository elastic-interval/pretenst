export interface IMemory {
    buffer: ArrayBuffer;
}

export interface IFabricExports {

    memory: IMemory;

    setDragAbove(factor: number): number;

    setGravityAbove(factor: number): number;

    setDragBelow(factor: number): number

    setGravityBelow(factor: number): number;

    setElasticFactor(factor: number): number;

    setStiffnessFactor(factor: number): number;

    setMaxSpanVariation(factor: number): number;

    setSpanVariationSpeed(factor: number): number;

    init(joints: number, intervals: number, faces: number): number;

    age(): number;

    iterate(ticks: number, hanging: boolean): number;

    centralize(altitude: number, intensity: number): number;

    removeHanger(): void;

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

    muscleStates(): number;

    setMuscleState(muscleStateIndex: number, spanVariation: number): void;
}