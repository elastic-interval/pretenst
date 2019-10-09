/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

declare function logBoolean(idx: u32, b: boolean): void

declare function logFloat(idx: u32, f: f32): void

declare function logInt(idx: u32, i: i32): void

export enum PhysicsFeature {
    GravityAbove = 0,
    DragAbove = 1,
    AntigravityBelow = 2,
    DragBelow = 3,
    AntigravityBelowWater = 4,
    DragBelowWater = 5,
    PushElastic = 6,
    PullElastic = 7,
    IntervalCountdown = 8,
}


enum IntervalRole {
    Bar = 1,
    Triangle = 2,
    Ring = 3,
    Cross = 4,
    BowMid = 5,
    BowEndLow = 6,
    BowEndHigh = 7,
}

const U8 = sizeof<u8>()
const U16 = sizeof<u16>()
const U32 = sizeof<u32>()
const F32 = sizeof<f32>()

const BAR_MASS_PER_LENGTH: f32 = 1
const CABLE_MASS_PER_LENGTH: f32 = 0.01

const BAR_COLOR: f32[] = [1.0, 0.3, 0.2]
const CABLE_COLOR: f32[] = [0.4, 0.6, 1]
const ATTENUATED_COLOR: f32[] = [0.25, 0.25, 0.25]

const FLOATS_IN_VECTOR = 3
const ERROR: usize = 65535
const LATERALITY_SIZE: usize = U8
const JOINT_NAME_SIZE: usize = U16
const INDEX_SIZE: usize = U16
const INTERVAL_ROLE_SIZE: usize = U8
const INTERVAL_COUNTDOWN_SIZE: usize = U16
const VECTOR_SIZE: usize = F32 * 3
const JOINT_RADIUS: f32 = 0.1
const AMBIENT_JOINT_MASS: f32 = 0.1
const REST_STATE: u8 = 0
const STATE_COUNT: u8 = 5
const LAND: u8 = 1
const BUSY_DRAG_FACTOR: f32 = 60

const JOINT_SIZE: usize = VECTOR_SIZE * 2 + LATERALITY_SIZE + JOINT_NAME_SIZE + F32 * 2
const INTERVAL_SIZE: usize = INDEX_SIZE + INDEX_SIZE + F32 + F32 + INTERVAL_ROLE_SIZE + INTERVAL_COUNTDOWN_SIZE + F32 * STATE_COUNT

// Dimensioning ================================================================================

let jointCountMax: u16 = 0
let intervalCountMax: u16 = 0
let faceCountMax: u16 = 0
let instanceCountMax: u16 = 0
let useHexalot: boolean = false;

let fabricBytes: usize = 0

let _joints: usize = 0
let _jointLocations: usize = 0
let _faceMidpoints: usize = 0
let _faceNormals: usize = 0
let _faceLocations: usize = 0
let _intervals: usize = 0
let _intervalUnits: usize = 0
let _intervalDisplacements: usize = 0
let _faces: usize = 0
let _lineLocations: usize = 0
let _lineColors: usize = 0

let _state: usize = 0
let _vA: usize = 0
let _vB: usize = 0
let _vX: usize = 0
let _midpoint: usize = 0
let _seed: usize = 0
let _forward: usize = 0
let _right: usize = 0

export function init(jointsPerFabric: u16, intervalsPerFabric: u16, facesPerFabric: u16, instances: u16): usize {
    jointCountMax = jointsPerFabric
    intervalCountMax = intervalsPerFabric
    faceCountMax = facesPerFabric
    instanceCountMax = instances
    _seed = _midpoint + VECTOR_SIZE
    _forward = _seed + VECTOR_SIZE
    _right = _forward + VECTOR_SIZE
    _lineColors = _right + VECTOR_SIZE
    _lineLocations = _lineColors + intervalCountMax * VECTOR_SIZE * 2
    _faceMidpoints = _lineLocations + intervalCountMax * VECTOR_SIZE * 2
    _faceNormals = _faceMidpoints + faceCountMax * VECTOR_SIZE
    _faceLocations = _faceNormals + faceCountMax * VECTOR_SIZE * 3
    _jointLocations = _faceLocations + faceCountMax * VECTOR_SIZE * 3
    _intervalUnits = _jointLocations + jointCountMax * VECTOR_SIZE
    _intervalDisplacements = _intervalUnits + intervalCountMax * VECTOR_SIZE
    _joints = _intervalDisplacements + intervalCountMax * F32
    _intervals = _joints + jointCountMax * JOINT_SIZE
    _faces = _intervals + intervalCountMax * INTERVAL_SIZE
    _vX = _faces + faceCountMax * FACE_SIZE
    _vA = _vX + VECTOR_SIZE
    _vB = _vA + VECTOR_SIZE
    _state = _vB + VECTOR_SIZE
    fabricBytes = _state + STATE_SIZE
    let blocks = (HEXALOT_SIZE + fabricBytes * instanceCountMax) >> 16
    memory.grow(blocks + 1)
    return fabricBytes
}

// Joint Pointers =========================================================================

// @ts-ignore
@inline()
function _location(jointIndex: u16): usize {
    return _jointLocations + jointIndex * VECTOR_SIZE
}

// @ts-ignore
@inline()
function _velocity(jointIndex: u16): usize {
    return _joints + jointIndex * VECTOR_SIZE
}

// @ts-ignore
@inline()
function _force(jointIndex: u16): usize {
    return _velocity(jointCountMax) + jointIndex * VECTOR_SIZE
}

