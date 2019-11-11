/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

declare function logBoolean(idx: u32, b: boolean): void

declare function logFloat(idx: u32, f: f32): void

declare function logInt(idx: u32, i: i32): void

// DECLARATION

const RESURFACE: f32 = 0.001
const ANTIGRAVITY: f32 = -0.001
const IN_UTERO_JOINT_MASS: f32 = 0.00001
const IN_UTERO_STIFFNESS: f32 = 0.1
const IN_UTERO_DRAG: f32 = 0.0000001

export enum FabricFeature {
    Gravity = 0,
    Drag = 1,
    PretenseFactor = 2,
    PushStrainFactor = 3,
    PushPullDifferential = 4,

    TicksPerFrame = 5,
    IntervalBusyTicks = 6,
    PretenseTicks = 7,

    PretenseIntensity = 8,
    SlackThreshold = 9,
    RadiusFactor = 10,
    MaxStiffness = 11,

    PushLength = 12,
    TriangleLength = 13,
    RingLength = 14,
    CrossLength = 15,
    BowMidLength = 16,
    BowEndLength = 17,
}

enum SurfaceCharacter {
    Sticky = 0,
    Bouncy = 1,
    Slippery = 2,
    Frozen = 3,
}

export function setSurfaceCharacter(character: SurfaceCharacter): void {
    surfaceCharacter = character
}

let surfaceCharacter: SurfaceCharacter = SurfaceCharacter.Bouncy

enum IntervalRole {
    Push = 0,
    Triangle = 1,
    Ring = 2,
    Cross = 3,
    BowMid = 4,
    BowEnd = 5,
}

export enum LifePhase {
    Busy = 0,
    Growing = 1,
    Shaping = 2,
    Slack = 3,
    Pretensing = 4,
    Pretenst = 5,
}

const LAND: u8 = 1
const ERROR: u16 = 65535

const MAX_INSTANCES: u16 = 32
const MAX_INTERVALS: u16 = 8192
const MAX_JOINTS: u16 = 2048
const MAX_FACES: u16 = 1024

const REST_STATE: u8 = 0
const STATE_COUNT: u8 = 16
const ATTENUATED_COLOR: f32[] = [
    0.1, 0.1, 0.1
]
const HOT_COLOR: f32[] = [
    1.0, 0.2, 0.0
]
const COLD_COLOR: f32[] = [
    0.0, 0.5, 1.0
]
const SLACK_COLOR: f32[] = [
    0.0, 1.0, 0.0
]
const CROSS_COLOR: f32[] = [
    1.0, 1.0, 0.0
]

export function getInstanceCount(): u16 {
    return MAX_INSTANCES
}

@inline()
function _8(index: u16): usize {
    return index * sizeof<u8>()
}

@inline()
function _16(index: u16): usize {
    return index * sizeof<u16>()
}

@inline()
function _32(index: u16): usize {
    return index * sizeof<u32>()
}

@inline()
function _32x3(index: u16): usize {
    return _32(index) * 3
}

const _32x3_JOINTS = MAX_JOINTS * sizeof<f32>() * 3
const _32x3_INTERVALS = MAX_INTERVALS * sizeof<f32>() * 3
const _32x3_FACES = MAX_FACES * sizeof<f32>() * 3
const _32_JOINTS = MAX_JOINTS * sizeof<f32>()
const _32_INTERVALS = MAX_INTERVALS * sizeof<f32>()
const _32_FACES = MAX_FACES * sizeof<f32>()
const _16_JOINTS = MAX_JOINTS * sizeof<u16>()
const _16_INTERVALS = MAX_INTERVALS * sizeof<u16>() * 3
const _16_FACES = MAX_FACES * sizeof<u16>() * 3
const _8_JOINTS = MAX_JOINTS * sizeof<u8>()
const _8_INTERVALS = MAX_INTERVALS * sizeof<u8>() * 3
const _8_FACES = MAX_FACES * sizeof<u8>() * 3

// SURFACE

const SURFACE_BITS: u8 = 128
const SURFACE_SIZE =
    SURFACE_BITS * sizeof<f32>() * 2 + // location of the spots
    SURFACE_BITS * sizeof<u8>() // bit values

function getSpotLocationX(bitNumber: u8): f32 {
    return load<f32>(bitNumber * sizeof<f32>())
}

function getSpotLocationZ(bitNumber: u8): f32 {
    return load<f32>(SURFACE_BITS * sizeof<f32>() + bitNumber * sizeof<f32>())
}

function getHexalotBit(bitNumber: u8): u8 {
    return load<u8>(SURFACE_BITS * sizeof<f32>() * 2 + bitNumber * sizeof<u8>())
}

