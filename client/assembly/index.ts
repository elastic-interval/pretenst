declare function logBoolean(idx: u32, b: boolean): void;

declare function logFloat(idx: u32, f: f32): void;

declare function logInt(idx: u32, i: i32): void;

const ERROR: usize = 65535;
const LATERALITY_SIZE: usize = sizeof<u8>();
const INTERVAL_ROLE_SIZE: usize = sizeof<i16>();
const JOINT_NAME_SIZE: usize = sizeof<u16>();
const INDEX_SIZE: usize = sizeof<u16>();
const SPAN_VARIATION_SIZE: usize = sizeof<i16>();
const FLOAT_SIZE: usize = sizeof<f32>();
const AGE_SIZE: usize = sizeof<u32>();
const VECTOR_SIZE: usize = FLOAT_SIZE * 3;
const METADATA_SIZE: usize = VECTOR_SIZE * 3;

const JOINT_RADIUS: f32 = 0.15;
const AMBIENT_JOINT_MASS: f32 = 0.1;
const SPRING_SMOOTH: f32 = 0.03; // const BAR_SMOOTH: f32 = 0.6; const CABLE_SMOOTH: f32 = 0.01;

const BILATERAL_MIDDLE: u8 = 0;
const BILATERAL_RIGHT: u8 = 1;
const BILATERAL_LEFT: u8 = 2;

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
let rolesOffset: usize = 0;

let projectionPtr: usize = 0;
let alphaProjectionPtr: usize = 0;
let omegaProjectionPtr: usize = 0;
let gravPtr: usize = 0;
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
    let rolesSize = ROLE_COUNT * ROLES_SIZE;
    // offsets
    let bytes = (
        agePtr = (
            gravPtr = (
                omegaProjectionPtr = (
                    alphaProjectionPtr = (
                        projectionPtr = (
                            rolesOffset = (
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
                        ) + rolesSize
                    ) + VECTOR_SIZE
                ) + VECTOR_SIZE
            ) + VECTOR_SIZE
        ) + VECTOR_SIZE
    ) + AGE_SIZE;
    let blocks = bytes >> 16;
    memory.grow(blocks + 1);
    for (let roleIndex: u16 = 0; roleIndex < ROLE_COUNT; roleIndex++) {
        initRole(roleIndex);
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

export function roles(): usize {
    return ROLE_COUNT;
}

export function nextJointTag(): u16 {
    jointTagCount++;
    return jointTagCount;
}

// Peek and Poke ================================================================================

@inline()
export function getAge(): i32 {
    return load<i32>(agePtr);
}

export function age(): i32 {
    return getAge();
}

@inline()
function timePasses(): void {
    store<i32>(agePtr, getAge() + 1);
}

@inline()
function getSpanVariation(vPtr: usize): i16 {
    return load<i16>(vPtr);
}

@inline()
function setSpanVariation(vPtr: usize, variation: i16): void {
    store<i16>(vPtr, variation);
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

const JOINT_SIZE: usize = VECTOR_SIZE * 5 + LATERALITY_SIZE + JOINT_NAME_SIZE + FLOAT_SIZE * 2;

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
    if (jointCount + 1 >= jointCountMax) {
        return ERROR;
    }
    let jointIndex = jointCount++;
    setAll(locationPtr(jointIndex), x, y, z);
    zero(forcePtr(jointIndex));
    zero(velocityPtr(jointIndex));
    zero(gravityPtr(jointIndex));
    zero(absorbVelocityPtr(jointIndex));
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
    setVector(gravityPtr(jointIndex), gravityPtr(nextIndex));
    setVector(absorbVelocityPtr(jointIndex), absorbVelocityPtr(nextIndex));
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

function absorbVelocityPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 2;
}

function forcePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 3;
}

function gravityPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 4;
}

function intervalMassPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 5;
}

function altitudePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE;
}

function setJointLaterality(jointIndex: u16, laterality: u8): void {
    store<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2, laterality);
}

export function getJointLaterality(jointIndex: u16): u8 {
    return load<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2);
}

function setJointTag(jointIndex: u16, tag: u16): void {
    store<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + LATERALITY_SIZE, tag);
}