// @ts-ignore
@inline()
function _intervalMass(jointIndex: u16): usize {
    return _force(jointCountMax) + jointIndex * F32
}

// @ts-ignore
@inline()
function _laterality(jointIndex: u16): usize {
    return _force(jointCountMax) + jointIndex * U8
}

// @ts-ignore
@inline()
function _jointTag(jointIndex: u16): usize {
    return _laterality(jointCountMax) + jointIndex * U16
}

// Interval Pointers =========================================================================

// @ts-ignore
@inline()
function _alpha(intervalIndex: u16): usize {
    return _intervals + intervalIndex * INDEX_SIZE
}

// @ts-ignore
@inline()
function _omega(intervalIndex: u16): usize {
    return _alpha(intervalCountMax) + intervalIndex * INDEX_SIZE
}

// @ts-ignore
@inline()
function _currentLength(intervalIndex: u16): usize {
    return _omega(intervalCountMax) + intervalIndex * F32
}

// @ts-ignore
@inline()
function _elasticFactor(intervalIndex: u16): usize {
    return _currentLength(intervalCountMax) + intervalIndex * F32
}

// @ts-ignore
@inline()
function _intervalRole(intervalIndex: u16): usize {
    return _elasticFactor(intervalCountMax) + intervalIndex * INTERVAL_ROLE_SIZE
}

// @ts-ignore
@inline()
function _intervalCountdown(intervalIndex: u16): usize {
    return _intervalRole(intervalCountMax) + intervalIndex * INTERVAL_COUNTDOWN_SIZE
}

// @ts-ignore
@inline()
function _stateLengthArray(intervalIndex: u16): usize {
    return _intervalCountdown(intervalCountMax) + intervalIndex * F32 * STATE_COUNT
}

// @ts-ignore
@inline()
function _unit(intervalIndex: u16): usize {
    return _intervalUnits + intervalIndex * VECTOR_SIZE
}

// Face Pointers =========================================================================

// @ts-ignore
@inline()
function _face(faceIndex: u16): usize {
    return _faces + faceIndex * FACE_SIZE
}

// @ts-ignore
@inline()
function _faceMidpoint(faceIndex: u16): usize {
    return _faceMidpoints + faceIndex * VECTOR_SIZE
}

// @ts-ignore
@inline()
function _faceNormal(faceIndex: u16, jointNumber: u16): usize {
    return _faceNormals + (faceIndex * 3 + jointNumber) * VECTOR_SIZE
}

// @ts-ignore
@inline()
function _faceLocation(faceIndex: u16, jointNumber: u16): usize {
    return _faceLocations + (faceIndex * 3 + jointNumber) * VECTOR_SIZE
}

// Physics =====================================================================================

let physicsDragAbove: f32
let physicsGravityAbove: f32
let physicsDragBelowWater: f32
let physicsAntigravityBelowWater: f32
let physicsDragBelow: f32
let physicsAntigravityBelow: f32
let pushElasticFactor: f32
let pullElasticFactor: f32
let intervalCountdown: f32

export function setPhysicsFeature(globalFeature: PhysicsFeature, value: f32): f32 {
    switch (globalFeature) {
        case PhysicsFeature.GravityAbove:
            return physicsGravityAbove = value
        case PhysicsFeature.DragAbove:
            return physicsDragAbove = value
        case PhysicsFeature.AntigravityBelow:
            return physicsAntigravityBelow = value
        case PhysicsFeature.DragBelow:
            return physicsDragBelow = value
        case PhysicsFeature.AntigravityBelowWater:
            return physicsAntigravityBelowWater = value
        case PhysicsFeature.DragBelowWater:
            return physicsDragBelowWater = value
        case PhysicsFeature.PushElastic:
            return pushElasticFactor = value
        case PhysicsFeature.PullElastic:
            return pullElasticFactor = value
        case PhysicsFeature.IntervalCountdown:
            return intervalCountdown = value
        default:
            return 0
    }
}

// Instances ====================================================================================

let instance: u16 = 0
let instancePtr: usize = 0

export function setInstance(index: u16): void {
    instance = index
    instancePtr = HEXALOT_SIZE + instance * fabricBytes
}

export function cloneInstance(fromIndex: u16, toIndex: u16): void {
    let fromAddress = HEXALOT_SIZE + fromIndex * fabricBytes
    let toAddress = HEXALOT_SIZE + toIndex * fabricBytes
    for (let walk: usize = 0; walk < fabricBytes; walk += U32) {
        store<u32>(toAddress + walk, load<u32>(fromAddress + walk))
    }
}

// Peek and Poke ================================================================================

// @ts-ignore
@inline()
function getU8(vPtr: usize): u8 {
    return load<u8>(instancePtr + vPtr)
}

// @ts-ignore
@inline()
function setU8(vPtr: usize, value: u8): void {
    store<u8>(instancePtr + vPtr, value)
}

// @ts-ignore
@inline()
function getU16(vPtr: usize): u16 {
    return load<u16>(instancePtr + vPtr)
}

// @ts-ignore
@inline()
function setU16(vPtr: usize, value: u16): void {
    store<u16>(instancePtr + vPtr, value)
}

// @ts-ignore
@inline()
function getU32(vPtr: usize): u32 {
    return load<u32>(instancePtr + vPtr)
}

// @ts-ignore
@inline()
function setU32(vPtr: usize, value: u32): void {
    store<u32>(instancePtr + vPtr, value)
}

// @ts-ignore
@inline()
function getF32(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr)
}

// @ts-ignore
@inline()
function setF32(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr, value)
}

