declare function logBoolean(idx: u32, b: boolean): void;

declare function logFloat(idx: u32, f: f32): void;

declare function logInt(idx: u32, i: u32): void;

const ROLE_SIZE: usize = sizeof<u8>();
const JOINT_NAME_SIZE: usize = sizeof<u16>();
const INDEX_SIZE: usize = sizeof<u16>();
const SPAN_VARIATION_SIZE: usize = sizeof<i16>();
const FLOAT_SIZE: usize = sizeof<f32>();
const VARIATION_COUNT: u8 = 3;
const VECTOR_SIZE: usize = FLOAT_SIZE * 3;
const METADATA_SIZE: usize = VECTOR_SIZE * 3;

const JOINT_RADIUS: f32 = 0.15;
const AMBIENT_JOINT_MASS: f32 = 0.1;
const SPRING_SMOOTH: f32 = 0.03; // const BAR_SMOOTH: f32 = 0.6; const CABLE_SMOOTH: f32 = 0.01;
const TEMPORARY_TICK_REDUCTION: f32 = 0.01;

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
let behaviorOffset: usize = 0;
let metadataOffset: usize = 0;

let projectionPtr: usize = 0;
let alphaProjectionPtr: usize = 0;
let omegaProjectionPtr: usize = 0;
let gravPtr: usize = 0;

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
    let behaviorSize = ROLE_INDEX_MAX * BEHAVIOR_SIZE;
    let metadataSize = VECTOR_SIZE * 10; // 4 so far
    // offsets
    let bytes = (
        metadataOffset = (
            behaviorOffset = (
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
            ) + behaviorSize
        ) + facesSize
    ) + metadataSize;
    let blocks = bytes >> 16;
    memory.grow(blocks + 1);
    projectionPtr = metadataOffset;
    alphaProjectionPtr = projectionPtr + VECTOR_SIZE;
    omegaProjectionPtr = alphaProjectionPtr + VECTOR_SIZE;
    gravPtr = omegaProjectionPtr + VECTOR_SIZE;
    for (let roleIndex: u8 = 0; roleIndex < ROLE_INDEX_MAX; roleIndex++) {
        initBehavior(roleIndex);
    }
    return bytes;
}

// Peek and Poke ================================================================================

@inline()
function getVariation(vPtr: usize): i16 {
    return load<i16>(vPtr);
}

@inline()
function setVariation(vPtr: usize, variation: i16): void {
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

const JOINT_SIZE: usize = VECTOR_SIZE * 5 + ROLE_SIZE + JOINT_NAME_SIZE + FLOAT_SIZE * 2;

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

function setJointTag(jointIndex: u16, tag: u16): void {
    store<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + ROLE_SIZE, tag);
}

// Intervals =====================================================================================

const INTERVAL_SIZE: usize = ROLE_SIZE + INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE * 2;

function intervalPtr(intervalIndex: u16): usize {
    return intervalOffset + intervalIndex * INTERVAL_SIZE;
}

function getRoleIndex(intervalIndex: u16): u8 {
    return load<u8>(intervalPtr(intervalIndex));
}

function setRoleIndex(intervalIndex: u16, role: u8): void {
    store<u8>(intervalPtr(intervalIndex), role);
}

function getAlphaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + ROLE_SIZE);
}

function setAlphaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + ROLE_SIZE, v);
}

function getOmegaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE);
}

function setOmegaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE, v);
}

function unitPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 2;
}

function stressPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 2 + VECTOR_SIZE;
}

function idealSpanPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE;
}

function calculateSpan(intervalIndex: u16): f32 {
    let unit = unitPtr(intervalIndex);
    subVectors(unit, locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)));
    let span = length(unit);
    multiplyScalar(unit, 1 / span);
    return span;
}

function removeInterval(intervalIndex: u16): void {
    for (let walk: u16 = intervalIndex * <u16>INTERVAL_SIZE; walk < intervalIndex * INTERVAL_SIZE * intervalCount - 1; walk++) {
        store<u8>(walk, load<u8>(walk + INTERVAL_SIZE));
    }
    intervalCount--;
}

function findIntervalIndex(joint0: u16, joint1: u16): u16 {
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        let alpha = getAlphaIndex(thisInterval);
        let omega = getOmegaIndex(thisInterval);
        if (alpha === joint0 && omega === joint1 || alpha === joint1 && omega === joint0) {
            return thisInterval;
        }
    }
    return intervalCount + 1; // should throw an exception somehow?
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

