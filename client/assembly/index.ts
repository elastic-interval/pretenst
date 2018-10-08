declare function logBoolean(idx: u32, b: boolean): void;

declare function logFloat(idx: u32, f: f32): void;

declare function logInt(idx: u32, i: i32): void;

const ERROR: usize = 65535;
const LATERALITY_SIZE: usize = sizeof<u8>();
const INTERVAL_MUSCLE_SIZE: usize = sizeof<i16>();
const JOINT_NAME_SIZE: usize = sizeof<u16>();
const INDEX_SIZE: usize = sizeof<u16>();
const MUSCLE_HIGHLOW_SIZE: usize = sizeof<u8>();
const FLOAT_SIZE: usize = sizeof<f32>();
const AGE_SIZE: usize = sizeof<u32>();
const VECTOR_SIZE: usize = FLOAT_SIZE * 3;

const JOINT_RADIUS: f32 = 0.5;
const AMBIENT_JOINT_MASS: f32 = 0.1;

const BILATERAL_MIDDLE: u8 = 0;
const BILATERAL_RIGHT: u8 = 1;
const BILATERAL_LEFT: u8 = 2;

// Physics =====================================================================================

const DRAG_ABOVE: f32 = 0.009539999882690609;
// const DRAG_ABOVE: f32 = 0.00009539999882690609;
const GRAVITY_ABOVE: f32 = 0.000018920998627436347;
const DRAG_BELOW: f32 = 0.9607399702072144;
const GRAVITY_BELOW: f32 = -0.002540299901738763;
const ELASTIC_FACTOR: f32 = 0.5767999887466431;
const MAX_SPAN_VARIATION: f32 = 0.05;
// const MAX_SPAN_VARIATION: f32 = 0.527999997138977;
const TIME_SWEEP_SPEED: f32 = 21.899999618530273;

let physicsDragAbove: f32 = DRAG_ABOVE;

export function setDragAbove(factor: f32): f32 {
    return physicsDragAbove = DRAG_ABOVE * factor;
}

let physicsGravityAbove: f32 = GRAVITY_ABOVE;

export function setGravityAbove(factor: f32): f32 {
    return physicsGravityAbove = GRAVITY_ABOVE * factor;
}

let physicsDragBelow: f32 = DRAG_BELOW;

export function setDragBelow(factor: f32): f32 {
    return physicsDragBelow = DRAG_BELOW * factor;
}

let physicsGravityBelow: f32 = GRAVITY_BELOW;

export function setGravityBelow(factor: f32): f32 {
    return physicsGravityBelow = GRAVITY_BELOW * factor;
}

let physicsElasticFactor: f32 = ELASTIC_FACTOR;

export function setElasticFactor(factor: f32): f32 {
    return physicsElasticFactor = ELASTIC_FACTOR * factor;
}

let maxSpanVariation: f32 = MAX_SPAN_VARIATION;

export function setMaxSpanVariation(factor: f32): f32 {
    return maxSpanVariation = MAX_SPAN_VARIATION * factor;
}

let timeSweepSpeed: f32 = TIME_SWEEP_SPEED;

export function setSpanVariationSpeed(factor: f32): f32 {
    return timeSweepSpeed = TIME_SWEEP_SPEED * factor;
}

const STRESS_MAX: f32 = 0.001;

// Dimensioning ================================================================================

let jointCount: u16 = 0;
let jointCountMax: u16 = 0;
let jointTagCount: u16 = 0;
let intervalCount: u16 = 0;
let intervalCountMax: u16 = 0;
let faceCount: u16 = 0;
let faceCountMax: u16 = 0;

let lineLocationOffset: usize = 0;
let lineColorOffset: usize = 0;
let jointOffset: usize = 0;
let faceMidpointOffset: usize = 0;
let faceNormalOffset: usize = 0;
let faceLocationOffset: usize = 0;
let intervalOffset: usize = 0;
let faceOffset: usize = 0;
let muscleOffset: usize = 0;

let projectionPtr: usize = 0;
let alphaProjectionPtr: usize = 0;
let omegaProjectionPtr: usize = 0;
let midpointPtr: usize = 0;
let agePtr: usize = 0;