// @ts-ignore
@inline()
function getX(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr)
}

// @ts-ignore
@inline()
function setX(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr, value)
}

// @ts-ignore
@inline()
function getY(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr + F32)
}

// @ts-ignore
@inline()
function setY(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr + F32, value)
}

// @ts-ignore
@inline()
function getZ(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr + F32 * 2)
}

// @ts-ignore
@inline()
function setZ(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr + F32 * 2, value)
}

// @ts-ignore
@inline()
function getU8Global(vPtr: usize): u8 {
    return load<u8>(vPtr)
}

// @ts-ignore
@inline()
function getF32Global(vPtr: usize): f32 {
    return load<f32>(vPtr)
}

// @ts-ignore
@inline
function abs(value: f32): f32 {
    return value < 0 ? -value : value
}

// Vector3 ================================================================================

function setAll(vPtr: usize, x: f32, y: f32, z: f32): void {
    setX(vPtr, x)
    setY(vPtr, y)
    setZ(vPtr, z)
}

function setVector(vPtr: usize, v: usize): void {
    setX(vPtr, getX(v))
    setY(vPtr, getY(v))
    setZ(vPtr, getZ(v))
}

function zero(vPtr: usize): void {
    setAll(vPtr, 0, 0, 0)
}

function addVectors(vPtr: usize, a: usize, b: usize): void {
    setX(vPtr, getX(a) + getX(b))
    setY(vPtr, getY(a) + getY(b))
    setZ(vPtr, getZ(a) + getZ(b))
}

function subVectors(vPtr: usize, a: usize, b: usize): void {
    setX(vPtr, getX(a) - getX(b))
    setY(vPtr, getY(a) - getY(b))
    setZ(vPtr, getZ(a) - getZ(b))
}

function add(vPtr: usize, v: usize): void {
    setX(vPtr, getX(vPtr) + getX(v))
    setY(vPtr, getY(vPtr) + getY(v))
    setZ(vPtr, getZ(vPtr) + getZ(v))
}

function sub(vPtr: usize, v: usize): void {
    setX(vPtr, getX(vPtr) - getX(v))
    setY(vPtr, getY(vPtr) - getY(v))
    setZ(vPtr, getZ(vPtr) - getZ(v))
}

function addScaledVector(vPtr: usize, v: usize, s: f32): void {
    setX(vPtr, getX(vPtr) + getX(v) * s)
    setY(vPtr, getY(vPtr) + getY(v) * s)
    setZ(vPtr, getZ(vPtr) + getZ(v) * s)
}

function multiplyScalar(vPtr: usize, s: f32): void {
    setX(vPtr, getX(vPtr) * s)
    setY(vPtr, getY(vPtr) * s)
    setZ(vPtr, getZ(vPtr) * s)
}

// function dot(vPtr: usize, v: usize): f32 {
//     return getX(vPtr) * getX(v) + getY(vPtr) * getY(v) + getZ(vPtr) * getZ(v)
// }

// function lerp(vPtr: usize, v: usize, interpolation: f32): void {
//     let antiInterpolation = <f32>1.0 - interpolation
//     setX(vPtr, getX(vPtr) * antiInterpolation + getX(v) * interpolation)
//     setY(vPtr, getY(vPtr) * antiInterpolation + getY(v) * interpolation)
//     setX(vPtr, getZ(vPtr) * antiInterpolation + getZ(v) * interpolation)
// }

function quadrance(vPtr: usize): f32 {
    let x = getX(vPtr)
    let y = getY(vPtr)
    let z = getZ(vPtr)
    return x * x + y * y + z * z + 0.00000001
}

function distance(a: usize, b: usize): f32 {
    let dx = getX(a) - getX(b)
    let dy = getY(a) - getY(b)
    let dz = getZ(a) - getZ(b)
    return <f32>sqrt(dx * dx + dy * dy + dz * dz)
}

function magnitude(vPtr: usize): f32 {
    return <f32>sqrt(quadrance(vPtr))
}

function crossVectors(vPtr: usize, a: usize, b: usize): void {
    let ax = getX(a)
    let ay = getY(a)
    let az = getZ(a)
    let bx = getX(b)
    let by = getY(b)
    let bz = getZ(b)
    setX(vPtr, ay * bz - az * by)
    setY(vPtr, az * bx - ax * bz)
    setZ(vPtr, ax * by - ay * bx)
}

// Fabric state ===============================================================================

const JOINT_COUNT_OFFSET = U32
const JOINT_TAG_COUNT_OFFSET = JOINT_COUNT_OFFSET + U16
const INTERVAL_COUNT_OFFSET = JOINT_TAG_COUNT_OFFSET + U16
const FACE_COUNT_OFFSET = INTERVAL_COUNT_OFFSET + U16
const BUSY_COUNTDOWN_OFFSET = FACE_COUNT_OFFSET + U16
const PREVIOUS_STATE_OFFSET = BUSY_COUNTDOWN_OFFSET + U16
const CURRENT_STATE_OFFSET = PREVIOUS_STATE_OFFSET + U8
const NEXT_STATE_OFFSET = CURRENT_STATE_OFFSET + U8
const ELASTIC_FACTOR_OFFSET = NEXT_STATE_OFFSET + U8 + U16 // last one is padding for multiple of 4 bytes
const STATE_SIZE = ELASTIC_FACTOR_OFFSET

function setAge(value: u32): void {
    setU32(_state, value)
}

export function getAge(): u32 {
    return getU32(_state)
}

export function getJointCount(): u16 {
    return getU16(_state + JOINT_COUNT_OFFSET)
}