function setJointIndexOfFace(faceIndex: u16, jointNumber: u16, v: u16): void {
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
    addScaledVector(normal, projectionPtr, 0.6);
    multiplyScalar(normal, 1 / length(normal));
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

// Behavior =====================================================================================

const ROLE_INDEX_MAX: u8 = 64;
const BEHAVIOR_SIZE: usize = (INDEX_SIZE + SPAN_VARIATION_SIZE) * VARIATION_COUNT;

function behaviorTimePtr(roleIndex: u16, variationIndex: u8): u32 {
    return behaviorOffset + roleIndex * BEHAVIOR_SIZE + variationIndex * (INDEX_SIZE + SPAN_VARIATION_SIZE);
}

function behaviorSpanVariationPtr(roleIndex: u16, variationIndex: u8): u32 {
    return behaviorOffset + roleIndex * BEHAVIOR_SIZE + variationIndex * (INDEX_SIZE + SPAN_VARIATION_SIZE) + 1;
}

function intervalBehaviorTimePtr(intervalIndex: u16, variationIndex: u8): u32 {
    return behaviorSpanVariationPtr(getRoleIndex(intervalIndex), variationIndex);
}

function intervalBehaviorSpanVariationPtr(intervalIndex: u16, variationIndex: u8): u32 {
    return behaviorTimePtr(getRoleIndex(intervalIndex), variationIndex);
}

function initBehavior(roleIndex: u16): void {
    for (let thisVariation: u8 = 0; thisVariation < VARIATION_COUNT; thisVariation++) {
        setVariation(behaviorSpanVariationPtr(roleIndex, thisVariation), 0);
        setIndex(behaviorTimePtr(roleIndex, thisVariation), 0);
    }
}

function sortVariations(roleIndex: u16): void {
    for (let thisVariation: u8 = 0; thisVariation < VARIATION_COUNT - 1; thisVariation++) {
        let t0 = behaviorTimePtr(roleIndex, thisVariation);
        let time0 = getIndex(t0);
        let t1 = behaviorTimePtr(roleIndex, thisVariation + 1);
        let time1 = getIndex(t0);
        if (time0 > time1) {
            setIndex(t0, time1);
            setIndex(t1, time0);
            let s0 = behaviorSpanVariationPtr(roleIndex, thisVariation);
            let spanVariation0 = getVariation(s0);
            let s1 = behaviorSpanVariationPtr(roleIndex, thisVariation + 1);
            let spanVariation1 = getVariation(s1);
            setVariation(s0, spanVariation1);
            setVariation(s1, spanVariation0);
        }
    }
}

function getSpanVariation(roleIndex: u8, timeIndex: u16): f32 {
    for (let thisVariation: u8 = 0; thisVariation < VARIATION_COUNT; thisVariation++) {

    }
}

// Teleport =====================================================================================

export function centralize(altitude: f32): void {
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
        if (altitude > 0) {
            setY(jPtr, getY(jPtr) - lowY + altitude);
        }
        setZ(jPtr, getZ(jPtr) - z);
    }
}

// Construction =====================================================================================

export function joints(): usize {
    return jointCount;
}

export function intervals(): usize {
    return intervalCount;
}

export function faces(): usize {
    return faceCount;
}

export function nextJointTag(): u16 {
    jointTagCount++;
    return jointTagCount;
}

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
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

export function getJointLaterality(jointIndex: u16): u8 {
    return load<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2);
}

export function getJointTag(jointIndex: u16): u16 {
    return load<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + ROLE_SIZE);
}

export function createInterval(role: u8, alphaIndex: u16, omegaIndex: u16, idealSpan: f32): usize {
    let intervalIndex = intervalCount++;
    setRoleIndex(intervalIndex, role);
    setAlphaIndex(intervalIndex, alphaIndex);
    setOmegaIndex(intervalIndex, omegaIndex);
    setFloat(idealSpanPtr(intervalIndex), idealSpan > 0 ? idealSpan : calculateSpan(intervalIndex));
    return intervalIndex;
}

export function createFace(joint0Index: u16, joint1Index: u16, joint2Index: u16): usize {
    let faceIndex = faceCount++;
    zero(outputMidpointPtr(faceIndex));
    setJointIndexOfFace(faceIndex, 0, joint0Index);
    setJointIndexOfFace(faceIndex, 1, joint1Index);
    setJointIndexOfFace(faceIndex, 2, joint2Index);
    zero(outputNormalPtr(faceIndex, 0));
    zero(outputNormalPtr(faceIndex, 1));
    zero(outputNormalPtr(faceIndex, 2));
    zero(outputLocationPtr(faceIndex, 0));
    zero(outputLocationPtr(faceIndex, 1));
    zero(outputLocationPtr(faceIndex, 2));
    return faceIndex;
}