function getNearestSpotIndex(jointIndex: u16): u8 {
    let locPtr = _location(jointIndex)
    let x = getX(locPtr)
    let z = getZ(locPtr)
    let minimumQuadrance: f32 = 10000
    let nearestSpotIndex: u8 = SURFACE_BITS
    for (let bit: u8 = 0; bit < SURFACE_BITS - 1; bit++) {
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

let useHexalot: boolean = false;

function getTerrainUnder(jointIndex: u16): u8 {
    if (!useHexalot) {
        return LAND
    }
    // TODO: save the three most recent spotIndexes at the joint and check mostly only those
    // TODO: use minimum and maximum quadrance limits (inner and outer circle of hexagon)
    let spotIndex = getNearestSpotIndex(jointIndex)
    if (spotIndex === SURFACE_BITS - 1) {
        return SURFACE_BITS
    }
    return getHexalotBit(spotIndex)
}

// INSTANCE

const _LOCATIONS = 0

@inline()
function _location(jointIndex: u16): usize {
    return _LOCATIONS + _32x3(jointIndex)
}

const _VELOCITIES = _LOCATIONS + _32x3_JOINTS

@inline()
function _velocity(jointIndex: u16): usize {
    return _VELOCITIES + _32x3(jointIndex)
}

const _FORCES = _VELOCITIES + _32x3_JOINTS

@inline()
function _force(jointIndex: u16): usize {
    return _FORCES + _32x3(jointIndex)
}

const _INTERVAL_MASSES = _FORCES + _32x3_JOINTS

@inline()
function _intervalMass(jointIndex: u16): usize {
    return _INTERVAL_MASSES + _32(jointIndex)
}

const _ALPHAS = _INTERVAL_MASSES + _32_JOINTS

@inline()
function _alpha(intervalIndex: u16): usize {
    return _ALPHAS + _16(intervalIndex)
}

const _OMEGAS = _ALPHAS + _16_INTERVALS

@inline()
function _omega(intervalIndex: u16): usize {
    return _OMEGAS + _16(intervalIndex)
}

const _CURRENT_LENGTHS = _OMEGAS + _16_INTERVALS

@inline()
function _currentLength(intervalIndex: u16): usize {
    return _CURRENT_LENGTHS + _32(intervalIndex)
}

const _INTERVAL_STRAINS = _CURRENT_LENGTHS + _32_INTERVALS

@inline()
function _intervalStrain(intervalIndex: u16): usize {
    return _INTERVAL_STRAINS + _32(intervalIndex)
}

const _STIFFNESSES = _INTERVAL_STRAINS + _32_INTERVALS

@inline()
function _stiffness(intervalIndex: u16): usize {
    return _STIFFNESSES + _32(intervalIndex)
}

const _LINEAR_DENSITIES = _STIFFNESSES + _32_INTERVALS

@inline()
function _linearDensity(intervalIndex: u16): usize {
    return _LINEAR_DENSITIES + _32(intervalIndex)
}

const _INTERVAL_ROLES = _LINEAR_DENSITIES + _32_INTERVALS

@inline()
function _intervalRole(intervalIndex: u16): usize {
    return _INTERVAL_ROLES + _8(intervalIndex)
}

const _INTERVAL_BUSY_COUNTDOWNS = _INTERVAL_ROLES + _8_INTERVALS

@inline()
function _intervalBusyTicks(intervalIndex: u16): usize {
    return _INTERVAL_BUSY_COUNTDOWNS + _16(intervalIndex)
}

const _STATE_LENGTHS = _INTERVAL_BUSY_COUNTDOWNS + _16_INTERVALS

@inline()
function _stateLength(intervalIndex: u16, state: u8): usize {
    return _STATE_LENGTHS + _32(intervalIndex) * STATE_COUNT + _32(state)
}

const _INTERVAL_UNITS = _STATE_LENGTHS + _32_INTERVALS * STATE_COUNT

@inline()
function _unit(intervalIndex: u16): usize {
    return _INTERVAL_UNITS + _32x3(intervalIndex)
}

const _FACE_JOINTS = _INTERVAL_UNITS + _32x3_INTERVALS

@inline()
function _faceJointIndex(faceIndex: u16, jointNumber: u16): usize {
    return _INTERVAL_UNITS + _FACE_JOINTS + _16(faceIndex) * 3 + _16(jointNumber)
}

const _FACE_MIDPOINTS = _FACE_JOINTS + _16_FACES * 3

@inline()
function _faceMidpoint(faceIndex: u16): usize {
    return _FACE_MIDPOINTS + _32x3(faceIndex)
}

const _FACE_NORMALS = _FACE_MIDPOINTS + _32x3_FACES

@inline()
function _faceNormal(faceIndex: u16, jointNumber: u16): usize {
    return _FACE_NORMALS + _32x3(faceIndex * 3) + _32x3(jointNumber)
}

const _FACE_LOCATIONS = _FACE_NORMALS + _32x3_FACES * 3

@inline()
function _faceLocation(faceIndex: u16, jointNumber: u16): usize {
    return _FACE_LOCATIONS + _32x3(faceIndex * 3) + _32x3(jointNumber)
}

const _LINE_LOCATIONS = _FACE_LOCATIONS + _32x3_FACES * 3

@inline()
function _lineLocation(intervalIndex: u16, omega: boolean): usize {
    return _LINE_LOCATIONS + _32x3(intervalIndex) * 2 + _32x3(omega ? 1 : 0)
}

const _LINE_COLORS = _LINE_LOCATIONS + _32x3_INTERVALS * 2

@inline()
function _lineColor(intervalIndex: u16, omega: boolean): usize {
    return _LINE_COLORS + _32x3(intervalIndex) * 2 + _32x3(omega ? 1 : 0)
}

// STATE

const _AGE = _LINE_COLORS + _32x3_INTERVALS * 2
const _MIDPOINT = _AGE + sizeof<u32>()
const _PRETENST = _MIDPOINT + sizeof<f32>() * 3
const _FABRIC_FEATURES = _PRETENST + sizeof<f32>()
const _LIFE_PHASE = _FABRIC_FEATURES + 30 * sizeof<f32>() // lots
const _A = _LIFE_PHASE + sizeof<u16>()
const _B = _A + sizeof<f32>() * 3
const _X = _B + sizeof<f32>() * 3
const _JOINT_COUNT = _X + sizeof<f32>() * 3
const _INTERVAL_COUNT = _JOINT_COUNT + sizeof<u16>()
const _FACE_COUNT = _INTERVAL_COUNT + sizeof<u16>()
const _FABRIC_BUSY_COUNTDOWN = _FACE_COUNT + sizeof<u16>()
const _PREVIOUS_STATE = _FABRIC_BUSY_COUNTDOWN + sizeof<u32>()
const _CURRENT_STATE = _PREVIOUS_STATE + sizeof<u16>()
const _NEXT_STATE = _CURRENT_STATE + sizeof<u16>()
const _FABRIC_END = _NEXT_STATE + sizeof<u16>()

// INSTANCES

const FABRIC_SIZE: usize = _FABRIC_END + sizeof<u16>() // may need alignment to 4 bytes

let instance: u16 = 0
let _instance: usize = 0

export function setInstance(index: u16): void {
    instance = index
    _instance = SURFACE_SIZE + instance * FABRIC_SIZE
}

export function cloneInstance(fromIndex: u16, toIndex: u16): void {
    let fromAddress = SURFACE_SIZE + fromIndex * FABRIC_SIZE
    let toAddress = SURFACE_SIZE + toIndex * FABRIC_SIZE
    for (let walk: usize = 0; walk < FABRIC_SIZE; walk += sizeof<u32>()) {
        store<u32>(toAddress + walk, load<u32>(fromAddress + walk))
    }
}

// ?????

export function init(): usize {
    const bytes = SURFACE_SIZE + FABRIC_SIZE * MAX_INSTANCES
    let blocks = (bytes) >> 16
    memory.grow(blocks + 1)
    return bytes
}

// Peek and Poke ================================================================================

@inline()
function getU8(vPtr: usize): u8 {
    return load<u8>(_instance + vPtr)
}

@inline()
function setU8(vPtr: usize, value: u8): void {
    store<u8>(_instance + vPtr, value)
}

@inline()
function getU16(vPtr: usize): u16 {
    return load<u16>(_instance + vPtr)
}

@inline()
function setU16(vPtr: usize, value: u16): void {
    store<u16>(_instance + vPtr, value)
}

@inline()
function getU32(vPtr: usize): u32 {
    return load<u32>(_instance + vPtr)
}

@inline()
function setU32(vPtr: usize, value: u32): void {
    store<u32>(_instance + vPtr, value)
}

@inline()
function getF32(vPtr: usize): f32 {
    return load<f32>(_instance + vPtr)
}

@inline()
function setF32(vPtr: usize, value: f32): void {
    store<f32>(_instance + vPtr, value)
}

@inline()
function getX(vPtr: usize): f32 {
    return load<f32>(_instance + vPtr)
}

@inline()
function setX(vPtr: usize, value: f32): void {
    store<f32>(_instance + vPtr, value)
}

@inline()
function getY(vPtr: usize): f32 {
    return load<f32>(_instance + vPtr + sizeof<f32>())
}

@inline()
function setY(vPtr: usize, value: f32): void {
    store<f32>(_instance + vPtr + sizeof<f32>(), value)
}

@inline()
function getZ(vPtr: usize): f32 {
    return load<f32>(_instance + vPtr + sizeof<f32>() * 2)
}

@inline()
function setZ(vPtr: usize, value: f32): void {
    store<f32>(_instance + vPtr + sizeof<f32>() * 2, value)
}

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

function dot(vPtr: usize, v: usize): f32 {
    return getX(vPtr) * getX(v) + getY(vPtr) * getY(v) + getZ(vPtr) * getZ(v)
}

function lerp(vPtr: usize, v: usize, interpolation: f32): void {
    let antiInterpolation = <f32>1.0 - interpolation
    setX(vPtr, getX(vPtr) * antiInterpolation + getX(v) * interpolation)
    setY(vPtr, getY(vPtr) * antiInterpolation + getY(v) * interpolation)
    setX(vPtr, getZ(vPtr) * antiInterpolation + getZ(v) * interpolation)
}

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

function setAge(value: u32): void {
    setU32(_AGE, value)
}

export function getAge(): u32 {
    return getU32(_AGE)
}

export function getJointCount(): u16 {
    return getU16(_JOINT_COUNT)
}

function setJointCount(value: u16): void {
    setU16(_JOINT_COUNT, value)
}

export function getIntervalCount(): u16 {
    return getU16(_INTERVAL_COUNT)
}

function setIntervalCount(value: u16): void {
    setU16(_INTERVAL_COUNT, value)
}

export function getFaceCount(): u16 {
    return getU16(_FACE_COUNT)
}

function setFaceCount(value: u16): void {
    setU16(_FACE_COUNT, value)
}

function getFeature(feature: FabricFeature): f32 {
    return getF32(_FABRIC_FEATURES + feature * sizeof<f32>())
}

function getFabricBusyCountdown(): u32 {
    return getU32(_FABRIC_BUSY_COUNTDOWN)
}

function setFabricBusyTicks(countdown: u32): void {
    setU32(_FABRIC_BUSY_COUNTDOWN, countdown)
}

function getPretensingNuance(): f32 {
    let fabricBusyCountdown = getFabricBusyCountdown()
    let pretensingCountdownMax = getFeature(FabricFeature.PretenseTicks)
    return (pretensingCountdownMax - <f32>fabricBusyCountdown) / pretensingCountdownMax
}

function getPreviousState(): u8 {
    return getU8(_PREVIOUS_STATE)
}

function setPreviousState(value: u8): void {
    setU8(_PREVIOUS_STATE, value)
}

export function getCurrentState(): u8 {
    return getU8(_CURRENT_STATE)
}

function setCurrentState(value: u8): void {
    setU8(_CURRENT_STATE, value)
}

export function getNextState(): u8 {
    return getU8(_NEXT_STATE)
}

export function setNextState(value: u8): void {
    setU8(_NEXT_STATE, value)
}

function getLifePhase(): LifePhase {
    return getU8(_LIFE_PHASE)
}

function setLifePhase(lifePhase: LifePhase): LifePhase {
    setU8(_LIFE_PHASE, <u8>lifePhase)
    return lifePhase
}

// Joints =====================================================================================

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
    let jointCount = getJointCount()
    if (jointCount + 1 >= MAX_JOINTS) {
        return ERROR
    }
    setJointCount(jointCount + 1)
    let jointIndex = jointCount
    setAll(_location(jointIndex), x, y, z)
    zero(_force(jointIndex))
    zero(_velocity(jointIndex))
    setF32(_intervalMass(jointIndex), IN_UTERO_JOINT_MASS)
    return jointIndex
}

function copyJointFromNext(jointIndex: u16): void {
    let nextIndex = jointIndex + 1
    setVector(_location(jointIndex), _location(nextIndex))
    setVector(_force(jointIndex), _force(nextIndex))
    setVector(_velocity(jointIndex), _velocity(nextIndex))
    setF32(_intervalMass(jointIndex), getF32(_intervalMass(nextIndex)))
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
    return altitude - lowY
}

function calculateJointMidpoint(): void {
    zero(_MIDPOINT)
    let jointCount = getJointCount()
    if (jointCount <= 0) {
        return
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(_MIDPOINT, _location(jointIndex))
    }
    multiplyScalar(_MIDPOINT, 1.0 / <f32>jointCount)
}

// Intervals =====================================================================================

export function createInterval(alpha: u16, omega: u16, intervalRole: u8, restLength: f32, stiffness: f32, linearDensity: f32): usize {
    let intervalCount = getIntervalCount()
    if (intervalCount + 1 >= MAX_INTERVALS) {
        return ERROR
    }
    let intervalIndex = intervalCount
    setIntervalCount(intervalCount + 1)
    setAlphaIndex(intervalIndex, alpha)
    setOmegaIndex(intervalIndex, omega)
    zero(_unit(intervalIndex))
    setIntervalRole(intervalIndex, intervalRole)
    initializeCurrentLength(intervalIndex, calculateRealLength(intervalIndex))
    setStiffness(intervalIndex, stiffness)
    setLinearDensity(intervalIndex, linearDensity)
    for (let state: u8 = REST_STATE; state < STATE_COUNT; state++) {
        setIntervalStateLength(intervalIndex, state, restLength)
    }
    setIntervalBusyTicks(intervalIndex, <u16>getFeature(FabricFeature.IntervalBusyTicks))
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
    setU16(_intervalBusyTicks(intervalIndex), getIntervalBusyTicks(nextIndex))
    setAlphaIndex(intervalIndex, alphaIndex(nextIndex))
    setOmegaIndex(intervalIndex, omegaIndex(nextIndex))
    setVector(_unit(intervalIndex), _unit(nextIndex))
    initializeCurrentLength(intervalIndex, getCurrentLength(nextIndex))
    setStiffness(intervalIndex, getStiffness(nextIndex))
    setLinearDensity(intervalIndex, getLinearDensity(nextIndex))
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

function getStiffness(intervalIndex: u16): f32 {
    return getF32(_stiffness(intervalIndex))
}

function setStiffness(intervalIndex: u16, stiffness: f32): void {
    setF32(_stiffness(intervalIndex), stiffness)
}

function getLinearDensity(intervalIndex: u16): f32 {
    return getF32(_linearDensity(intervalIndex))
}

function setLinearDensity(intervalIndex: u16, linearDensity: f32): void {
    setF32(_linearDensity(intervalIndex), linearDensity)
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
    let countdown = <u16>getFeature(FabricFeature.IntervalBusyTicks)
    setIntervalBusyTicks(intervalIndex, countdown)
    setFabricBusyTicks(countdown)
}

export function multiplyRestLength(intervalIndex: u16, factor: f32): void {
    let restLength = getIntervalStateLength(intervalIndex, REST_STATE)
    changeRestLength(intervalIndex, restLength * factor)
}

function getIntervalBusyTicks(intervalIndex: u16): u16 {
    return getU16(_intervalBusyTicks(intervalIndex))
}

function setIntervalBusyTicks(intervalIndex: u16, countdown: u16): void {
    setU16(_intervalBusyTicks(intervalIndex), countdown)
}

export function getIntervalStateLength(intervalIndex: u16, state: u8): f32 {
    return getF32(_stateLength(intervalIndex, state))
}

export function setIntervalStateLength(intervalIndex: u16, state: u8, stateLength: f32): void {
    setF32(_stateLength(intervalIndex, state), stateLength)
}

function getStrain(intervalIndex: u16): f32 {
    return getF32(_intervalStrain(intervalIndex))
}

function setStrain(intervalIndex: u16, strain: f32): void {
    setF32(_intervalStrain(intervalIndex), strain)
}

function calculateRealLength(intervalIndex: u16): f32 {
    let unit = _unit(intervalIndex)
    subVectors(unit, _location(omegaIndex(intervalIndex)), _location(alphaIndex(intervalIndex)))
    let length = magnitude(unit)
    multiplyScalar(unit, 1 / length)
    return length
}

function interpolateCurrentLength(intervalIndex: u16, state: u8): f32 {
    let currentLength = getCurrentLength(intervalIndex)
    let intervalBusyCountdown = getIntervalBusyTicks(intervalIndex)
    if (intervalBusyCountdown === 0) {
        return currentLength
    }
    let ticksMax = getFeature(FabricFeature.IntervalBusyTicks)
    let progress = (ticksMax - <f32>intervalBusyCountdown) / ticksMax
    let stateLength = getIntervalStateLength(intervalIndex, state)
    return currentLength * (1 - progress) + stateLength * progress
}

function setLineColor(intervalIndex: u16, red: f32, green: f32, blue: f32): void {
    let _color = _lineColor(intervalIndex, false)
    setX(_color, red)
    setY(_color, green)
    setZ(_color, blue)
    _color = _lineColor(intervalIndex, true)
    setX(_color, red)
    setY(_color, green)
    setZ(_color, blue)
}

enum Limit {
    MinPushStrain = 0,
    MaxPushStrain = 1,
    MinPullStrain = 2,
    MaxPullStrain = 3,
}

const BIG_STRAIN: f32 = 0.999

let minPushStrain: f32 = BIG_STRAIN
let maxPushStrain: f32 = -BIG_STRAIN
let minPullStrain: f32 = BIG_STRAIN
let maxPullStrain: f32 = -BIG_STRAIN

export function getLimit(limit: Limit): f32 {
    switch (limit) {
        case Limit.MinPushStrain:
            return minPushStrain
        case Limit.MaxPushStrain:
            return maxPushStrain
        case Limit.MinPullStrain:
            return minPullStrain
        case Limit.MaxPullStrain:
            return maxPullStrain
        default:
            return 666
    }
}

let colorPushes = true
let colorPulls = true

export function setColoring(pushes: boolean, pulls: boolean): void {
    colorPushes = pushes
    colorPulls = pulls
}

function outputLinesGeometry(): void {
    let slackThreshold = getFeature(FabricFeature.SlackThreshold)
    minPushStrain = BIG_STRAIN
    maxPushStrain = -BIG_STRAIN
    minPullStrain = BIG_STRAIN
    maxPullStrain = -BIG_STRAIN
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let strain = getStrain(intervalIndex)
        let intervalRole = getIntervalRole(intervalIndex)
        if (intervalRole === IntervalRole.Push) {
            strain = -strain
            if (strain < minPushStrain) {
                minPushStrain = strain
            }
            if (strain > maxPushStrain) {
                maxPushStrain = strain
            }
        } else { // pull
            if (strain < minPullStrain) {
                minPullStrain = strain
            }
            if (strain > maxPullStrain) {
                maxPullStrain = strain
            }
        }
    }
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setVector(_lineLocation(intervalIndex, false), _location(alphaIndex(intervalIndex)))
        setVector(_lineLocation(intervalIndex, true), _location(omegaIndex(intervalIndex)))
        let directionalStrain = getStrain(intervalIndex)
        let intervalRole = getIntervalRole(intervalIndex)
        let isPush: boolean = intervalRole === IntervalRole.Push
        let strain = isPush ? -directionalStrain : directionalStrain
        if (colorPushes && colorPulls) {
            if (strain < slackThreshold) {
                setLineColor(intervalIndex, SLACK_COLOR[0], SLACK_COLOR[1], SLACK_COLOR[2])
            } else {
                let color = isPush ? HOT_COLOR : COLD_COLOR
                setLineColor(intervalIndex, color[0], color[1], color[2])
            }
        } else if (colorPushes || colorPulls) {
            if (isPush && colorPulls || !isPush && colorPushes) {
                setLineColor(intervalIndex, ATTENUATED_COLOR[0], ATTENUATED_COLOR[1], ATTENUATED_COLOR[2])
            } else if (strain < slackThreshold) {
                setLineColor(intervalIndex, SLACK_COLOR[0], SLACK_COLOR[1], SLACK_COLOR[2])
            } else {
                let min = isPush ? minPushStrain : minPullStrain
                let max = isPush ? maxPushStrain : maxPullStrain
                let temperature = (strain - min) / (max - min)
                setLineColor(intervalIndex,
                    HOT_COLOR[0] * temperature + COLD_COLOR[0] * (1 - temperature),
                    HOT_COLOR[1] * temperature + COLD_COLOR[1] * (1 - temperature),
                    HOT_COLOR[2] * temperature + COLD_COLOR[2] * (1 - temperature)
                )
            }
        }
    }
}