function setJointCount(value: u16): void {
    setU16(_state + JOINT_COUNT_OFFSET, value)
}

function getJointTagCount(): u16 {
    return getU16(_state + JOINT_TAG_COUNT_OFFSET)
}

function setJointTagCount(value: u16): void {
    setU16(_state + JOINT_TAG_COUNT_OFFSET, value)
}

export function nextJointTag(): u16 {
    let count = getJointTagCount()
    setJointTagCount(count + 1)
    return count
}

export function getIntervalCount(): u16 {
    return getU16(_state + INTERVAL_COUNT_OFFSET)
}

function setIntervalCount(value: u16): void {
    setU16(_state + INTERVAL_COUNT_OFFSET, value)
}

export function getFaceCount(): u16 {
    return getU16(_state + FACE_COUNT_OFFSET)
}

function setFaceCount(value: u16): void {
    setU16(_state + FACE_COUNT_OFFSET, value)
}

function getBusyCountdown(): u16 {
    return getU16(_state + BUSY_COUNTDOWN_OFFSET)
}

export function setBusyCountdown(countdown: u16): void {
    setU16(_state + BUSY_COUNTDOWN_OFFSET, countdown)
}

export function isBusy(): boolean {
    return getBusyCountdown() > 0
}

export function extendBusyCountdown(factor: f32): void {
    let countdown = <u16>(intervalCountdown * factor)
    setBusyCountdown(countdown)
}

function getPreviousState(): u8 {
    return getU8(_state + PREVIOUS_STATE_OFFSET)
}

function setPreviousState(value: u8): void {
    setU8(_state + PREVIOUS_STATE_OFFSET, value)
}

export function getCurrentState(): u8 {
    return getU8(_state + CURRENT_STATE_OFFSET)
}

function setCurrentState(value: u8): void {
    setU8(_state + CURRENT_STATE_OFFSET, value)
}

export function getNextState(): u8 {
    return getU8(_state + NEXT_STATE_OFFSET)
}

export function setNextState(value: u8): void {
    setU8(_state + NEXT_STATE_OFFSET, value)
}

export function reset(): void {
    setAge(0)
    setJointCount(0)
    setJointTagCount(0)
    setIntervalCount(0)
    setFaceCount(0)
    setBusyCountdown(0)
    setPreviousState(REST_STATE)
    setCurrentState(REST_STATE)
    setNextState(REST_STATE)
}

// Joints =====================================================================================

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
    let jointCount = getJointCount()
    if (jointCount + 1 >= jointCountMax) {
        return ERROR
    }
    setJointCount(jointCount + 1)
    let jointIndex = jointCount
    setAll(_location(jointIndex), x, y, z)
    zero(_force(jointIndex))
    zero(_velocity(jointIndex))
    setF32(_intervalMass(jointIndex), AMBIENT_JOINT_MASS)
    setJointLaterality(jointIndex, laterality)
    setJointTag(jointIndex, jointTag)
    return jointIndex
}

function copyJointFromNext(jointIndex: u16): void {
    let nextIndex = jointIndex + 1
    setVector(_location(jointIndex), _location(nextIndex))
    setVector(_force(jointIndex), _force(nextIndex))
    setVector(_velocity(jointIndex), _velocity(nextIndex))
    setF32(_intervalMass(jointIndex), getF32(_intervalMass(nextIndex)))
    setJointLaterality(jointIndex, getJointLaterality(nextIndex))
    setJointTag(jointIndex, getJointTag(nextIndex))
}

function setJointLaterality(jointIndex: u16, laterality: u8): void {
    setU8(_laterality(jointIndex), laterality)
}

export function getJointLaterality(jointIndex: u16): u8 {
    return getU8(_laterality(jointIndex))
}

function setJointTag(jointIndex: u16, tag: u16): void {
    setU16(_jointTag(jointIndex), tag)
}

export function getJointTag(jointIndex: u16): u16 {
    return getU16(_jointTag(jointIndex))
}

export function centralize(): void {
    let jointCount = getJointCount()
    let x: f32 = 0
    let lowY: f32 = 10000
    let z: f32 = 0
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        x += getX(_location(thisJoint))
        let y = getY(_location(thisJoint))
        if (y < lowY) {
            lowY = y
        }
        z += getZ(_location(thisJoint))
    }
    x = x / <f32>jointCount
    z = z / <f32>jointCount
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = _location(thisJoint)
        setX(jPtr, getX(jPtr) - x)
        setZ(jPtr, getZ(jPtr) - z)
    }
}

export function setAltitude(altitude: f32): f32 {
    altitude += JOINT_RADIUS
    let jointCount = getJointCount()
    let lowY: f32 = 10000
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let y = getY(_location(thisJoint))
        if (y < lowY) {
            lowY = y
        }
    }
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = _location(thisJoint)
        setY(jPtr, getY(jPtr) + altitude - lowY)
    }
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    return altitude - lowY
}

function calculateJointMidpoint(): void {
    zero(_midpoint)
    let jointCount = getJointCount()
    if (jointCount <= 0) {
        return
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(_midpoint, _location(jointIndex))
    }
    multiplyScalar(_midpoint, 1.0 / <f32>jointCount)
}

// Intervals =====================================================================================