export function removeFace(faceIndex: u16): void {
    for (let thisFace: u16 = faceIndex; thisFace < faceCount - 1; thisFace++) {
        let nextFace = thisFace + 1;
        setVector(outputMidpointPtr(thisFace), outputMidpointPtr(nextFace));
        setVector(outputNormalPtr(thisFace, 0), outputNormalPtr(nextFace, 0));
        setVector(outputNormalPtr(thisFace, 1), outputNormalPtr(nextFace, 1));
        setVector(outputNormalPtr(thisFace, 2), outputNormalPtr(nextFace, 2));
        setJointIndexOfFace(thisFace, 0, getFaceJointIndex(nextFace, 0));
        setJointIndexOfFace(thisFace, 1, getFaceJointIndex(nextFace, 1));
        setJointIndexOfFace(thisFace, 2, getFaceJointIndex(nextFace, 2));
    }
    faceCount--;
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

export function findFaceApexIndex(faceIndex: u16): u16 {
    let joint0 = getFaceJointIndex(faceIndex, 0);
    let joint1 = getFaceJointIndex(faceIndex, 1);
    let joint2 = getFaceJointIndex(faceIndex, 2);
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        if (thisJoint === joint0 || thisJoint === joint1 || thisJoint === joint2) {
            continue;
        }
        let matches = 0;
        for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
            let alpha = getAlphaIndex(thisInterval);
            let omega = getOmegaIndex(thisInterval);
            if (thisJoint !== alpha && thisJoint != omega) {
                continue;
            }
            let alphaHit = alpha === joint0 || alpha === joint1 || alpha === joint2;
            if (alphaHit && thisJoint === omega) {
                matches++;
            }
            let omegaHit = omega === joint0 || omega === joint1 || omega === joint2;
            if (omegaHit && thisJoint === alpha) {
                matches++;
            }
        }
        if (matches === 3) {
            return thisJoint;
        }
    }
    return jointCount + 1;
}

export function getFaceJointIndex(faceIndex: u16, jointNumber: usize): u16 {
    return getIndex(facePtr(faceIndex) + jointNumber * INDEX_SIZE);
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

// Physics =====================================================================================

@inline
function abs(val: f32): f32 {
    return val < 0 ? -val : val;
}

function elastic(intervalIndex: u16, elasticFactor: f32): void {
    let span = calculateSpan(intervalIndex);
    let idealSpan = getFloat(idealSpanPtr(intervalIndex));
    let stress = elasticFactor * (span - idealSpan) * idealSpan * idealSpan;
    setFloat(stressPtr(intervalIndex), stress);
    addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2);
    addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2);
    let mass = idealSpan * idealSpan * idealSpan;
    let alphaMass = intervalMassPtr(getAlphaIndex(intervalIndex));
    setFloat(alphaMass, getFloat(alphaMass) + mass / 2);
    let omegaMass = intervalMassPtr(getOmegaIndex(intervalIndex));
    setFloat(omegaMass, getFloat(omegaMass) + mass / 2);
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

function tick(elasticFactor: f32, overGravity: f32, overDrag: f32, underGravity: f32, underDrag: f32): void {
    // fabric age ++
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
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        add(locationPtr(thisJoint), velocityPtr(thisJoint));
        setFloat(intervalMassPtr(thisJoint), AMBIENT_JOINT_MASS);
    }
}

const AIR_DRAG: f32 = 0.0003;
const AIR_GRAVITY: f32 = 0.000003;
const LAND_DRAG: f32 = 50;
const LAND_GRAVITY: f32 = 30;
const ELASTIC_FACTOR: f32 = 0.2;
const STRESS_MAX: f32 = 0.003;

export function iterate(ticks: usize): void {
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        tick(ELASTIC_FACTOR, AIR_GRAVITY, AIR_DRAG, LAND_GRAVITY, LAND_DRAG);
    }
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        setVector(outputAlphaLocationPtr(thisInterval), locationPtr(getAlphaIndex(thisInterval)));
        setVector(outputOmegaLocationPtr(thisInterval), locationPtr(getOmegaIndex(thisInterval)));
        let stress = getFloat(stressPtr(thisInterval)) / STRESS_MAX;
        if (stress > 1) {
            stress = 1;
        } else if (stress < -1) {
            stress = -1;
        }
        let red: f32 = 0.6 + -stress * 0.4;
        let green: f32 = 0;
        let blue: f32 = 0.6 + stress * 0.4;
        setAll(outputAlphaColorPtr(thisInterval), red, green, blue);
        setAll(outputOmegaColorPtr(thisInterval), red, green, blue);
    }
    for (let thisFace: u16 = 0; thisFace < faceCount; thisFace++) {
        outputFaceGeometry(thisFace);
    }
}