// Triangles and normals depicting the faces =================================================

export function getFaceJointIndex(faceIndex: u16, jointNumber: u16): u16 {
    return getU16(_faceJointIndex(faceIndex, jointNumber))
}

function setFaceJointIndex(faceIndex: u16, jointNumber: u16, v: u16): void {
    setU16(_faceJointIndex(faceIndex, jointNumber), v)
}

function pushNormalTowardsJoint(normal: usize, location: usize, midpoint: usize): void {
    subVectors(_X, location, midpoint)
    multiplyScalar(_X, 1 / magnitude(_X))
    addScaledVector(normal, _X, 0.7)
    multiplyScalar(normal, 1 / magnitude(normal))
}

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
    subVectors(_A, loc1, loc0)
    subVectors(_B, loc2, loc0)
    crossVectors(normal0, _A, _B)
    multiplyScalar(normal0, 1 / magnitude(normal0))
    setVector(normal1, normal0)
    setVector(normal2, normal0)
    // adjust them
    pushNormalTowardsJoint(normal0, loc0, midpoint)
    pushNormalTowardsJoint(normal1, loc1, midpoint)
    pushNormalTowardsJoint(normal2, loc2, midpoint)
}

export function createFace(joint0Index: u16, joint1Index: u16, joint2Index: u16): usize {
    let faceCount = getFaceCount()
    if (faceCount + 1 >= MAX_FACES) {
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

// Physics =====================================================================================

function addIntervalMassToJoints(intervalIndex: u16, mass: f32): void {
    let _alphaMass = _intervalMass(alphaIndex(intervalIndex))
    setF32(_alphaMass, getF32(_alphaMass) + mass / 2)
    let _omegaMass = _intervalMass(omegaIndex(intervalIndex))
    setF32(_omegaMass, getF32(_omegaMass) + mass / 2)
}

function intervalPhysics(intervalIndex: u16, state: u8, lifePhase: LifePhase): void {
    let currentLength = interpolateCurrentLength(intervalIndex, state)
    let isPush = getIntervalRole(intervalIndex) === IntervalRole.Push
    if (isPush) {
        switch (lifePhase) {
            case LifePhase.Growing:
            case LifePhase.Shaping:
                currentLength *= 2
                break
            case LifePhase.Slack:
                break
            case LifePhase.Pretensing:
                currentLength *= 1 + getFeature(FabricFeature.PretenseFactor) * getPretensingNuance()
                break
            case LifePhase.Pretenst:
                currentLength *= 1 + getFeature(FabricFeature.PretenseFactor)
                break
        }
    }
    addIntervalMassToJoints(intervalIndex, currentLength * getLinearDensity(intervalIndex))
    let strain = (calculateRealLength(intervalIndex) - currentLength) / currentLength
    if (!isPush && strain < 0) {
        strain = 0
    }
    setStrain(intervalIndex, strain)
    // TODO: different stiffness for bar and cable
    let force = strain * (lifePhase <= LifePhase.Slack ? IN_UTERO_STIFFNESS : getStiffness(intervalIndex))
    addScaledVector(_force(alphaIndex(intervalIndex)), _unit(intervalIndex), force / 2)
    addScaledVector(_force(omegaIndex(intervalIndex)), _unit(intervalIndex), -force / 2)
}

function jointPhysics(jointIndex: u16, lifePhase: LifePhase, baseGravity: f32, baseDrag: f32): void {
    let altitude = getY(_location(jointIndex))
    let gravity: f32 = baseGravity
    let drag: f32 = baseDrag
    if (lifePhase <= LifePhase.Slack) {
        altitude = 1 // avoid surface effect
        gravity = 0
        drag = IN_UTERO_DRAG
    } else if (lifePhase === LifePhase.Pretensing) {
        gravity *= getPretensingNuance()
    }
    let _velocityVector = _velocity(jointIndex)
    if (altitude > 0) {
        setY(_velocityVector, getY(_velocityVector) - gravity)
        multiplyScalar(_velocity(jointIndex), 1 - drag)
        return
    }
    if (getTerrainUnder(jointIndex) === LAND) {
        let degreeSubmerged: f32 = -altitude < 1 ? -altitude : 0
        let degreeCushioned: f32 = 1 - degreeSubmerged
        switch (surfaceCharacter) {
            case SurfaceCharacter.Bouncy:
                multiplyScalar(_velocityVector, degreeCushioned)
                setY(_velocityVector, getY(_velocityVector) - ANTIGRAVITY * degreeSubmerged)
                break
            case SurfaceCharacter.Slippery:
                setY(_location(jointIndex), 0)
                setY(_velocityVector, 0)
                break
            case SurfaceCharacter.Sticky:
                multiplyScalar(_velocityVector, degreeCushioned)
                setY(_velocityVector, degreeSubmerged * RESURFACE)
                break
            case SurfaceCharacter.Frozen:
                zero(_velocityVector)
                setY(_location(jointIndex), -RESURFACE)
                break
        }
    }
}

function tick(maxIntervalBusyCountdown: u16, state: u8, lifePhase: LifePhase): u16 {
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        intervalPhysics(intervalIndex, state, lifePhase)
        let countdown = getIntervalBusyTicks(intervalIndex)
        if (countdown === 0) {
            continue
        }
        if (countdown > maxIntervalBusyCountdown) {
            maxIntervalBusyCountdown = countdown
        }
        countdown--
        setIntervalBusyTicks(intervalIndex, countdown)
        if (countdown === 0) { // reached the end just now
            initializeCurrentLength(intervalIndex, getIntervalStateLength(intervalIndex, REST_STATE))
        }
    }
    let jointCount = getJointCount()
    let ambientJointMass: f32 = 0
    switch (lifePhase) {
        case LifePhase.Growing:
        case LifePhase.Shaping:
        case LifePhase.Slack:
            ambientJointMass = IN_UTERO_JOINT_MASS
            break
        case LifePhase.Pretensing:
            ambientJointMass = IN_UTERO_JOINT_MASS * (1 - getPretensingNuance())
            break
        case LifePhase.Pretenst:
            break
    }
    let gravity = getFeature(FabricFeature.Gravity)
    let drag = getFeature(FabricFeature.Drag)
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        jointPhysics(jointIndex, lifePhase, gravity, drag)
        switch (lifePhase) {
            case LifePhase.Growing:
            case LifePhase.Shaping:
            case LifePhase.Slack:
                setVector(_velocity(jointIndex), _force(jointIndex))
                break
            case LifePhase.Pretensing:
            case LifePhase.Pretenst:
                addScaledVector(_velocity(jointIndex), _force(jointIndex), 1.0 / getF32(_intervalMass(jointIndex)))
                break
        }
        zero(_force(jointIndex))
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(_location(jointIndex), _velocity(jointIndex))
        setF32(_intervalMass(jointIndex), ambientJointMass)
    }
    return maxIntervalBusyCountdown
}

