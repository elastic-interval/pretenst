declare function logFloat(idx: u32, f: f32): void;

declare function logInt(idx: u32, i: u32): void;

const ENUM_SIZE: u32 = sizeof<u8>();
const JOINT_NAME_SIZE: u32 = sizeof<u16>();
const JOINT_INDEX_SIZE: u32 = sizeof<u32>();
const FLOAT_SIZE: u32 = sizeof<f32>();
const VECTOR_SIZE: u32 = FLOAT_SIZE * 3;

const JOINT_SIZE: u32 = VECTOR_SIZE * 5 + ENUM_SIZE + JOINT_NAME_SIZE + FLOAT_SIZE * 2;
const INTERVAL_SIZE: u32 = ENUM_SIZE + JOINT_INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE * 2;
const FACE_SIZE: u32 = JOINT_INDEX_SIZE * 3;
const LINE_SIZE: u32 = VECTOR_SIZE * 2;
const METADATA_SIZE: u32 = VECTOR_SIZE * 3;

const JOINT_RADIUS: f32 = 0.15;
const AMBIENT_JOINT_MASS: f32 = 0.1;
const CABLE_MASS_FACTOR: f32 = 0.05;
const SPRING_SMOOTH: f32 = 0.03;
const BAR_SMOOTH: f32 = 0.6;
const CABLE_SMOOTH: f32 = 0.01;
const TEMPORARY_TICK_REDUCTION: f32 = 0.01;

const ROLE_SPRING: i8 = 1;
const ROLE_MUSCLE: i8 = 2;
const ROLE_BAR: i8 = 3;
const ROLE_CABLE: i8 = 4;
const ROLE_TEMPORARY: i8 = 5;
const ROLE_RING_SPRING: i8 = 6;
const ROLE_COUNTER_CABLE: i8 = 7;
const ROLE_HORIZONTAL_CABLE: i8 = 8;
const ROLE_RING_CABLE: i8 = 9;
const ROLE_VERTICAL_CABLE: i8 = 10;

function getSmoothDegree(role: u8): f32 {
    switch (role) {
        case ROLE_SPRING:
        case ROLE_RING_SPRING:
        case ROLE_MUSCLE:
            return SPRING_SMOOTH;
        case ROLE_BAR:
            return BAR_SMOOTH;
        default:
            return CABLE_SMOOTH;
    }
}

function canPush(role: u8): boolean {
    switch (role) {
        case ROLE_SPRING:
        case ROLE_RING_SPRING:
        case ROLE_MUSCLE:
        case ROLE_BAR:
            return true;
        default:
            return false;
    }
}

const BILATERAL_MIDDLE: u8 = 0;
const BILATERAL_RIGHT: u8 = 1;
const BILATERAL_LEFT: u8 = 2;

const ELASTIC: f32 = 0.05;
const AIR_DRAG: f32 = 0.0004;
const AIR_GRAVITY: f32 = 0.00001;
const LAND_DRAG: f32 = 50;
const LAND_GRAVITY: f32 = 30;

let jointCount: u32 = 0;
let jointCountMax: u32 = 0;
let jointTagCount: u16 = 0;
let intervalCount: u32 = 0;
let intervalCountMax: u32 = 0;
let faceCount: u32 = 0;
let faceCountMax: u32 = 0;

let lineOffset: u32 = 0;
let jointOffset: u32 = 0;
let faceMidpointOffset: u32 = 0;
let faceNormalOffset: u32 = 0;
let intervalOffset: u32 = 0;
let faceOffset: u32 = 0;
let metadataOffset: u32 = 0;

let projectionPtr: u32 = 0;
let alphaProjectionPtr: u32 = 0;
let omegaProjectionPtr: u32 = 0;
let gravPtr: u32 = 0;

@inline()
function getIndex(vPtr: u32): u32 {
    return load<u32>(vPtr);
}

@inline()
function setIndex(vPtr: u32, index: u32): void {
    store<u32>(vPtr, index);
}

@inline()
function getFloat(vPtr: u32): f32 {
    return load<f32>(vPtr);
}

// @inline()
function setFloat(vPtr: u32, v: f32): void {
    store<f32>(vPtr, v);
}

@inline()
function getX(vPtr: u32): f32 {
    return load<f32>(vPtr);
}