export function getJointTag(jointIndex: u16): u16 {
    return load<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + LATERALITY_SIZE);
}

export function centralize(altitude: f32, intensity: f32): f32 {
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
        setX(jPtr, getX(jPtr) - x * intensity);
        if (altitude >= 0) {
            setY(jPtr, getY(jPtr) + altitude - lowY);
        }
        setZ(jPtr, getZ(jPtr) - z * intensity);
    }
    return altitude - lowY;
}

// Intervals =====================================================================================

const INTERVAL_SIZE: usize = INTERVAL_ROLE_SIZE + INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE * 2;

export function createInterval(intervalRole: i16, alphaIndex: u16, omegaIndex: u16, idealSpan: f32): usize {
    if (intervalCount + 1 >= intervalCountMax) {
        return ERROR;
    }
    let intervalIndex = intervalCount++;
    setIntervalRole(intervalIndex, intervalRole);
    setAlphaIndex(intervalIndex, alphaIndex);
    setOmegaIndex(intervalIndex, omegaIndex);
    setFloat(idealSpanPtr(intervalIndex), idealSpan > 0 ? idealSpan : calculateSpan(intervalIndex));
    return intervalIndex;
}

function copyIntervalFromOffset(intervalIndex: u16, offset: u16): void {
    let nextIndex = intervalIndex + offset;
    setIntervalRole(intervalIndex, getIntervalRole(nextIndex));
    setAlphaIndex(intervalIndex, getAlphaIndex(nextIndex));
    setOmegaIndex(intervalIndex, getOmegaIndex(nextIndex));
    setFloat(idealSpanPtr(intervalIndex), getFloat(idealSpanPtr(nextIndex)));
}

function intervalPtr(intervalIndex: u16): usize {
    return intervalOffset + intervalIndex * INTERVAL_SIZE;
}

export function getIntervalRole(intervalIndex: u16): i16 {
    return load<i16>(intervalPtr(intervalIndex));
}

function getIntervalRoleIndex(intervalIndex: u16): u16 {
    let intervalRole = getIntervalRole(intervalIndex);
    return intervalRole < 0 ? -intervalRole : intervalRole;
}

export function setIntervalRole(intervalIndex: u16, intervalRole: i16): void {
    store<i16>(intervalPtr(intervalIndex), intervalRole);
}

function getAlphaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + INTERVAL_ROLE_SIZE);
}

function setAlphaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + INTERVAL_ROLE_SIZE, v);
}

function getOmegaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + INTERVAL_ROLE_SIZE + INDEX_SIZE);
}

function setOmegaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + INTERVAL_ROLE_SIZE + INDEX_SIZE, v);
}

function unitPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INTERVAL_ROLE_SIZE + INDEX_SIZE + INDEX_SIZE;
}

function stressPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INTERVAL_ROLE_SIZE + INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE;
}

function idealSpanPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INTERVAL_ROLE_SIZE + INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE + FLOAT_SIZE;
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

// Roles =====================================================================================

// note the first two roles are reserved, and their states not really used.

const ROLE_STATE_COUNT: u8 = 3;
const ROLE_COUNT: u16 = 64;
const ROLES_RESERVED: u8 = 2;
const ROLE_STATIC: i16 = 0;
const ROLE_GROWING: i16 = 1;
const ROLES_SIZE: usize = INDEX_SIZE + (INDEX_SIZE + SPAN_VARIATION_SIZE) * ROLE_STATE_COUNT;
const SPAN_VARIATION_MAX: f32 = 0.5;

function rolePtr(roleIndex: u16): usize {
    return rolesOffset + roleIndex * ROLES_SIZE;
}

function getRoleTimeSweep(roleIndex: u16): u16 {
    return getIndex(rolePtr(roleIndex));
}

function setRoleTimeSweep(roleIndex: u16, v: u16): void {
    setIndex(rolePtr(roleIndex), v);
}

function roleTimePtr(roleIndex: u16, stateIndex: u8): usize {
    return rolePtr(roleIndex) + INDEX_SIZE + stateIndex * (INDEX_SIZE + SPAN_VARIATION_SIZE);
}

function getRoleTime(roleIndex: u16, stateIndex: u8): u16 {
    return getIndex(roleTimePtr(roleIndex, stateIndex));
}