export function init(joints: u16, intervals: u16, faces: u16): usize {
    jointCountMax = joints;
    intervalCountMax = intervals;
    faceCountMax = faces;
    let intervalLinesSize = intervalCountMax * VECTOR_SIZE * 2;
    let intervalColorsSize = intervalLinesSize;
    let faceVectorsSize = faceCountMax * VECTOR_SIZE;
    let faceJointVectorsSize = faceVectorsSize * 3;
    let jointsSize = jointCountMax * JOINT_SIZE;
    let intervalsSize = intervalCountMax * INTERVAL_SIZE;
    let facesSize = faceCountMax * FACE_SIZE;
    let musclesSize = MUSCLE_COUNT * MUSCLE_HIGHLOW_SIZE * MUSCLE_DIRECTIONS;
    // offsets
    let bytes = (
        agePtr = (
            midpointPtr = (
                omegaProjectionPtr = (
                    alphaProjectionPtr = (
                        projectionPtr = (
                            muscleOffset = (
                                faceOffset = (
                                    intervalOffset = (
                                        jointOffset = (
                                            faceLocationOffset = (
                                                faceNormalOffset = (
                                                    faceMidpointOffset = (
                                                        lineColorOffset = (
                                                            lineLocationOffset
                                                        ) + intervalLinesSize
                                                    ) + intervalColorsSize
                                                ) + faceVectorsSize
                                            ) + faceJointVectorsSize
                                        ) + faceJointVectorsSize
                                    ) + jointsSize
                                ) + intervalsSize
                            ) + facesSize
                        ) + musclesSize
                    ) + VECTOR_SIZE
                ) + VECTOR_SIZE
            ) + VECTOR_SIZE
        ) + VECTOR_SIZE
    ) + AGE_SIZE;
    let blocks = bytes >> 16;
    memory.grow(blocks + 1);
    for (let muscleIndex: u16 = 0; muscleIndex < MUSCLE_COUNT; muscleIndex++) {
        for (let direction: u8 = 0; direction < MUSCLE_COUNT; direction++) {
            setMuscleHighLow(muscleIndex, direction, 0x08);
        }
    }
    return bytes;
}

export function joints(): usize {
    return jointCount;
}

export function intervals(): usize {
    return intervalCount;
}

export function faces(): usize {
    return faceCount;
}

export function muscles(): usize {
    return MUSCLE_COUNT;
}

export function nextJointTag(): u16 {
    jointTagCount++;
    return jointTagCount;
}

export function removeHanger(): void {
    jointCount--;
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        copyJointFromNext(jointIndex)
    }
    intervalCount -= 2;
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        copyIntervalFromOffset(intervalIndex, 2);
    }
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setAlphaIndex(intervalIndex, getAlphaIndex(intervalIndex) - 1);
        setOmegaIndex(intervalIndex, getOmegaIndex(intervalIndex) - 1);
    }
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        for (let jointNumber: u16 = 0; jointNumber < 3; jointNumber++) {
            let jointIndex = getFaceJointIndex(faceIndex, jointNumber);
            setFaceJointIndex(faceIndex, jointNumber, jointIndex - 1);
        }
    }
}

// Peek and Poke ================================================================================

@inline()
function getAge(): u32 {
    return load<u32>(agePtr);
}

export function age(): u32 {
    return getAge();
}

@inline()
function timePasses(ticks: usize): void {
    store<u32>(agePtr, getAge() + ticks);
}

@inline()
function getHighLow(vPtr: usize): u8 {
    return load<u8>(vPtr);
}

@inline()
function setHighLow(vPtr: usize, highLow: u8): void {
    store<u8>(vPtr, highLow);
}

@inline()
function getIndex(vPtr: usize): u16 {
    return load<u16>(vPtr);
}

@inline()
function setIndex(vPtr: usize, index: u16): void {
    store<u16>(vPtr, index);
}

@inline()
function getFloat(vPtr: usize): f32 {
    return load<f32>(vPtr);
}

@inline()
function setFloat(vPtr: usize, v: f32): void {
    store<f32>(vPtr, v);
}

@inline()
function getX(vPtr: usize): f32 {
    return load<f32>(vPtr);
}

@inline()
function setX(vPtr: usize, v: f32): void {
    store<f32>(vPtr, v);
}

@inline()
function getY(vPtr: usize): f32 {
    return load<f32>(vPtr + FLOAT_SIZE);
}

@inline()
function setY(vPtr: usize, v: f32): void {
    store<f32>(vPtr + FLOAT_SIZE, v);
}

@inline()
function getZ(vPtr: usize): f32 {
    return load<f32>(vPtr + FLOAT_SIZE * 2);
}

@inline()
function setZ(vPtr: usize, v: f32): void {
    store<f32>(vPtr + FLOAT_SIZE * 2, v);
}

// Vector3 ================================================================================

function setAll(vPtr: usize, x: f32, y: f32, z: f32): void {
    setX(vPtr, x);
    setY(vPtr, y);
    setZ(vPtr, z);
}

function setVector(vPtr: usize, v: usize): void {
    setX(vPtr, getX(v));
    setY(vPtr, getY(v));
    setZ(vPtr, getZ(v));
}