@inline()
function setX(vPtr: u32, v: f32): void {
    store<f32>(vPtr, v);
}

@inline()
function getY(vPtr: u32): f32 {
    return load<f32>(vPtr + FLOAT_SIZE);
}

@inline()
function setY(vPtr: u32, v: f32): void {
    store<f32>(vPtr + FLOAT_SIZE, v);
}

@inline()
function getZ(vPtr: u32): f32 {
    return load<f32>(vPtr + FLOAT_SIZE * 2);
}

@inline()
function setZ(vPtr: u32, v: f32): void {
    store<f32>(vPtr + FLOAT_SIZE * 2, v);
}

function setAll(vPtr: u32, x: f32, y: f32, z: f32): void {
    setX(vPtr, x);
    setY(vPtr, y);
    setZ(vPtr, z);
}

function setVector(vPtr: u32, v: u32): void {
    setX(vPtr, getX(v));
    setY(vPtr, getY(v));
    setZ(vPtr, getZ(v));
}

function zero(vPtr: u32): void {
    setAll(vPtr, 0, 0, 0);
}

function addVectors(vPtr: u32, a: u32, b: u32): void {
    setX(vPtr, getX(a) + getX(b));
    setY(vPtr, getY(a) + getY(b));
    setZ(vPtr, getZ(a) + getZ(b));
}

function subVectors(vPtr: u32, a: u32, b: u32): void {
    setX(vPtr, getX(a) - getX(b));
    setY(vPtr, getY(a) - getY(b));
    setZ(vPtr, getZ(a) - getZ(b));
}

function add(vPtr: u32, v: u32): void {
    setX(vPtr, getX(vPtr) + getX(v));
    setY(vPtr, getY(vPtr) + getY(v));
    setZ(vPtr, getZ(vPtr) + getZ(v));
}

function sub(vPtr: u32, v: u32): void {
    setX(vPtr, getX(vPtr) - getX(v));
    setY(vPtr, getY(vPtr) - getY(v));
    setZ(vPtr, getZ(vPtr) - getZ(v));
}

function addScaledVector(vPtr: u32, v: u32, s: f32): void {
    setX(vPtr, getX(vPtr) + getX(v) * s);
    setY(vPtr, getY(vPtr) + getY(v) * s);
    setZ(vPtr, getZ(vPtr) + getZ(v) * s);
}

function multiplyScalar(vPtr: u32, s: f32): void {
    setX(vPtr, getX(vPtr) * s);
    setY(vPtr, getY(vPtr) * s);
    setZ(vPtr, getZ(vPtr) * s);
}

function dot(vPtr: u32, v: u32): f32 {
    return getX(vPtr) * getX(v) + getY(vPtr) * getY(v) + getZ(vPtr) * getZ(v);
}

function lerp(vPtr: u32, v: u32, interpolation: f32): void {
    let antiInterpolation = <f32>1.0 - interpolation;
    setX(vPtr, getX(vPtr) * antiInterpolation + getX(v) * interpolation);
    setY(vPtr, getY(vPtr) * antiInterpolation + getY(v) * interpolation);
    setX(vPtr, getZ(vPtr) * antiInterpolation + getZ(v) * interpolation);
}

function quadrance(vPtr: u32): f32 {
    let x = getX(vPtr);
    let y = getY(vPtr);
    let z = getZ(vPtr);
    return x * x + y * y + z * z + 0.00000001;
}