export function createInterval(alpha: u16, omega: u16, intervalRole: u8, restLength: f32): usize {
    let intervalCount = getIntervalCount()
    if (intervalCount + 1 >= intervalCountMax) {
        return ERROR
    }
    let intervalIndex = intervalCount
    setIntervalCount(intervalCount + 1)
    setAlphaIndex(intervalIndex, alpha)
    setOmegaIndex(intervalIndex, omega)
    zero(_unit(intervalIndex))
    setIntervalRole(intervalIndex, intervalRole)
    initializeCurrentLength(intervalIndex, calculateLength(intervalIndex))
    setElasticFactor(intervalIndex, 1.0)
    for (let state: u8 = REST_STATE; state < STATE_COUNT; state++) {
        setIntervalStateLength(intervalIndex, state, restLength)
    }
    let countdown: u16 = <u16>intervalCountdown
    setIntervalCountdown(intervalIndex, countdown)
    setBusyCountdown(countdown)
    return intervalIndex
}

export function removeInterval(intervalIndex: u16): void {
    let intervalCount = getIntervalCount()
    while (intervalIndex < intervalCount - 1) {
        copyIntervalFromOffset(intervalIndex, 1)
        intervalIndex++
    }
    setIntervalCount(intervalCount - 1)
}

function copyIntervalFromOffset(intervalIndex: u16, offset: u16): void {
    let nextIndex = intervalIndex + offset
    setIntervalRole(intervalIndex, getIntervalRole(nextIndex))
    setU16(_intervalCountdown(intervalIndex), getIntervalCountdown(nextIndex))
    setAlphaIndex(intervalIndex, alphaIndex(nextIndex))
    setOmegaIndex(intervalIndex, omegaIndex(nextIndex))
    setVector(_unit(intervalIndex), _unit(nextIndex))
    initializeCurrentLength(intervalIndex, getCurrentLength(nextIndex))
    setElasticFactor(intervalIndex, getElasticFactor(nextIndex))
    for (let state: u8 = REST_STATE; state < STATE_COUNT; state++) {
        setIntervalStateLength(intervalIndex, state, getIntervalStateLength(nextIndex, state))
    }
}

function alphaIndex(intervalIndex: u16): u16 {
    return getU16(_alpha(intervalIndex))
}

function setAlphaIndex(intervalIndex: u16, index: u16): void {
    setU16(_alpha(intervalIndex), index)
}

function omegaIndex(intervalIndex: u16): u16 {
    return getU16(_omega(intervalIndex))
}

function setOmegaIndex(intervalIndex: u16, index: u16): void {
    setU16(_omega(intervalIndex), index)
}

function getCurrentLength(intervalIndex: u16): f32 {
    return getF32(_currentLength(intervalIndex))
}

function initializeCurrentLength(intervalIndex: u16, idealLength: f32): void {
    setF32(_currentLength(intervalIndex), idealLength)
}

export function getElasticFactor(intervalIndex: u16): f32 {
    return getF32(_elasticFactor(intervalIndex))
}

export function setElasticFactor(intervalIndex: u16, elasticFactor: f32): void {
    setF32(_elasticFactor(intervalIndex), elasticFactor)
}

function getIntervalRole(intervalIndex: u16): u8 {
    return getU8(_intervalRole(intervalIndex))
}

export function setIntervalRole(intervalIndex: u16, intervalRole: u8): void {
    setU8(_intervalRole(intervalIndex), intervalRole)
}

export function changeRestLength(intervalIndex: u16, restLength: f32): void {
    initializeCurrentLength(intervalIndex, getIntervalStateLength(intervalIndex, REST_STATE))
    setIntervalStateLength(intervalIndex, REST_STATE, restLength)
    let countdown = <u16>intervalCountdown
    setIntervalCountdown(intervalIndex, countdown)
    setBusyCountdown(countdown)
}

export function multiplyRestLength(intervalIndex: u16, factor: f32): void {
    let restLength = getIntervalStateLength(intervalIndex, REST_STATE)
    changeRestLength(intervalIndex, restLength * factor)
}

function getIntervalCountdown(intervalIndex: u16): u16 {
    return getU16(_intervalCountdown(intervalIndex))
}

function setIntervalCountdown(intervalIndex: u16, countdown: u16): void {
    setU16(_intervalCountdown(intervalIndex), countdown)
}

export function getIntervalStateLength(intervalIndex: u16, state: u8): f32 {
    return getF32(_stateLengthArray(intervalIndex) + F32 * state)
}

export function setIntervalStateLength(intervalIndex: u16, state: u8, stateLength: f32): void {
    setF32(_stateLengthArray(intervalIndex) + F32 * state, stateLength)
}

function getDisplacement(intervalIndex: u16): f32 {
    return getF32(_intervalDisplacements + F32 * intervalIndex)
}

function setDisplacement(intervalIndex: u16, displacement: f32): void {
    setF32(_intervalDisplacements + F32 * intervalIndex, displacement)
}

function calculateLength(intervalIndex: u16): f32 {
    let unit = _unit(intervalIndex)
    subVectors(unit, _location(omegaIndex(intervalIndex)), _location(alphaIndex(intervalIndex)))
    let length = magnitude(unit)
    multiplyScalar(unit, 1 / length)
    return length
}

function findIntervalIndex(joint0: u16, joint1: u16): u16 {
    let intervalCount = getIntervalCount()
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        let alpha = alphaIndex(thisInterval)
        let omega = omegaIndex(thisInterval)
        if (alpha === joint0 && omega === joint1 || alpha === joint1 && omega === joint0) {
            return thisInterval
        }
    }
    return intervalCountMax
}