export function initInstance(): LifePhase {
    setAge(0)
    setJointCount(0)
    setIntervalCount(0)
    setFaceCount(0)
    setFabricBusyTicks(0)
    setPreviousState(REST_STATE)
    setCurrentState(REST_STATE)
    setNextState(REST_STATE)
    setF32(_PRETENST, 0)
    return setLifePhase(LifePhase.Busy)
}

export function finishGrowing(): LifePhase {
    setAltitude(0.0)
    return setLifePhase(LifePhase.Shaping)
}

function slacken(): LifePhase {
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let lengthNow: f32 = calculateRealLength(intervalIndex)
        initializeCurrentLength(intervalIndex, lengthNow)
        setIntervalStateLength(intervalIndex, REST_STATE, lengthNow)
    }
    let jointCount = getJointCount()
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        zero(_force(jointIndex))
        zero(_velocity(jointIndex))
    }
    setAltitude(0.0)
    return setLifePhase(LifePhase.Slack)
}

function startPretensing(): LifePhase {
    setAltitude(0.0)
    setFabricBusyTicks(<u32>getFeature(FabricFeature.PretenseTicks))
    return setLifePhase(LifePhase.Pretensing)
}

export function iterate(ticks: u16, nextLifePhase: LifePhase): LifePhase {
    let age = getAge()
    let lifePhase = getLifePhase()
    switch (lifePhase) {
        case LifePhase.Busy:
            if (nextLifePhase === LifePhase.Growing) {
                setAltitude(0.0)
                setLifePhase(nextLifePhase)
            }
            break
        case LifePhase.Growing:
            break
        case LifePhase.Shaping:
            if (nextLifePhase === LifePhase.Slack) {
                return slacken()
            }
            break
        case LifePhase.Slack:
            if (nextLifePhase === LifePhase.Pretensing) {
                return startPretensing()
            }
            break
        case LifePhase.Pretensing:
            break
        case LifePhase.Pretenst:
            if (nextLifePhase === LifePhase.Slack) {
                return slacken()
            }
            break
    }
    let intervalBusyCountdown: u16 = 0
    if (ticks > 0) {
        let currentState = getCurrentState()
        for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
            intervalBusyCountdown = tick(intervalBusyCountdown, currentState, lifePhase)
        }
        setAge(age + <u32>ticks)
    }
    calculateJointMidpoint()
    outputLinesGeometry()
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    let fabricBusyCountdown = getFabricBusyCountdown()
    if (intervalBusyCountdown === 0 || fabricBusyCountdown > 0) {
        if (fabricBusyCountdown === 0) {
            if (lifePhase === LifePhase.Pretensing) {
                return setLifePhase(LifePhase.Pretenst)
            }
            return lifePhase
        }
        let nextCountdown: u32 = fabricBusyCountdown - ticks
        if (nextCountdown > fabricBusyCountdown) { // rollover
            nextCountdown = 0
        }
        setFabricBusyTicks(nextCountdown)
        if (nextCountdown === 0) {
            return lifePhase
        }
    }
    return LifePhase.Busy
}

export function _fabricOffset(): usize {
    return SURFACE_SIZE + FABRIC_SIZE * instance
}

export function _midpoint(): usize {
    return _MIDPOINT
}

export function _lineLocations(): usize {
    return _LINE_LOCATIONS
}

export function _lineColors(): usize {
    return _LINE_COLORS
}

export function _faceMidpoints(): usize {
    return _FACE_MIDPOINTS
}

export function _faceNormals(): usize {
    return _FACE_NORMALS
}

export function _faceLocations(): usize {
    return _FACE_LOCATIONS
}

export function _jointLocations(): usize {
    return _LOCATIONS
}

export function _intervalUnits(): usize {
    return _INTERVAL_UNITS
}

export function _intervalStrains(): usize {
    return _INTERVAL_STRAINS
}

export function _stiffnesses(): usize {
    return _STIFFNESSES
}

export function _linearDensities(): usize {
    return _LINEAR_DENSITIES
}

export function _fabricFeatures(): usize {
    return _FABRIC_FEATURES
}