function distance(a: u32, b: u32): f32 {
    let dx = getX(a) - getX(b);
    let dy = getY(a) - getY(b);
    let dz = getZ(a) - getZ(b);
    return <f32>Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function length(vPtr: u32): f32 {
    return <f32>Math.sqrt(quadrance(vPtr));
}

function crossVectors(vPtr: u32, a: u32, b: u32): void {
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

// line: size is 2 vectors, or 6 floats, or 24 bytes

function lineAlphaPtr(index: u32): u32 {
    return index * LINE_SIZE;
}

function lineOmegaPtr(index: u32): u32 {
    return index * LINE_SIZE + VECTOR_SIZE;
}

// joint: size is u8 + u16 (5 x 3 + 2) = 17 float64s * 8 = 3 + 136 = 139 bytes
//   vectors: location, velocity absorbVelocity, force, gravity,
//   floats: intervalMass, altitude

function jointPtr(index: u32): u32 {
    return jointOffset + index * JOINT_SIZE;
}

function locationPtr(jointIndex: u32): u32 {
    return jointPtr(jointIndex);
}

function velocityPtr(jointIndex: u32): u32 {
    return jointPtr(jointIndex) + VECTOR_SIZE;
}

function absorbVelocityPtr(jointIndex: u32): u32 {
    return jointPtr(jointIndex) + VECTOR_SIZE * 2;
}

function forcePtr(jointIndex: u32): u32 {
    return jointPtr(jointIndex) + VECTOR_SIZE * 3;
}

function gravityPtr(jointIndex: u32): u32 {
    return jointPtr(jointIndex) + VECTOR_SIZE * 4;
}

function intervalMassPtr(jointIndex: u32): u32 {
    return jointPtr(jointIndex) + VECTOR_SIZE * 5;
}

function altitudePtr(jointIndex: u32): u32 {
    return jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE;
}

function getJointLaterality(jointIndex: u32): u8 {
    return load<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2);
}

function setJointLaterality(jointIndex: u32, laterality: u8): void {
    store<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2, laterality);
}

function getTag(jointIndex: u32): u16 {
    return load<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + ENUM_SIZE);
}

function setTag(jointIndex: u32, tag: u16): void {
    store<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + ENUM_SIZE, tag);
}

// interval: size role u8 plus is 2 unsigned32 + unit (3 f32s) + span + idealSpan, u8 + 5float + 2int = 49 bytes
//      role: u8
//      alpha, omega: u32
//      unit: vector
//      span, idealSpan: f32

function intervalPtr(index: u32): u32 {
    return intervalOffset + index * INTERVAL_SIZE;
}

function getRole(intervalIndex: u32): u8 {
    return load<u8>(intervalPtr(intervalIndex));
}

function setRole(intervalIndex: u32, role: u8): void {
    store<u8>(intervalPtr(intervalIndex), role);
}

function getAlphaIndex(intervalIndex: u32): u32 {
    return getIndex(intervalPtr(intervalIndex) + ENUM_SIZE);
}

function setAlphaIndex(intervalIndex: u32, v: u32): void {
    setIndex(intervalPtr(intervalIndex) + ENUM_SIZE, v);
}

function getOmegaIndex(intervalIndex: u32): u32 {
    return getIndex(intervalPtr(intervalIndex) + ENUM_SIZE + JOINT_INDEX_SIZE);
}

function setOmegaIndex(intervalIndex: u32, v: u32): void {
    setIndex(intervalPtr(intervalIndex) + ENUM_SIZE + JOINT_INDEX_SIZE, v);
}

function unitPtr(intervalIndex: u32): u32 {
    return intervalPtr(intervalIndex) + ENUM_SIZE + JOINT_INDEX_SIZE * 2;
}

function spanPtr(intervalIndex: u32): u32 {
    return intervalPtr(intervalIndex) + ENUM_SIZE + JOINT_INDEX_SIZE * 2 + VECTOR_SIZE;
}

function idealSpanPtr(intervalIndex: u32): u32 {
    return intervalPtr(intervalIndex) + ENUM_SIZE + JOINT_INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE;
}

function calculateSpan(intervalIndex: u32): f32 {
    let unit = unitPtr(intervalIndex);
    subVectors(unit, locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)));
    let span = length(unit);
    setFloat(spanPtr(intervalIndex), span);
    multiplyScalar(unit, 1 / span);
    return span;
}

function removeInterval(intervalIndex: u32): void {
    for (let walk: u32 = intervalIndex * INTERVAL_SIZE; walk < intervalIndex * INTERVAL_SIZE * intervalCount - 1; walk++) {
        store<u8>(walk, load<u8>(walk + INTERVAL_SIZE));
    }
    intervalCount--;
}

// face

function facePtr(index: u32): u32 {
    return faceOffset + index * FACE_SIZE;
}

function setJointIndexOfFace(faceIndex: u32, index: u32, v: u32): void {
    setIndex(facePtr(faceIndex) + index * JOINT_INDEX_SIZE, v);
}

function midpointPtr(faceIndex: u32): u32 {
    return faceMidpointOffset + faceIndex * VECTOR_SIZE;
}