export function findOppositeIntervalIndex(intervalIndex: u16): u16 {
    let tagAlpha = getJointTag(alphaIndex(intervalIndex))
    let tagOmega = getJointTag(omegaIndex(intervalIndex))
    let intervalCount = getIntervalCount()
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        if (thisInterval === intervalIndex) {
            continue
        }
        let thisTagAlpha = getJointTag(alphaIndex(thisInterval))
        let thisTagOmega = getJointTag(omegaIndex(thisInterval))
        let matchAlpha = tagAlpha === thisTagAlpha || tagAlpha === thisTagOmega
        let matchOmega = tagOmega === thisTagOmega || tagOmega === thisTagAlpha
        if (matchAlpha && matchOmega) {
            return thisInterval
        }
    }
    return intervalCountMax
}

function interpolateCurrentLength(intervalIndex: u16, state: u8): f32 {
    let currentLength = getCurrentLength(intervalIndex)
    let countdown = getIntervalCountdown(intervalIndex)
    if (countdown === 0) {
        return currentLength
    }
    let progress = (intervalCountdown - <f32>countdown) / intervalCountdown
    let stateLength = getIntervalStateLength(intervalIndex, state)
    return currentLength * (1 - progress) + stateLength * progress
}

function setLineColor(_color: usize, red: f32, green: f32, blue: f32): void {
    setX(_color, red)
    setY(_color, green)
    setZ(_color, blue)
    setX(_color + VECTOR_SIZE, red)
    setY(_color + VECTOR_SIZE, green)
    setZ(_color + VECTOR_SIZE, blue)
}

enum Limit {
    MinBarDisplacement = 0,
    MaxBarDisplacement = 1,
    MinCableDisplacement = 2,
    MaxCableDisplacement = 3,
}

const BIG_DISPLACEMENT: f32 = 1000

let minBarDisplacement: f32 = BIG_DISPLACEMENT
let maxBarDisplacement: f32 = -BIG_DISPLACEMENT
let minCableDisplacement: f32 = BIG_DISPLACEMENT
let maxCableDisplacement: f32 = -BIG_DISPLACEMENT

export function getLimit(limit: Limit): f32 {
    switch (limit) {
        case Limit.MinBarDisplacement:
            return minBarDisplacement
        case Limit.MaxBarDisplacement:
            return maxBarDisplacement
        case Limit.MinCableDisplacement:
            return minCableDisplacement
        case Limit.MaxCableDisplacement:
            return maxCableDisplacement
        default:
            return 666
    }
}

let _selectBars = false
let _selectCables = false
let _greaterThan = false
let _displacementThreshold: f32 = 0

export function setDisplacementThreshold(selectBars: boolean, selectCables: boolean, greaterThan: boolean, threshold: f32): void {
    _selectBars = selectBars
    _selectCables = selectCables
    _greaterThan = greaterThan
    _displacementThreshold = threshold
}

function outputLinesGeometry(): void {
    minBarDisplacement = BIG_DISPLACEMENT
    maxBarDisplacement = -BIG_DISPLACEMENT
    minCableDisplacement = BIG_DISPLACEMENT
    maxCableDisplacement = -BIG_DISPLACEMENT
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let displacement = getDisplacement(intervalIndex)
        let intervalRole = getIntervalRole(intervalIndex)
        if (intervalRole === IntervalRole.Bar) {
            displacement = -displacement
            if (displacement < minBarDisplacement) {
                minBarDisplacement = displacement
            }
            if (displacement > maxBarDisplacement) {
                maxBarDisplacement = displacement
            }
        } else { // cable role
            if (displacement < minCableDisplacement) {
                minCableDisplacement = displacement
            }
            if (displacement > maxCableDisplacement) {
                maxCableDisplacement = displacement
            }
        }
    }
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let _linePoint = _lineLocations + intervalIndex * VECTOR_SIZE * 2
        setVector(_linePoint, _location(alphaIndex(intervalIndex)))
        setVector(_linePoint + VECTOR_SIZE, _location(omegaIndex(intervalIndex)))
        let _lineColor = _lineColors + intervalIndex * VECTOR_SIZE * 2
        let directionalDisplacement = getDisplacement(intervalIndex)
        let intervalRole = getIntervalRole(intervalIndex)
        let isBar = intervalRole === IntervalRole.Bar
        let displacement = isBar ? -directionalDisplacement : directionalDisplacement
        let displacedEnough = _greaterThan ? displacement > _displacementThreshold : displacement < _displacementThreshold
        let selectNothing = !_selectBars && !_selectCables
        let selectThisType = (_selectBars && isBar) || (_selectCables && !isBar)
        let colored = selectNothing || selectThisType && displacedEnough
        let color = colored ? isBar ? BAR_COLOR : CABLE_COLOR : ATTENUATED_COLOR
        setLineColor(_lineColor, color[0], color[1], color[2])
    }
}

// Faces =====================================================================================

const FACE_SIZE: usize = INDEX_SIZE * 3

export function getFaceJointIndex(faceIndex: u16, jointNumber: usize): u16 {
    return getU16(_face(faceIndex) + jointNumber * INDEX_SIZE)
}

function setFaceJointIndex(faceIndex: u16, jointNumber: u16, v: u16): void {
    setU16(_face(faceIndex) + jointNumber * INDEX_SIZE, v)
}

function getFaceTag(faceIndex: u16, jointNumber: u16): u16 {
    return getJointTag(getFaceJointIndex(faceIndex, jointNumber))
}

function pushNormalTowardsJoint(normal: usize, location: usize, midpoint: usize): void {
    subVectors(_vX, location, midpoint)
    multiplyScalar(_vX, 1 / magnitude(_vX))
    addScaledVector(normal, _vX, 0.7)
    multiplyScalar(normal, 1 / magnitude(normal))
}