function zero(vPtr: usize): void {
    setAll(vPtr, 0, 0, 0);
}

function addVectors(vPtr: usize, a: usize, b: usize): void {
    setX(vPtr, getX(a) + getX(b));
    setY(vPtr, getY(a) + getY(b));
    setZ(vPtr, getZ(a) + getZ(b));
}

function subVectors(vPtr: usize, a: usize, b: usize): void {
    setX(vPtr, getX(a) - getX(b));
    setY(vPtr, getY(a) - getY(b));
    setZ(vPtr, getZ(a) - getZ(b));
}

function add(vPtr: usize, v: usize): void {
    setX(vPtr, getX(vPtr) + getX(v));
    setY(vPtr, getY(vPtr) + getY(v));
    setZ(vPtr, getZ(vPtr) + getZ(v));
}

function sub(vPtr: usize, v: usize): void {
    setX(vPtr, getX(vPtr) - getX(v));
    setY(vPtr, getY(vPtr) - getY(v));
    setZ(vPtr, getZ(vPtr) - getZ(v));
}

function addScaledVector(vPtr: usize, v: usize, s: f32): void {
    setX(vPtr, getX(vPtr) + getX(v) * s);
    setY(vPtr, getY(vPtr) + getY(v) * s);
    setZ(vPtr, getZ(vPtr) + getZ(v) * s);
}

function multiplyScalar(vPtr: usize, s: f32): void {
    setX(vPtr, getX(vPtr) * s);
    setY(vPtr, getY(vPtr) * s);
    setZ(vPtr, getZ(vPtr) * s);
}

function dot(vPtr: usize, v: usize): f32 {
    return getX(vPtr) * getX(v) + getY(vPtr) * getY(v) + getZ(vPtr) * getZ(v);
}

function lerp(vPtr: usize, v: usize, interpolation: f32): void {
    let antiInterpolation = <f32>1.0 - interpolation;
    setX(vPtr, getX(vPtr) * antiInterpolation + getX(v) * interpolation);
    setY(vPtr, getY(vPtr) * antiInterpolation + getY(v) * interpolation);
    setX(vPtr, getZ(vPtr) * antiInterpolation + getZ(v) * interpolation);
}

function quadrance(vPtr: usize): f32 {
    let x = getX(vPtr);
    let y = getY(vPtr);
    let z = getZ(vPtr);
    return x * x + y * y + z * z + 0.00000001;
}

function distance(a: usize, b: usize): f32 {
    let dx = getX(a) - getX(b);
    let dy = getY(a) - getY(b);
    let dz = getZ(a) - getZ(b);
    return <f32>Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function length(vPtr: usize): f32 {
    return <f32>Math.sqrt(quadrance(vPtr));
}

function crossVectors(vPtr: usize, a: usize, b: usize): void {
    let ax = getX(a);
    let ay = getY(a);
    let az = getZ(a);
    let bx = getX(b);
    let by = getY(b);
    let bz = getZ(b);
    setX(vPtr, ay * bz - az * by);
    setY(vPtr, az * bx - ax * bz);
    setZ(vPtr, ax * by - ay * bx);
}

// Joints =====================================================================================

const JOINT_SIZE: usize = VECTOR_SIZE * 3 + LATERALITY_SIZE + JOINT_NAME_SIZE + FLOAT_SIZE * 2;

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
    if (jointCount + 1 >= jointCountMax) {
        return ERROR;
    }
    let jointIndex = jointCount++;
    setAll(locationPtr(jointIndex), x, y, z);
    zero(forcePtr(jointIndex));
    zero(velocityPtr(jointIndex));
    setFloat(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS);
    setJointLaterality(jointIndex, laterality);
    setJointTag(jointIndex, jointTag);
    return jointIndex;
}

function copyJointFromNext(jointIndex: u16): void {
    let nextIndex = jointIndex + 1;
    setVector(locationPtr(jointIndex), locationPtr(nextIndex));
    setVector(forcePtr(jointIndex), forcePtr(nextIndex));
    setVector(velocityPtr(jointIndex), velocityPtr(nextIndex));
    setFloat(intervalMassPtr(jointIndex), getFloat(intervalMassPtr(nextIndex)));
    setJointLaterality(jointIndex, getJointLaterality(nextIndex));
    setJointTag(jointIndex, getJointTag(nextIndex));
}

function jointPtr(jointIndex: u16): usize {
    return jointOffset + jointIndex * JOINT_SIZE;
}

function locationPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex);
}

function velocityPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE;
}

function forcePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 2;
}

function intervalMassPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 3;
}

function altitudePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 3 + FLOAT_SIZE;
}

function setJointLaterality(jointIndex: u16, laterality: u8): void {
    store<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 3 + FLOAT_SIZE * 2, laterality);
}