function normalPtr(faceIndex: u32): u32 {
    return faceNormalOffset + faceIndex * VECTOR_SIZE;
}

function calculateFace(faceIndex: u32): void {
    let loc0 = locationPtr(getFaceJointIndex(faceIndex, 0));
    let loc1 = locationPtr(getFaceJointIndex(faceIndex, 1));
    let loc2 = locationPtr(getFaceJointIndex(faceIndex, 2));
    subVectors(alphaProjectionPtr, loc1, loc0);
    subVectors(omegaProjectionPtr, loc2, loc0);
    let normal = normalPtr(faceIndex);
    crossVectors(normal, alphaProjectionPtr, omegaProjectionPtr);
    multiplyScalar(normal, 1 / length(normal));
    let midpoint = midpointPtr(faceIndex);
    zero(midpoint);
    add(midpoint, loc0);
    add(midpoint, loc1);
    add(midpoint, loc2);
    multiplyScalar(midpoint, 1 / 3.0);
}

// construction and physics

function logIdealSpans(): void {
    for (let intervalIndex: u32 = 0; intervalIndex < intervalCount; intervalIndex++) {
        logFloat(intervalIndex, getFloat(idealSpanPtr(intervalIndex)));
    }
}

function abs(val: f32): f32 {
    return val < 0 ? -val : val;
}

function elastic(intervalIndex: u32): void {
    let span = calculateSpan(intervalIndex);
    let idealSpan = getFloat(idealSpanPtr(intervalIndex));
    let push = canPush(getRole(intervalIndex));
    let stress = ELASTIC * (span - idealSpan) * idealSpan * idealSpan;
    if (push || stress > 0) {
        addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2);
        addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2);
    }
    let mass = push ? idealSpan * idealSpan * idealSpan : span * CABLE_MASS_FACTOR;
    let alphaMass = intervalMassPtr(getAlphaIndex(intervalIndex));
    setFloat(alphaMass, getFloat(alphaMass) + mass / 2);
    let omegaMass = intervalMassPtr(getOmegaIndex(intervalIndex));
    setFloat(omegaMass, getFloat(omegaMass) + mass / 2);
}

function splitVectors(vectorPtr: u32, basisPtr: u32, projectionPtr: u32, howMuch: f32): void {
    let agreement = dot(vectorPtr, basisPtr);
    setVector(projectionPtr, basisPtr);
    multiplyScalar(projectionPtr, agreement * howMuch);
}

function smoothVelocity(intervalIndex: u32, degree: f32): void {
    splitVectors(velocityPtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), alphaProjectionPtr, degree);
    splitVectors(velocityPtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), omegaProjectionPtr, degree);
    addVectors(projectionPtr, alphaProjectionPtr, omegaProjectionPtr);
    multiplyScalar(projectionPtr, 0.5);
    sub(absorbVelocityPtr(getAlphaIndex(intervalIndex)), alphaProjectionPtr);
    sub(absorbVelocityPtr(getOmegaIndex(intervalIndex)), omegaProjectionPtr);
    add(absorbVelocityPtr(getAlphaIndex(intervalIndex)), projectionPtr);
    add(absorbVelocityPtr(getOmegaIndex(intervalIndex)), projectionPtr);
}

function exertGravity(jointIndex: u32, value: f32): void {
    let velocity = velocityPtr(jointIndex);
    setY(velocity, getY(velocity) - value);
}

function exertJointPhysics(jointIndex: u32): void {
    let altitude = getY(locationPtr(jointIndex));
    if (altitude > JOINT_RADIUS) {
        exertGravity(jointIndex, AIR_GRAVITY);
        multiplyScalar(velocityPtr(jointIndex), 1 - AIR_DRAG);
    }
    else if (altitude < -JOINT_RADIUS) {
        exertGravity(jointIndex, -AIR_GRAVITY * LAND_GRAVITY);
        multiplyScalar(velocityPtr(jointIndex), 1 - AIR_DRAG * LAND_DRAG);
    }
    else {
        let degree = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2);
        let gravityValue = AIR_GRAVITY * degree + -AIR_GRAVITY * LAND_GRAVITY * (1 - degree);
        exertGravity(jointIndex, gravityValue);
        let drag = AIR_DRAG * degree + AIR_DRAG * LAND_DRAG * (1 - degree);
        multiplyScalar(velocityPtr(jointIndex), 1 - drag);
    }
}