// Triangles and normals depicting the faces =================================================

function outputFaceGeometry(faceIndex: u16): void {
    let loc0 = _location(getFaceJointIndex(faceIndex, 0))
    let loc1 = _location(getFaceJointIndex(faceIndex, 1))
    let loc2 = _location(getFaceJointIndex(faceIndex, 2))
    // output the locations for rendering triangles
    setVector(_faceLocation(faceIndex, 0), loc0)
    setVector(_faceLocation(faceIndex, 1), loc1)
    setVector(_faceLocation(faceIndex, 2), loc2)
    // midpoint
    let midpoint = _faceMidpoint(faceIndex)
    zero(midpoint)
    add(midpoint, loc0)
    add(midpoint, loc1)
    add(midpoint, loc2)
    multiplyScalar(midpoint, 1 / 3.0)
    // normals for each vertex
    let normal0 = _faceNormal(faceIndex, 0)
    let normal1 = _faceNormal(faceIndex, 1)
    let normal2 = _faceNormal(faceIndex, 2)
    subVectors(_vA, loc1, loc0)
    subVectors(_vB, loc2, loc0)
    crossVectors(normal0, _vA, _vB)
    multiplyScalar(normal0, 1 / magnitude(normal0))
    setVector(normal1, normal0)
    setVector(normal2, normal0)
    // adjust them
    pushNormalTowardsJoint(normal0, loc0, midpoint)
    pushNormalTowardsJoint(normal1, loc1, midpoint)
    pushNormalTowardsJoint(normal2, loc2, midpoint)
}

export function findOppositeFaceIndex(faceIndex: u16): u16 {
    let tag0 = getFaceTag(faceIndex, 0)
    let tag1 = getFaceTag(faceIndex, 1)
    let tag2 = getFaceTag(faceIndex, 2)
    let faceCount = getFaceCount()
    for (let thisFace: u16 = 0; thisFace < faceCount; thisFace++) {
        if (thisFace === faceIndex) {
            continue
        }
        let thisTag0 = getFaceTag(thisFace, 0)
        let thisTag1 = getFaceTag(thisFace, 1)
        let thisTag2 = getFaceTag(thisFace, 2)
        let match0 = tag0 === thisTag0 || tag0 === thisTag1 || tag0 === thisTag2
        let match1 = tag1 === thisTag0 || tag1 === thisTag1 || tag1 === thisTag2
        let match2 = tag2 === thisTag0 || tag2 === thisTag1 || tag2 === thisTag2
        if (match0 && match1 && match2) {
            return thisFace
        }
    }
    return faceCount + 1
}

export function createFace(joint0Index: u16, joint1Index: u16, joint2Index: u16): usize {
    let faceCount = getFaceCount()
    if (faceCount + 1 >= faceCountMax) {
        return ERROR
    }
    let faceIndex = faceCount
    setFaceCount(faceCount + 1)
    setFaceJointIndex(faceIndex, 0, joint0Index)
    setFaceJointIndex(faceIndex, 1, joint1Index)
    setFaceJointIndex(faceIndex, 2, joint2Index)
    outputFaceGeometry(faceIndex)
    return faceIndex
}

export function removeFace(deadFaceIndex: u16): void {
    let faceCount = getFaceCount() - 1
    for (let faceIndex: u16 = deadFaceIndex; faceIndex < faceCount; faceIndex++) {
        let nextFace = faceIndex + 1
        setFaceJointIndex(faceIndex, 0, getFaceJointIndex(nextFace, 0))
        setFaceJointIndex(faceIndex, 1, getFaceJointIndex(nextFace, 1))
        setFaceJointIndex(faceIndex, 2, getFaceJointIndex(nextFace, 2))
        outputFaceGeometry(faceIndex)
    }
    setFaceCount(faceCount)
}

// Hexalot ====================================================================================

const HEXALOT_BITS_ALIGNED: u8 = 128
const HEXALOT_BITS: u8 = 127
const SPOT_CENTERS_SIZE = HEXALOT_BITS_ALIGNED * FLOATS_IN_VECTOR * F32
const SURFACE_SIZE = HEXALOT_BITS_ALIGNED * U8
const HEXALOT_SIZE = SPOT_CENTERS_SIZE + SURFACE_SIZE

function getSpotLocationX(bitNumber: u8): f32 {
    return getF32Global(bitNumber * FLOATS_IN_VECTOR * F32)
}

function getSpotLocationZ(bitNumber: u8): f32 {
    return getF32Global((bitNumber * FLOATS_IN_VECTOR + 2) * F32)
}

function getHexalotBit(bitNumber: u8): u8 {
    return getU8Global(SPOT_CENTERS_SIZE + bitNumber)
}

function getNearestSpotIndex(jointIndex: u16): u8 {
    let locPtr = _location(jointIndex)
    let x = getX(locPtr)
    let z = getZ(locPtr)
    let minimumQuadrance: f32 = 10000
    let nearestSpotIndex: u8 = HEXALOT_BITS
    for (let bit: u8 = 0; bit < HEXALOT_BITS; bit++) {
        let xx = getSpotLocationX(bit)
        let dx = xx - x
        let zz = getSpotLocationZ(bit)
        let dz = zz - z
        let q = dx * dx + dz * dz
        if (q < minimumQuadrance) {
            minimumQuadrance = q
            nearestSpotIndex = bit
        }
    }
    return nearestSpotIndex
}