export function getJointLaterality(jointIndex: u16): u8 {
    return load<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 3 + FLOAT_SIZE * 2);
}

function setJointTag(jointIndex: u16, tag: u16): void {
    store<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 3 + FLOAT_SIZE * 2 + LATERALITY_SIZE, tag);
}

export function getJointTag(jointIndex: u16): u16 {
    return load<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 3 + FLOAT_SIZE * 2 + LATERALITY_SIZE);
}

export function centralize(): void {
    let x: f32 = 0;
    let lowY: f32 = 10000;
    let z: f32 = 0;
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        x += getX(jointPtr(thisJoint));
        let y = getY(jointPtr(thisJoint));
        if (y < lowY) {
            lowY = y;
        }
        z += getZ(jointPtr(thisJoint));
    }
    x = x / <f32>jointCount;
    z = z / <f32>jointCount;
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = jointPtr(thisJoint);
        setX(jPtr, getX(jPtr) - x);
        setZ(jPtr, getZ(jPtr) - z);
    }
}

export function setAltitude(altitude: f32): f32 {
    let lowY: f32 = 10000;
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let y = getY(jointPtr(thisJoint));
        if (y < lowY) {
            lowY = y;
        }
    }
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = jointPtr(thisJoint);
        setY(jPtr, getY(jPtr) + altitude - lowY);
    }
    return altitude - lowY;
}

// Intervals =====================================================================================

const INTERVAL_SIZE: usize = INTERVAL_MUSCLE_SIZE + INDEX_SIZE * 3 + VECTOR_SIZE + FLOAT_SIZE * 2;
const INTERVAL_MUSCLE_STATIC: i16 = -32767;
const INTERVAL_MUSCLE_GROWING: i16 = -32766;

export function createInterval(intervalMuscle: i16, alphaIndex: u16, omegaIndex: u16, idealSpan: f32): usize {
    if (intervalCount + 1 >= intervalCountMax) {
        return ERROR;
    }
    let intervalIndex = intervalCount++;
    setIntervalMuscle(intervalIndex, intervalMuscle);
    setTimeSweep(intervalIndex, 0);
    setAlphaIndex(intervalIndex, alphaIndex);
    setOmegaIndex(intervalIndex, omegaIndex);
    setFloat(idealSpanPtr(intervalIndex), idealSpan > 0 ? idealSpan : calculateSpan(intervalIndex));
    return intervalIndex;
}

function copyIntervalFromOffset(intervalIndex: u16, offset: u16): void {
    let nextIndex = intervalIndex + offset;
    setIntervalMuscle(intervalIndex, getIntervalMuscle(nextIndex));
    setTimeSweep(intervalIndex, getTimeSweep(nextIndex));
    setAlphaIndex(intervalIndex, getAlphaIndex(nextIndex));
    setOmegaIndex(intervalIndex, getOmegaIndex(nextIndex));
    setFloat(idealSpanPtr(intervalIndex), getFloat(idealSpanPtr(nextIndex)));
}

function intervalPtr(intervalIndex: u16): usize {
    return intervalOffset + intervalIndex * INTERVAL_SIZE;
}

export function getIntervalMuscle(intervalIndex: u16): i16 {
    return load<i16>(intervalPtr(intervalIndex));
}

function getIntervalMuscleIndex(intervalIndex: u16): u16 {
    let intervalMuscle = getIntervalMuscle(intervalIndex);
    return intervalMuscle < 0 ? -intervalMuscle : intervalMuscle;
}

export function setIntervalMuscle(intervalIndex: u16, intervalMuscle: i16): void {
    store<i16>(intervalPtr(intervalIndex), intervalMuscle);
}

function getTimeSweep(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE);
}

function setTimeSweep(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE, v);
}

export function triggerInterval(intervalIndex: u16): void {
    setTimeSweep(intervalIndex, 1);
}

function getAlphaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE + INDEX_SIZE);
}

function setAlphaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE + INDEX_SIZE, v);
}

function getOmegaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE + INDEX_SIZE + INDEX_SIZE);
}

function setOmegaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE + INDEX_SIZE + INDEX_SIZE, v);
}

function unitPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE + INDEX_SIZE + INDEX_SIZE + INDEX_SIZE;
}

function stressPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE + INDEX_SIZE + INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE;
}

function idealSpanPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INTERVAL_MUSCLE_SIZE + INDEX_SIZE + INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE + FLOAT_SIZE;
}

function calculateSpan(intervalIndex: u16): f32 {
    let unit = unitPtr(intervalIndex);
    subVectors(unit, locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)));
    let span = length(unit);
    multiplyScalar(unit, 1 / span);
    return span;
}