function roleSpanVariationPtr(roleIndex: u16, stateIndex: u8): u32 {
    return roleTimePtr(roleIndex, stateIndex) + INDEX_SIZE;
}

function initRole(roleIndex: u16): void {
    setRoleTimeSweep(roleIndex, 0);
}

function getRoleSpanVariationFloat(intervalRole: i16, stateIndex: u8): f32 {
    let oppositeRole = intervalRole < 0;
    let roleIndex = oppositeRole ? -intervalRole : intervalRole;
    let variationInt = getSpanVariation(roleSpanVariationPtr(roleIndex, stateIndex));
    let variationFloat = <f32>variationInt / (oppositeRole ? -32767 : 32767);
    return 1.0 + SPAN_VARIATION_MAX * variationFloat;
}

function sortRoleStates(roleIndex: u16): void {
    let unsorted = ROLE_STATE_COUNT;
    while (true) {
        unsorted--;
        for (let scan: u8 = 0; scan < unsorted; scan++) {
            let t0 = roleTimePtr(roleIndex, scan);
            let time0 = getIndex(t0);
            let t1 = roleTimePtr(roleIndex, scan + 1);
            let time1 = getIndex(t1);
            if (time0 > time1) {
                setIndex(t0, time1);
                setIndex(t1, time0);
                let s0 = roleSpanVariationPtr(roleIndex, scan);
                let spanVariation0 = getSpanVariation(s0);
                let s1 = roleSpanVariationPtr(roleIndex, scan + 1);
                let spanVariation1 = getSpanVariation(s1);
                setSpanVariation(s0, spanVariation1);
                setSpanVariation(s1, spanVariation0);
            }
        }
        if (unsorted == 0) {
            break;
        }
    }
}

function interpolateCurrentSpan(intervalIndex: u16): f32 {
    let intervalRoleIndex = getIntervalRoleIndex(intervalIndex);
    let timeSweep = getRoleTimeSweep(intervalRoleIndex);
    let intervalRole = getIntervalRole(intervalIndex);
    let idealSpan = getFloat(idealSpanPtr(intervalIndex));
    if (intervalRole === ROLE_STATIC) {
        return idealSpan;
    }
    if (intervalRole === ROLE_GROWING) {
        if (timeSweep === 0) { // done growing
            setIntervalRole(intervalIndex, ROLE_STATIC); // back to static
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
    let beforeTime: u16 = 0;
    let beforeVariation: f32 = 1;
    let variationNumber: u8 = 0;
    while (variationNumber < ROLE_STATE_COUNT) {
        let roleTime = getRoleTime(intervalRoleIndex, variationNumber);
        if (roleTime < timeSweep) {
            beforeTime = roleTime;
            beforeVariation = getRoleSpanVariationFloat(intervalRole, variationNumber);
        }
        variationNumber++;
    }
    let afterTime: u16 = 65535;
    let afterVariation: f32 = 1;
    variationNumber = ROLE_STATE_COUNT;
    while (true) {
        let roleTime = getRoleTime(intervalRoleIndex, variationNumber);
        if (roleTime > timeSweep) {
            afterTime = roleTime;
            afterVariation = getRoleSpanVariationFloat(intervalRole, variationNumber);
        }
        if (variationNumber === 0) {
            break;
        }
        variationNumber--;
    }
    let timeSpan = <f32>(afterTime - beforeTime);
    let currentVariation =
        <f32>(timeSweep - beforeTime) / timeSpan * afterVariation +
        <f32>(afterTime - timeSweep) / timeSpan * beforeVariation;
    // if (timeSweep > 0) {
    //     logInt(timeSweep, intervalRole);
    //     logFloat(timeSweep, beforeVariation);
    //     logFloat(timeSweep, afterVariation);
    // }
    return idealSpan * currentVariation;
}

export function triggerRole(roleIndex: u16): void {
    setRoleTimeSweep(roleIndex, 1);
}

export function setRoleState(roleIndex: u16, stateIndex: u8, time: u16, variation: i16): void {
    setIndex(roleTimePtr(roleIndex, stateIndex), time);
    setSpanVariation(roleSpanVariationPtr(roleIndex, stateIndex), variation);
}

export function prepareRoles(): void {
    for (let roleIndex: u16 = 0; roleIndex < ROLE_COUNT; roleIndex++) {
        sortRoleStates(roleIndex);
    }
}

// Physics =====================================================================================

@inline
function abs(val: f32): f32 {
    return val < 0 ? -val : val;
}

function elastic(intervalIndex: u16, elasticFactor: f32): void {
    let idealSpan = interpolateCurrentSpan(intervalIndex);
    let stress = elasticFactor * (calculateSpan(intervalIndex) - idealSpan) * idealSpan * idealSpan;
    addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2);
    addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2);
    if (getRoleTimeSweep(getIntervalRoleIndex(intervalIndex)) !== 1) {
        setFloat(stressPtr(intervalIndex), stress);
    }
    let mass = idealSpan * idealSpan * idealSpan;
    let alphaMass = intervalMassPtr(getAlphaIndex(intervalIndex));
    setFloat(alphaMass, getFloat(alphaMass) + mass / 2);
    let omegaMass = intervalMassPtr(getOmegaIndex(intervalIndex));
    setFloat(omegaMass, getFloat(omegaMass) + mass / 2);
}