function getTerrainUnder(jointIndex: u16): u8 {
    if (!useHexalot) {
        return LAND
    }
    // TODO: save the three most recent spotIndexes at the joint and check mostly only those
    // TODO: use minimum and maximum quadrance limits (inner and outer circle of hexagon)
    let spotIndex = getNearestSpotIndex(jointIndex)
    if (spotIndex === HEXALOT_BITS) {
        return HEXALOT_BITS
    }
    return getHexalotBit(spotIndex)
}

// Physics =====================================================================================

function intervalPhysics(intervalIndex: u16, busy: boolean, state: u8): void {
    let intervalRole = getIntervalRole(intervalIndex)
    let currentLength = interpolateCurrentLength(intervalIndex, state)
    let elasticFactor = getElasticFactor(intervalIndex)
    let displacement = calculateLength(intervalIndex) - currentLength
    setDisplacement(intervalIndex, displacement)
    let bar = intervalRole === IntervalRole.Bar
    let globalElasticFactor: f32 = busy ? 1.0 : bar ? pushElasticFactor : (displacement < 0 ? 0 : pullElasticFactor)
    let force = displacement * elasticFactor * globalElasticFactor
    addScaledVector(_force(alphaIndex(intervalIndex)), _unit(intervalIndex), force / 2)
    addScaledVector(_force(omegaIndex(intervalIndex)), _unit(intervalIndex), -force / 2)
    let mass = currentLength * currentLength * elasticFactor * (bar ? BAR_MASS_PER_LENGTH : CABLE_MASS_PER_LENGTH)
    let alphaMass = _intervalMass(alphaIndex(intervalIndex))
    setF32(alphaMass, getF32(alphaMass) + mass / 2)
    let omegaMass = _intervalMass(omegaIndex(intervalIndex))
    setF32(omegaMass, getF32(omegaMass) + mass / 2)
}

function jointPhysics(jointIndex: u16, gravityAbove: f32, dragAbove: f32): void {
    let velocityVectorPtr = _velocity(jointIndex)
    let velocityY = getY(velocityVectorPtr)
    let altitude = getY(_location(jointIndex))
    if (altitude > JOINT_RADIUS) { // far above
        setY(velocityVectorPtr, getY(velocityVectorPtr) - gravityAbove)
        multiplyScalar(_velocity(jointIndex), 1 - dragAbove)
    } else {
        let land = getTerrainUnder(jointIndex) === LAND
        let gravityBelow = land ? physicsAntigravityBelow : physicsAntigravityBelowWater
        let dragBelow = land ? physicsDragBelow : physicsDragBelowWater
        if (altitude > -JOINT_RADIUS) { // close to the surface
            let degreeAbove: f32 = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2)
            let degreeBelow: f32 = 1.0 - degreeAbove
            if (velocityY < 0 && land) {
                multiplyScalar(velocityVectorPtr, degreeAbove) // zero at the bottom
            }
            let gravityValue: f32 = gravityAbove * degreeAbove + gravityBelow * degreeBelow
            setY(velocityVectorPtr, getY(velocityVectorPtr) - gravityValue)
            let drag = dragAbove * degreeAbove + dragBelow * degreeBelow
            multiplyScalar(_velocity(jointIndex), 1 - drag)
        } else { // far under the surface
            if (velocityY < 0 && land) {
                zero(velocityVectorPtr)
            } else {
                setY(velocityVectorPtr, velocityY - gravityBelow)
            }
            multiplyScalar(_velocity(jointIndex), 1 - dragBelow)
        }
    }
}

function tick(maxIntervalCountdown: u16, state: u8, busy: boolean): u16 {
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        intervalPhysics(intervalIndex, busy, state)
        let countdown = getIntervalCountdown(intervalIndex)
        if (countdown === 0) {
            continue
        }
        if (countdown > maxIntervalCountdown) {
            maxIntervalCountdown = countdown
        }
        countdown--
        setIntervalCountdown(intervalIndex, countdown)
        if (countdown === 0) { // reached the end just now
            initializeCurrentLength(intervalIndex, getIntervalStateLength(intervalIndex, REST_STATE))
        }
    }
    let jointCount = getJointCount()
    let dragAbove = physicsDragAbove * (busy ? BUSY_DRAG_FACTOR : 1)
    let gravityAbove = busy ? <f32>0 : physicsGravityAbove
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        jointPhysics(jointIndex, gravityAbove, dragAbove)
        addScaledVector(_velocity(jointIndex), _force(jointIndex), 1.0 / getF32(_intervalMass(jointIndex)))
        zero(_force(jointIndex))
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(_location(jointIndex), _velocity(jointIndex))
        setF32(_intervalMass(jointIndex), AMBIENT_JOINT_MASS)
    }
    return maxIntervalCountdown
}

export function iterate(ticks: u16): boolean {
    let currentState = getCurrentState()
    let maxIntervalCountdown: u16 = 0
    let busy = isBusy()
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        maxIntervalCountdown = tick(maxIntervalCountdown, currentState, busy)
    }
    setAge(getAge() + <u32>ticks)
    outputLinesGeometry()
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    calculateJointMidpoint()
    if (maxIntervalCountdown === 0) {
        let busyCountdown = getBusyCountdown()
        if (busyCountdown === 0) {
            return false
        }
        setAltitude(JOINT_RADIUS)
        let nextCountdown: u16 = busyCountdown - ticks
        if (nextCountdown > busyCountdown) { // rollover
            nextCountdown = 0
        }
        setBusyCountdown(nextCountdown)
        if (nextCountdown === 0) {
            return false
        }
    }
    return true
}