function findIntervalIndex(joint0: u16, joint1: u16): u16 {
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        let alpha = getAlphaIndex(thisInterval);
        let omega = getOmegaIndex(thisInterval);
        if (alpha === joint0 && omega === joint1 || alpha === joint1 && omega === joint0) {
            return thisInterval;
        }
    }
    return intervalCountMax;
}

export function findOppositeIntervalIndex(intervalIndex: u16): u16 {
    let tagAlpha = getJointTag(getAlphaIndex(intervalIndex));
    let tagOmega = getJointTag(getOmegaIndex(intervalIndex));
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        if (thisInterval == intervalIndex) {
            continue;
        }
        let thisTagAlpha = getJointTag(getAlphaIndex(thisInterval));
        let thisTagOmega = getJointTag(getOmegaIndex(thisInterval));
        let matchAlpha = tagAlpha === thisTagAlpha || tagAlpha === thisTagOmega;
        let matchOmega = tagOmega === thisTagOmega || tagOmega === thisTagAlpha;
        if (matchAlpha && matchOmega) {
            return thisInterval;
        }
    }
    return intervalCountMax;
}

// Lines depicting the intervals ================================================================

const LINE_SIZE: usize = VECTOR_SIZE * 2;

function outputAlphaLocationPtr(intervalIndex: u16): usize {
    return intervalIndex * LINE_SIZE;
}

function outputOmegaLocationPtr(intervalIndex: u16): usize {
    return intervalIndex * LINE_SIZE + VECTOR_SIZE;
}

function outputAlphaColorPtr(intervalIndex: u16): usize {
    return lineColorOffset + intervalIndex * LINE_SIZE;
}

function outputOmegaColorPtr(intervalIndex: u16): usize {
    return lineColorOffset + intervalIndex * LINE_SIZE + VECTOR_SIZE;
}

// Faces =====================================================================================

const FACE_SIZE: usize = INDEX_SIZE * 3;

function facePtr(faceIndex: u16): usize {
    return faceOffset + faceIndex * FACE_SIZE;
}

export function getFaceJointIndex(faceIndex: u16, jointNumber: usize): u16 {
    return getIndex(facePtr(faceIndex) + jointNumber * INDEX_SIZE);
}

function setFaceJointIndex(faceIndex: u16, jointNumber: u16, v: u16): void {
    setIndex(facePtr(faceIndex) + jointNumber * INDEX_SIZE, v);
}

function getFaceTag(faceIndex: u16, jointNumber: u16): u16 {
    return getJointTag(getFaceJointIndex(faceIndex, jointNumber));
}

function outputMidpointPtr(faceIndex: u16): usize {
    return faceMidpointOffset + faceIndex * VECTOR_SIZE;
}

function outputNormalPtr(faceIndex: u16, jointNumber: u16): usize {
    return faceNormalOffset + (faceIndex * 3 + jointNumber) * VECTOR_SIZE;
}

function outputLocationPtr(faceIndex: u16, jointNumber: u16): usize {
    return faceLocationOffset + (faceIndex * 3 + jointNumber) * VECTOR_SIZE;
}

export function getFaceLaterality(faceIndex: u16): u8 {
    for (let jointWalk: u16 = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
        let jointLaterality = getJointLaterality(getFaceJointIndex(faceIndex, jointWalk));
        if (jointLaterality !== BILATERAL_MIDDLE) {
            return jointLaterality;
        }
    }
    return BILATERAL_MIDDLE;
}

function pushNormalTowardsJoint(normal: usize, location: usize, midpoint: usize): void {
    subVectors(projectionPtr, location, midpoint);
    multiplyScalar(projectionPtr, 1 / length(projectionPtr));
    addScaledVector(normal, projectionPtr, 0.7);
    multiplyScalar(normal, 1 / length(normal));
}

export function getFaceAverageIdealSpan(faceIndex: u16): f32 {
    let joint0 = getFaceJointIndex(faceIndex, 0);
    let joint1 = getFaceJointIndex(faceIndex, 1);
    let joint2 = getFaceJointIndex(faceIndex, 2);
    let interval0 = findIntervalIndex(joint0, joint1);
    let interval1 = findIntervalIndex(joint1, joint2);
    let interval2 = findIntervalIndex(joint2, joint0);
    let ideal0 = getFloat(idealSpanPtr(interval0));
    let ideal1 = getFloat(idealSpanPtr(interval1));
    let ideal2 = getFloat(idealSpanPtr(interval2));
    return (ideal0 + ideal1 + ideal2) / 3;
}

// Triangles and normals depicting the faces =================================================