function tick(): void {
    // fabric age ++
    for (let thisInterval: u32 = 0; thisInterval < intervalCount; thisInterval++) {
        // interval must see fabric age
        elastic(thisInterval);
        if (getRole(thisInterval) === ROLE_TEMPORARY) {
            let span = getFloat(spanPtr(thisInterval)) - TEMPORARY_TICK_REDUCTION;
            if (span <= 0) {
                removeInterval(thisInterval);
            } else {
                setFloat(spanPtr(thisInterval), span)
            }
        }
    }
    for (let thisInterval: u32 = 0; thisInterval < intervalCount; thisInterval++) {
        smoothVelocity(thisInterval, getSmoothDegree(getRole(thisInterval)));
    }
    for (let thisJoint: u32 = 0; thisJoint < jointCount; thisJoint++) {
        exertJointPhysics(thisJoint);
        addScaledVector(velocityPtr(thisJoint), forcePtr(thisJoint), 1.0 / getFloat(intervalMassPtr(thisJoint)));
        zero(forcePtr(thisJoint));
        add(velocityPtr(thisJoint), absorbVelocityPtr(thisJoint));
        zero(absorbVelocityPtr(thisJoint));
    }
    for (let thisInterval: u32 = 0; thisInterval < intervalCount; thisInterval++) {
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
    for (let thisJoint: u32 = 0; thisJoint < jointCount; thisJoint++) {
        add(locationPtr(thisJoint), velocityPtr(thisJoint));
        setFloat(intervalMassPtr(thisJoint), AMBIENT_JOINT_MASS);
    }
}

// =================================

export function init(joints: u32, intervals: u32, faces: u32): u32 {
    jointCountMax = joints;
    intervalCountMax = intervals;
    faceCountMax = faces;
    let sizeOfLines = intervalCountMax * VECTOR_SIZE * 2;
    let sizeOfMidpointsNormals = faceCountMax * VECTOR_SIZE;
    let sizeOfJoints = jointCountMax * JOINT_SIZE;
    let sizeOfIntervals = intervalCountMax * INTERVAL_SIZE;
    let sizeOfFaces = faceCountMax * FACE_SIZE;
    // offsets
    faceMidpointOffset = lineOffset + sizeOfLines;
    faceNormalOffset = faceMidpointOffset + sizeOfMidpointsNormals;
    jointOffset = faceNormalOffset + sizeOfMidpointsNormals;
    intervalOffset = jointOffset + sizeOfJoints;
    faceOffset = intervalOffset + sizeOfIntervals;
    metadataOffset = faceOffset + sizeOfFaces;
    projectionPtr = metadataOffset;
    alphaProjectionPtr = projectionPtr + VECTOR_SIZE;
    omegaProjectionPtr = alphaProjectionPtr + VECTOR_SIZE;
    gravPtr = omegaProjectionPtr + VECTOR_SIZE;
    // prep
    let bytes = gravPtr + VECTOR_SIZE;
    let blocks = bytes >> 16;
    memory.grow(blocks > 0 ? blocks : 1);
    return bytes;
}

export function centralize(altitude: f32): void {
    let x: f32 = 0;
    let lowY: f32 = 10000;
    let z: f32 = 0;
    for (let thisJoint: u32 = 0; thisJoint < jointCount; thisJoint++) {
        x += getX(jointPtr(thisJoint));
        let y = getY(jointPtr(thisJoint));
        if (y < lowY) {
            lowY = y;
        }
        z += getZ(jointPtr(thisJoint));
    }
    x = x / <f32>jointCount;
    z = z / <f32>jointCount;
    for (let thisJoint: u32 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = jointPtr(thisJoint);
        setX(jPtr, getX(jPtr) - x);
        if (altitude > 0) {
            setY(jPtr, getY(jPtr) - lowY + altitude);
        }
        setZ(jPtr, getZ(jPtr) - z);
    }
}

export function createJoint(laterality: u8, tag: u16, x: f32, y: f32, z: f32): u32 {
    let jointIndex = jointCount++;
    setAll(locationPtr(jointIndex), x, y, z);
    zero(forcePtr(jointIndex));
    zero(velocityPtr(jointIndex));
    zero(gravityPtr(jointIndex));
    zero(absorbVelocityPtr(jointIndex));
    setFloat(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS);
    setJointLaterality(jointIndex, laterality);
    setTag(jointIndex, tag);
    return jointIndex;
}

export function createInterval(role: u8, alphaIndex: u32, omegaIndex: u32, idealSpan: f32): u32 {
    let intervalIndex = intervalCount++;
    setRole(intervalIndex, role);
    setAlphaIndex(intervalIndex, alphaIndex);
    setOmegaIndex(intervalIndex, omegaIndex);
    setFloat(idealSpanPtr(intervalIndex), idealSpan > 0 ? idealSpan : calculateSpan(intervalIndex));
    return intervalIndex;
}

export function createFace(joint0Index: u32, joint1Index: u32, joint2Index: u32): u32 {
    let faceIndex = faceCount++;
    setJointIndexOfFace(faceIndex, 0, joint0Index);
    setJointIndexOfFace(faceIndex, 1, joint1Index);
    setJointIndexOfFace(faceIndex, 2, joint2Index);
    zero(midpointPtr(faceIndex));
    zero(normalPtr(faceIndex));
    return faceIndex;
}

export function getFaceJointIndex(faceIndex: u32, index: u32): u32 {
    return getIndex(facePtr(faceIndex) + index * JOINT_INDEX_SIZE);
}

export function getFaceLaterality(faceIndex: u32): u8 {
    for (let jointWalk:u32 = 0; jointWalk<3; jointWalk++) { // face inherits laterality
        let jointLaterality = getJointLaterality(getFaceJointIndex(faceIndex, jointWalk));
        if (jointLaterality !== BILATERAL_MIDDLE) {
            return jointLaterality;
        }
    }
    return BILATERAL_MIDDLE;
}

export function iterate(ticks: u32): void {
    for (let thisTick: u32 = 0; thisTick < ticks; thisTick++) {
        tick();
    }
    for (let thisInterval: u32 = 0; thisInterval < intervalCount; thisInterval++) {
        setVector(lineAlphaPtr(thisInterval), locationPtr(getAlphaIndex(thisInterval)));
        setVector(lineOmegaPtr(thisInterval), locationPtr(getOmegaIndex(thisInterval)));
    }
    for (let thisFace: u32 = 0; thisFace < faceCount; thisFace++) {
        calculateFace(thisFace);
    }
}

export function tetraFromFace(faceIndex: u32): void {
    let j0 = getFaceJointIndex(faceIndex, 0);
    let j1 = getFaceJointIndex(faceIndex, 1);
    let j2 = getFaceJointIndex(faceIndex, 2);
    addVectors(projectionPtr, midpointPtr(faceIndex), normalPtr(faceIndex));
    let l01 = distance(locationPtr(j0), locationPtr(j1));
    let l12 = distance(locationPtr(j1), locationPtr(j2));
    let l20 = distance(locationPtr(j2), locationPtr(j0));
    let average = (l01 + l12 + l20) / 3;
    for (let thisFace: u32 = faceIndex; thisFace < faceCount - 1; thisFace++) {
        let nextFace = thisFace + 1;
        setVector(midpointPtr(thisFace), midpointPtr(nextFace));
        setVector(normalPtr(thisFace), normalPtr(nextFace));
        setJointIndexOfFace(thisFace, 0, getFaceJointIndex(nextFace, 0));
        setJointIndexOfFace(thisFace, 1, getFaceJointIndex(nextFace, 1));
        setJointIndexOfFace(thisFace, 2, getFaceJointIndex(nextFace, 2));
    }
    faceCount--;
    let apex = createJoint(BILATERAL_MIDDLE, jointTagCount++, getX(projectionPtr), getY(projectionPtr), getZ(projectionPtr));
    createInterval(ROLE_SPRING, j0, apex, average);
    createInterval(ROLE_SPRING, j1, apex, average);
    createInterval(ROLE_SPRING, j2, apex, average);
    createFace(j0, j1, apex);
    createFace(j1, j2, apex);
    createFace(j2, j0, apex);
}

export function joints(): u32 {
    return jointCount;
}

export function intervals(): u32 {
    return intervalCount;
}

export function faces(): u32 {
    return faceCount;
}