function advanceTimeSweep(roleIndex: u16, timeIndexStep: u16): void {
    let timeSweep = getRoleTimeSweep(roleIndex);
    if (timeSweep > 0) {
        let currentTimeIndex = timeSweep;
        timeSweep += timeIndexStep;
        if (timeSweep < currentTimeIndex) { // wrap around
            timeSweep = 0;
        }
        setRoleTimeSweep(roleIndex, timeSweep);
    }
}

function splitVectors(vectorPtr: usize, basisPtr: usize, projectionPtr: usize, howMuch: f32): void {
    let agreement = dot(vectorPtr, basisPtr);
    setVector(projectionPtr, basisPtr);
    multiplyScalar(projectionPtr, agreement * howMuch);
}

function smoothVelocity(intervalIndex: u16): void {
    splitVectors(velocityPtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), alphaProjectionPtr, SPRING_SMOOTH);
    splitVectors(velocityPtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), omegaProjectionPtr, SPRING_SMOOTH);
    addVectors(projectionPtr, alphaProjectionPtr, omegaProjectionPtr);
    multiplyScalar(projectionPtr, 0.5);
    sub(absorbVelocityPtr(getAlphaIndex(intervalIndex)), alphaProjectionPtr);
    sub(absorbVelocityPtr(getOmegaIndex(intervalIndex)), omegaProjectionPtr);
    add(absorbVelocityPtr(getAlphaIndex(intervalIndex)), projectionPtr);
    add(absorbVelocityPtr(getOmegaIndex(intervalIndex)), projectionPtr);
}

function exertGravity(jointIndex: u16, value: f32): void {
    let velocity = velocityPtr(jointIndex);
    setY(velocity, getY(velocity) - value);
}

function exertJointPhysics(jointIndex: u16, overGravity: f32, overDrag: f32, underGravity: f32, underDrag: f32): void {
    let altitude = getY(locationPtr(jointIndex));
    if (altitude > JOINT_RADIUS) {
        exertGravity(jointIndex, overGravity);
        multiplyScalar(velocityPtr(jointIndex), 1 - overDrag);
    }
    else if (altitude < -JOINT_RADIUS) {
        exertGravity(jointIndex, -overDrag * underGravity);
        multiplyScalar(velocityPtr(jointIndex), 1 - overDrag * underDrag);
    }
    else {
        let degree = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2);
        let gravityValue = overGravity * degree + -overGravity * underGravity * (1 - degree);
        exertGravity(jointIndex, gravityValue);
        let drag = overDrag * degree + overDrag * underDrag * (1 - degree);
        multiplyScalar(velocityPtr(jointIndex), 1 - drag);
    }
}