function outputFaceGeometry(faceIndex: u16): void {
    let loc0 = locationPtr(getFaceJointIndex(faceIndex, 0));
    let loc1 = locationPtr(getFaceJointIndex(faceIndex, 1));
    let loc2 = locationPtr(getFaceJointIndex(faceIndex, 2));
    // output the locations for rendering triangles
    setVector(outputLocationPtr(faceIndex, 0), loc0);
    setVector(outputLocationPtr(faceIndex, 1), loc1);
    setVector(outputLocationPtr(faceIndex, 2), loc2);
    // midpoint
    let midpoint = outputMidpointPtr(faceIndex);
    zero(midpoint);
    add(midpoint, loc0);
    add(midpoint, loc1);
    add(midpoint, loc2);
    multiplyScalar(midpoint, 1 / 3.0);
    // normals for each vertex
    let normal0 = outputNormalPtr(faceIndex, 0);
    let normal1 = outputNormalPtr(faceIndex, 1);
    let normal2 = outputNormalPtr(faceIndex, 2);
    subVectors(alphaProjectionPtr, loc1, loc0);
    subVectors(omegaProjectionPtr, loc2, loc0);
    crossVectors(normal0, alphaProjectionPtr, omegaProjectionPtr);
    multiplyScalar(normal0, 1 / length(normal0));
    setVector(normal1, normal0);
    setVector(normal2, normal0);
    // adjust them
    pushNormalTowardsJoint(normal0, loc0, midpoint);
    pushNormalTowardsJoint(normal1, loc1, midpoint);
    pushNormalTowardsJoint(normal2, loc2, midpoint);
}

export function findOppositeFaceIndex(faceIndex: u16): u16 {
    let tag0 = getFaceTag(faceIndex, 0);
    let tag1 = getFaceTag(faceIndex, 1);
    let tag2 = getFaceTag(faceIndex, 2);
    for (let thisFace: u16 = 0; thisFace < faceCount; thisFace++) {
        if (thisFace == faceIndex) {
            continue;
        }
        let thisTag0 = getFaceTag(thisFace, 0);
        let thisTag1 = getFaceTag(thisFace, 1);
        let thisTag2 = getFaceTag(thisFace, 2);
        let match0 = tag0 === thisTag0 || tag0 === thisTag1 || tag0 === thisTag2;
        let match1 = tag1 === thisTag0 || tag1 === thisTag1 || tag1 === thisTag2;
        let match2 = tag2 === thisTag0 || tag2 === thisTag1 || tag2 === thisTag2;
        if (match0 && match1 && match2) {
            return thisFace;
        }
    }
    return faceCount + 1;
}

export function createFace(joint0Index: u16, joint1Index: u16, joint2Index: u16): usize {
    if (faceCount + 1 >= faceCountMax) {
        return ERROR;
    }
    let faceIndex = faceCount++;
    setFaceJointIndex(faceIndex, 0, joint0Index);
    setFaceJointIndex(faceIndex, 1, joint1Index);
    setFaceJointIndex(faceIndex, 2, joint2Index);
    outputFaceGeometry(faceIndex);
    return faceIndex;
}

export function removeFace(deadFaceIndex: u16): void {
    for (let faceIndex: u16 = deadFaceIndex; faceIndex < faceCount - 1; faceIndex++) {
        let nextFace = faceIndex + 1;
        setFaceJointIndex(faceIndex, 0, getFaceJointIndex(nextFace, 0));
        setFaceJointIndex(faceIndex, 1, getFaceJointIndex(nextFace, 1));
        setFaceJointIndex(faceIndex, 2, getFaceJointIndex(nextFace, 2));
        outputFaceGeometry(faceIndex);
    }
    faceCount--;
}

// Muscles =====================================================================================

const MUSCLE_COUNT: u16 = 64;
const REST = <f32>1.0;
const MUSCLE_DIRECTIONS: u8 = 4;
const CLOCK_POINTS: u8 = 16;

function musclePtr(muscleIndex: u16, direction: u8): usize {
    return muscleOffset + muscleIndex * MUSCLE_DIRECTIONS + direction;
}

export function setMuscleHighLow(muscleIndex: u16, direction: u8, highLow: u8): void {
    setHighLow(musclePtr(muscleIndex, direction), highLow);
}

function advance(clockPoint: u32): u32 {
    return clockPoint + 65536;
}

function getMuscleSpanVariationFloat(muscleIndex: u16, direction: u8, timeSweep: u16, reverse: boolean, log: boolean): f32 {
    let highLow: u8 = getHighLow(musclePtr(muscleIndex, direction));
    let highClockPoint: u32 = <u32>(highLow / CLOCK_POINTS) << 12; // [0...(65536*15/16)]
    let lowClockPoint: u32 = <u32>(highLow % CLOCK_POINTS) << 12;
    if (highClockPoint === lowClockPoint) {
        lowClockPoint += 1 << 12;
    }
    let pointsFromHigh: u32;
    let pointsFromLow: u32;
    if (timeSweep === lowClockPoint) {
        pointsFromHigh = 1;
        pointsFromLow = 0;
    } else if (timeSweep === highClockPoint) {
        pointsFromHigh = 0;
        pointsFromLow = 1;
    } else if (lowClockPoint < highClockPoint) {
        // L-H
        if (timeSweep > lowClockPoint) {
            if (timeSweep < highClockPoint) {
                // L-t-H
                pointsFromLow = timeSweep - lowClockPoint;
                pointsFromHigh = highClockPoint - timeSweep;
            } else {
                // L-H-t (H-t-L)
                pointsFromLow = advance(lowClockPoint) - timeSweep;
                pointsFromHigh = timeSweep - highClockPoint;
            }
        } else {
            // t-L-H (L-H-t)
            pointsFromLow = lowClockPoint - timeSweep;
            pointsFromHigh = advance(timeSweep) - highClockPoint;
        }
    } else {
        // H-L
        if (timeSweep > highClockPoint) {
            if (timeSweep < lowClockPoint) {
                // H-t-L
                pointsFromHigh = timeSweep - highClockPoint;
                pointsFromLow = lowClockPoint - timeSweep;
            } else {
                // H-L-t (L-t-H)
                pointsFromHigh = advance(highClockPoint) - timeSweep;
                pointsFromLow = timeSweep - lowClockPoint;
            }
        } else {
            // t-H-L (H-L-t)
            pointsFromHigh = highClockPoint - timeSweep;
            pointsFromLow = advance(timeSweep) - lowClockPoint;
        }
    }
    let both: u32 = pointsFromHigh + pointsFromLow;
    let lowToHigh: f32 = <f32>both;
    let degreeHigh = <f32>pointsFromLow / lowToHigh;
    let degreeLow = <f32>pointsFromHigh / lowToHigh;
    if (log) {
        logInt(1, pointsFromLow);
        logInt(2, pointsFromHigh);
        logInt(3, both);
        logFloat(4, lowToHigh);
        logFloat(5, degreeHigh);
        logFloat(6, degreeLow);
    }
    return REST + (reverse ? -REST : REST) * (degreeHigh * maxSpanVariation + degreeLow * -maxSpanVariation);
}

function interpolateCurrentSpan(intervalIndex: u16, direction: u8): f32 {
    let timeSweep = getTimeSweep(intervalIndex);
    let intervalMuscle = getIntervalMuscle(intervalIndex);
    let idealSpan = getFloat(idealSpanPtr(intervalIndex));
    if (intervalMuscle === INTERVAL_MUSCLE_STATIC) {
        return idealSpan;
    }
    if (intervalMuscle === INTERVAL_MUSCLE_GROWING) {
        if (timeSweep === 0) { // done growing
            setIntervalMuscle(intervalIndex, INTERVAL_MUSCLE_STATIC); // back to static
            return idealSpan;
        } else { // busy growing
            let originalSpan: f32 = 1;
            if (timeSweep === 1) { // just triggered now, store span in stress (cheating)
                originalSpan = calculateSpan(intervalIndex);
                setFloat(stressPtr(intervalIndex), originalSpan);
            } else {
                originalSpan = getFloat(stressPtr(intervalIndex));
            }
            let progress = <f32>timeSweep / 65536;
            return originalSpan * (1 - progress) + idealSpan * progress;
        }
    }
    let opposingMuscle: boolean = (intervalMuscle < 0);
    let muscleIndex: u16 = opposingMuscle ? -intervalMuscle : intervalMuscle;
    return idealSpan * getMuscleSpanVariationFloat(muscleIndex, direction, timeSweep, opposingMuscle, false);
}

// Physics =====================================================================================

@inline
function abs(val: f32): f32 {
    return val < 0 ? -val : val;
}

function elastic(intervalIndex: u16, elasticFactor: f32, direction: u8): void {
    let idealSpan = interpolateCurrentSpan(intervalIndex, direction);
    let stress = elasticFactor * (calculateSpan(intervalIndex) - idealSpan) * idealSpan * idealSpan;
    addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2);
    addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2);
    if (getTimeSweep(intervalIndex) !== 1) {
        setFloat(stressPtr(intervalIndex), stress);
    }
    let mass = idealSpan * idealSpan * idealSpan;
    let alphaMass = intervalMassPtr(getAlphaIndex(intervalIndex));
    setFloat(alphaMass, getFloat(alphaMass) + mass / 2);
    let omegaMass = intervalMassPtr(getOmegaIndex(intervalIndex));
    setFloat(omegaMass, getFloat(omegaMass) + mass / 2);
}