function tick(elasticFactor: f32, overGravity: f32, overDrag: f32, underGravity: f32, underDrag: f32, timeSweepStep: u16, hanging: boolean): void {
    timePasses();
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        elastic(thisInterval, elasticFactor);
    }
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        smoothVelocity(thisInterval);
    }
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        exertJointPhysics(thisJoint, overGravity, overDrag, underGravity, underDrag);
        addScaledVector(velocityPtr(thisJoint), forcePtr(thisJoint), 1.0 / getFloat(intervalMassPtr(thisJoint)));
        zero(forcePtr(thisJoint));
        add(velocityPtr(thisJoint), absorbVelocityPtr(thisJoint));
        zero(absorbVelocityPtr(thisJoint));
    }
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        let alphaAltitude = getFloat(altitudePtr(getAlphaIndex(thisInterval)));
        let omegaAltitude = getFloat(altitudePtr(getOmegaIndex(thisInterval)));
        let straddle = (alphaAltitude > 0 && omegaAltitude <= 0) || (alphaAltitude <= 0 && omegaAltitude > 0);
        if (straddle) {
            let absAlphaAltitude = abs(alphaAltitude);
            let absOmegaAltitude = abs(omegaAltitude);
            let totalAltitude = absAlphaAltitude + absOmegaAltitude;
            if (totalAltitude > 0.001) {
                setVector(gravPtr, gravityPtr(getAlphaIndex(thisInterval)));
                lerp(gravPtr, gravityPtr(getOmegaIndex(thisInterval)), absOmegaAltitude / totalAltitude);
            }
            else {
                addVectors(gravPtr, gravityPtr(getAlphaIndex(thisInterval)), gravityPtr(getAlphaIndex(thisInterval)));
                multiplyScalar(gravPtr, 0.5);
            }
        }
        else {
            addVectors(gravPtr, gravityPtr(getAlphaIndex(thisInterval)), gravityPtr(getAlphaIndex(thisInterval)));
            multiplyScalar(gravPtr, 0.5);
        }
        add(velocityPtr(getAlphaIndex(thisInterval)), gravPtr);
        add(velocityPtr(getOmegaIndex(thisInterval)), gravPtr);
    }
    for (let thisJoint: u16 = hanging ? 1 : 0; thisJoint < jointCount; thisJoint++) {
        add(locationPtr(thisJoint), velocityPtr(thisJoint));
        setFloat(intervalMassPtr(thisJoint), AMBIENT_JOINT_MASS);
    }
    for (let roleIndex: u16 = 0; roleIndex < ROLE_COUNT; roleIndex++) {
        advanceTimeSweep(roleIndex, timeSweepStep);
    }
}

const AIR_DRAG: f32 = 0.0002;
const AIR_GRAVITY: f32 = 0.000002;
const LAND_DRAG: f32 = 200;
const LAND_GRAVITY: f32 = 30;
const ELASTIC_FACTOR: f32 = 0.2;
const STRESS_MAX: f32 = 0.001;

export function iterate(ticks: usize, timeSweepStep: u16, hanging: boolean): u16 {
    let airDrag = AIR_DRAG * (hanging ? 4 : 1);
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        tick(ELASTIC_FACTOR, AIR_GRAVITY, airDrag, LAND_GRAVITY, LAND_DRAG, timeSweepStep, hanging);
    }
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setVector(outputAlphaLocationPtr(intervalIndex), locationPtr(getAlphaIndex(intervalIndex)));
        setVector(outputOmegaLocationPtr(intervalIndex), locationPtr(getOmegaIndex(intervalIndex)));
        let stress: f32 = 0;
        if (getRoleTimeSweep(getIntervalRoleIndex(intervalIndex)) !== ROLE_GROWING) {
            stress = getFloat(stressPtr(intervalIndex)) / STRESS_MAX;
            if (stress > 1) {
                stress = 1;
            } else if (stress < -1) {
                stress = -1;
            }
        }
        let red: f32 = 0.6 + -stress * 0.4;
        let green: f32 = 0;
        let blue: f32 = 0.6 + stress * 0.4;
        setAll(outputAlphaColorPtr(intervalIndex), red, green, blue);
        setAll(outputOmegaColorPtr(intervalIndex), red, green, blue);
    }
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex);
    }
    let maxTimeSweep: u16 = 0;
    for (let roleIndex: u16 = 0; roleIndex < ROLE_COUNT; roleIndex++) {
        let timeSweep = getRoleTimeSweep(roleIndex);
        if (timeSweep > maxTimeSweep) {
            maxTimeSweep = timeSweep;
        }
    }
    return maxTimeSweep;
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