function advanceTimeSweep(intervalIndex: u16, timeSweepStep: u16): u16 {
    let timeSweep = getTimeSweep(intervalIndex);
    if (timeSweep > 0) {
        let currentTimeIndex = timeSweep;
        timeSweep += timeSweepStep;
        if (timeSweep < currentTimeIndex) { // wrap around
            timeSweep = 0;
        }
        setTimeSweep(intervalIndex, timeSweep);
    }
    return timeSweep;
}

function exertJointPhysics(jointIndex: u16, dragAbove: f32): void {
    let velocityVectorPtr = velocityPtr(jointIndex);
    let velocityY = getY(velocityVectorPtr);
    let altitude = getY(locationPtr(jointIndex));
    if (altitude > JOINT_RADIUS) {
        setY(velocityVectorPtr, getY(velocityVectorPtr) - physicsGravityAbove);
        multiplyScalar(velocityPtr(jointIndex), 1 - dragAbove);
    }
    else if (altitude > -JOINT_RADIUS) {
        let degreeAbove: f32 = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2);
        let degreeBelow: f32 = 1.0 - degreeAbove;
        if (velocityY < 0) {
            multiplyScalar(velocityVectorPtr, degreeAbove); // zero at the bottom
        }
        let gravityValue: f32 = physicsGravityAbove * degreeAbove + physicsGravityBelow * degreeBelow;
        setY(velocityVectorPtr, getY(velocityVectorPtr) - gravityValue);
        let drag = dragAbove * degreeAbove + physicsDragBelow * degreeBelow;
        multiplyScalar(velocityPtr(jointIndex), 1 - drag);
    }
    else {
        if (velocityY < 0) {
            zero(velocityVectorPtr);
        } else {
            setY(velocityVectorPtr, velocityY - physicsGravityBelow);
        }
        multiplyScalar(velocityPtr(jointIndex), 1 - physicsDragBelow);
    }
}

function tick(timeSweepStep: u16, direction: u8, hanging: boolean): u16 {
    let maxTimeSweep: u16 = 0;
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        elastic(intervalIndex, hanging ? physicsElasticFactor * 0.1 : physicsElasticFactor, direction);
        let timeSweep = advanceTimeSweep(intervalIndex, timeSweepStep);
        if (timeSweep > maxTimeSweep) {
            maxTimeSweep = timeSweep;
        }
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        exertJointPhysics(jointIndex, physicsDragAbove * (hanging ? 50 : 1));
        addScaledVector(velocityPtr(jointIndex), forcePtr(jointIndex), 1.0 / getFloat(intervalMassPtr(jointIndex)));
        zero(forcePtr(jointIndex));
    }
    for (let jointIndex: u16 = hanging ? 1 : 0; jointIndex < jointCount; jointIndex++) {
        add(locationPtr(jointIndex), velocityPtr(jointIndex));
        setFloat(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS);
    }
    return maxTimeSweep;
}

export function iterate(ticks: usize, direction: u8, hanging: boolean): u16 {
    let timeSweepStep: u16 = <u16>timeSweepSpeed;
    if (hanging) {
        timeSweepStep *= 3;
    }
    let maxTimeSweep: u16 = 0;
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        let tickMaxTimeSweep = tick(timeSweepStep, direction, hanging);
        if (tickMaxTimeSweep > maxTimeSweep) {
            maxTimeSweep = tickMaxTimeSweep;
        }
    }
    timePasses(ticks);
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setVector(outputAlphaLocationPtr(intervalIndex), locationPtr(getAlphaIndex(intervalIndex)));
        setVector(outputOmegaLocationPtr(intervalIndex), locationPtr(getOmegaIndex(intervalIndex)));
        let stress: f32 = 0;
        if (getTimeSweep(intervalIndex) !== INTERVAL_MUSCLE_GROWING) {
            stress = getFloat(stressPtr(intervalIndex)) / STRESS_MAX;
            if (stress > 1) {
                stress = 1;
            } else if (stress < -1) {
                stress = -1;
            }
        }
        let red: f32 = 0.8 + -stress * 0.2;
        let green: f32 = 0.5;
        let blue: f32 = 0.8 + stress * 0.2;
        setAll(outputAlphaColorPtr(intervalIndex), red, green, blue);
        setAll(outputOmegaColorPtr(intervalIndex), red, green, blue);
    }
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex);
    }
    zero(midpointPtr);
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(midpointPtr, locationPtr(jointIndex));
    }
    multiplyScalar(midpointPtr, 1.0 / <f32>jointCount);
    return maxTimeSweep;
}

