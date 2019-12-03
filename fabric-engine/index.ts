/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

declare function logBoolean(idx: u32, b: boolean): void

declare function logFloat(idx: u32, f: f32): void

declare function logInt(idx: u32, i: i32): void

// DECLARATION
const FEATURE_FLOATS = 30

const FROZEN_ALTITUDE: f32 = -0.02
const RESURFACE: f32 = 0.01
const ANTIGRAVITY: f32 = -0.001
const IN_UTERO_JOINT_MASS: f32 = 0.00001
const TINY_FLOAT = 1e-30

export enum FabricFeature {
    Gravity = 0,
    Drag = 1,
    PretenstFactor = 2,
    IterationsPerFrame = 3,
    IntervalCountdown = 4,
    RealizingCountdown = 5,
    FacePullEndZone = 6,
    FacePullOrientationForce = 7,
    SlackThreshold = 8,
    ShapingPretenstFactor = 9,
    ShapingStiffnessFactor = 10,
    ShapingDrag = 11,
}

enum SurfaceCharacter {
    Frozen = 0,
    Sticky = 1,
    Slippery = 2,
    Bouncy = 3,
}

export function setSurfaceCharacter(character: SurfaceCharacter): void {
    surfaceCharacter = character
}

let surfaceCharacter: SurfaceCharacter = SurfaceCharacter.Frozen

enum IntervalRole {
    NexusPush = 0,
    ColumnPush = 1,
    Triangle = 2,
    Ring = 3,
    Cross = 4,
    BowMid = 5,
    BowEnd = 6,
    FacePull = 7,
    Shaper = 8,
}

@inline()
function isPush(intervalRole: IntervalRole): boolean {
    return intervalRole === IntervalRole.NexusPush || intervalRole === IntervalRole.ColumnPush
}

export enum Stage {
    Busy = 0,
    Growing = 1,
    Shaping = 2,
    Slack = 3,
    Realizing = 4,
    Realized = 6,
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
const LOST_COLOR: f32[] = [
    1.0, 1.0, 1.0
]
const SLACK_COLOR: f32[] = [
    0.0, 1.0, 0.0
]

const ROLE_COLORS: f32[][] = [
    [0.799, 0.519, 0.304],
    [0.879, 0.295, 0.374],
    [0.215, 0.629, 0.747],
    [0.618, 0.126, 0.776],
    [0.670, 0.627, 0.398],
    [0.242, 0.879, 0.410],
    [0.613, 0.692, 0.382],
    [0.705, 0.709, 0.019],
    [0.577, 0.577, 0.577],
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
const _16_INTERVALS = MAX_INTERVALS * sizeof<u16>() * 3
const _16_FACES = MAX_FACES * sizeof<u16>() * 3
const _8_INTERVALS = MAX_INTERVALS * sizeof<u8>() * 3

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

const _INTERVAL_STRAIN_NUANCES = _INTERVAL_STRAINS + _32_INTERVALS

@inline()
function _intervalStrainNuance(intervalIndex: u16): usize {
    return _INTERVAL_STRAIN_NUANCES + _32(intervalIndex)
}

const _STIFFNESSES = _INTERVAL_STRAIN_NUANCES + _32_INTERVALS

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

const _INTERVAL_BUSY_MAX_COUNTDOWNS = _INTERVAL_ROLES + _8_INTERVALS

@inline()
function _intervalBusyMaxTicks(intervalIndex: u16): usize {
    return _INTERVAL_BUSY_MAX_COUNTDOWNS + _16(intervalIndex)
}

const _INTERVAL_BUSY_COUNTDOWNS = _INTERVAL_BUSY_MAX_COUNTDOWNS + _16_INTERVALS

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
    return _FACE_JOINTS + _16(faceIndex) * 3 + _16(jointNumber)
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
const _FABRIC_FEATURES = _MIDPOINT + sizeof<f32>() * 3
const _LIFE_PHASE = _FABRIC_FEATURES + FEATURE_FLOATS * sizeof<f32>() // lots
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

function lerp(a: usize, b: usize, interpolation: f32): void {
    let antiInterpolation = <f32>1.0 - interpolation
    setX(a, getX(a) * antiInterpolation + getX(b) * interpolation)
    setY(a, getY(a) * antiInterpolation + getY(b) * interpolation)
    setX(a, getZ(a) * antiInterpolation + getZ(b) * interpolation)
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

function getU16Feature(feature: FabricFeature): u16 {
    return <u16>getF32(_FABRIC_FEATURES + feature * sizeof<f32>())
}

function getFabricBusyCountdown(): u32 {
    return getU32(_FABRIC_BUSY_COUNTDOWN)
}

function setFabricBusyTicks(countdown: u32): void {
    setU32(_FABRIC_BUSY_COUNTDOWN, countdown)
}

function getRealizingNuance(): f32 {
    let fabricBusyCountdown = getFabricBusyCountdown()
    let countdown = getFeature(FabricFeature.RealizingCountdown)
    return (countdown - <f32>fabricBusyCountdown) / countdown
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

function getStage(): Stage {
    return getU8(_LIFE_PHASE)
}

function setStage(stage: Stage): Stage {
    setU8(_LIFE_PHASE, <u8>stage)
    return stage
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
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        let y = getY(_location(jointIndex))
        if (y < lowY) {
            lowY = y
        }
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        let jPtr = _location(jointIndex)
        setY(jPtr, getY(jPtr) + altitude - lowY)
        zero(_velocity(jointIndex))
    }
    return altitude - lowY
}

// Intervals =====================================================================================

export function createInterval(alpha: u16, omega: u16, intervalRole: u8, restLength: f32, stiffness: f32, linearDensity: f32, countdown: u16): usize {
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
    initializeCurrentLength(intervalIndex, calculateRealLength(intervalIndex, intervalRole))
    setStiffness(intervalIndex, stiffness)
    setLinearDensity(intervalIndex, linearDensity)
    for (let state: u8 = REST_STATE; state < STATE_COUNT; state++) {
        setIntervalStateLength(intervalIndex, state, restLength)
    }
    setIntervalBusyMaxTicks(intervalIndex, countdown)
    setIntervalBusyTicks(intervalIndex, countdown)
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
    setU16(_intervalBusyMaxTicks(intervalIndex), getIntervalBusyMaxTicks(nextIndex))
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

export function changeRestLength(intervalIndex: u16, restLength: f32, countdown: u16): void {
    initializeCurrentLength(intervalIndex, getIntervalStateLength(intervalIndex, REST_STATE))
    setIntervalStateLength(intervalIndex, REST_STATE, restLength)
    setIntervalBusyMaxTicks(intervalIndex, countdown)
    setIntervalBusyTicks(intervalIndex, countdown)
    setFabricBusyTicks(countdown)
}

export function multiplyRestLength(intervalIndex: u16, factor: f32, countdown: u16): void {
    let restLength = getIntervalStateLength(intervalIndex, REST_STATE)
    changeRestLength(intervalIndex, restLength * factor, countdown)
}

function getIntervalBusyMaxTicks(intervalIndex: u16): u16 {
    return getU16(_intervalBusyMaxTicks(intervalIndex))
}

function getIntervalBusyTicks(intervalIndex: u16): u16 {
    return getU16(_intervalBusyTicks(intervalIndex))
}

function setIntervalBusyMaxTicks(intervalIndex: u16, countdown: u16): void {
    setU16(_intervalBusyMaxTicks(intervalIndex), countdown)
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

function getStrainNuance(intervalIndex: u16): f32 {
    return getF32(_intervalStrainNuance(intervalIndex))
}

function setStrainNuance(intervalIndex: u16, nuance: f32): void {
    setF32(_intervalStrainNuance(intervalIndex), nuance)
}

function normalize(_unit: usize): f32 {
    let length = magnitude(_unit)
    multiplyScalar(_unit, 1 / length)
    return length
}

function calculateRealLength(intervalIndex: u16, intervalRole: IntervalRole): f32 {
    let _intervalUnit = _unit(intervalIndex)
    if (intervalRole === IntervalRole.FacePull) {
        subVectors(_intervalUnit, _faceMidpoint(omegaIndex(intervalIndex)), _faceMidpoint(alphaIndex(intervalIndex)))
    } else {
        subVectors(_intervalUnit, _location(omegaIndex(intervalIndex)), _location(alphaIndex(intervalIndex)))
    }
    return normalize(_intervalUnit)
}

function interpolateCurrentLength(intervalIndex: u16, state: u8): f32 {
    let currentLength = getCurrentLength(intervalIndex)
    let intervalBusyTicks = getIntervalBusyTicks(intervalIndex)
    if (intervalBusyTicks === 0) {
        return currentLength
    }
    let ticksMax = getIntervalBusyMaxTicks(intervalIndex)
    let progress = (ticksMax - <f32>intervalBusyTicks) / ticksMax
    let stateLength = getIntervalStateLength(intervalIndex, state)
    return currentLength * (1 - progress) + stateLength * progress
}

function setLineColorRGB(intervalIndex: u16, red: f32, green: f32, blue: f32): void {
    let _color = _lineColor(intervalIndex, false)
    setX(_color, red)
    setY(_color, green)
    setZ(_color, blue)
    _color = _lineColor(intervalIndex, true)
    setX(_color, red)
    setY(_color, green)
    setZ(_color, blue)
}

function setLineColor(intervalIndex: u16, color: f32[]): void {
    setLineColorRGB(intervalIndex, color[0], color[1], color[2])
}

function setLineColorNuance(intervalIndex: u16, nuance: f32): void {
    let rainbowIndex = <i32>(nuance * (<f32>RAINBOW.length / <f32>3.01))
    let r = RAINBOW[rainbowIndex * 3]
    let g = RAINBOW[rainbowIndex * 3 + 1]
    let b = RAINBOW[rainbowIndex * 3 + 2]
    setLineColorRGB(intervalIndex, r, g, b)
}

function toNuance(numerator: f32, denominator: f32): f32 {
    if (denominator < TINY_FLOAT && denominator > -TINY_FLOAT) {
        logFloat(667, denominator)
        return 0.5
    }
    let nuance: f32 = numerator / denominator
    return nuance < 0 ? 0 : nuance > 1 ? 1 : nuance
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
            return -1
    }
}

let colorPushes = true
let colorPulls = true

export function setColoring(pushes: boolean, pulls: boolean): void {
    colorPushes = pushes
    colorPulls = pulls
}

function outputIntervals(): void {
    minPushStrain = BIG_STRAIN
    maxPushStrain = -BIG_STRAIN
    minPullStrain = BIG_STRAIN
    maxPullStrain = -BIG_STRAIN
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let strain = getStrain(intervalIndex)
        let intervalRole = getIntervalRole(intervalIndex)
        if (isPush(intervalRole)) {
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
    setFaceMidpoints()
    let slackThreshold = getFeature(FabricFeature.SlackThreshold)
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let intervalRole = getIntervalRole(intervalIndex)
        let outputAlpha = _lineLocation(intervalIndex, false)
        let outputOmega = _lineLocation(intervalIndex, true)
        if (intervalRole === IntervalRole.FacePull) {
            setVector(outputAlpha, _faceMidpoint(alphaIndex(intervalIndex)))
            setVector(outputOmega, _faceMidpoint(omegaIndex(intervalIndex)))
        } else {
            setVector(outputAlpha, _location(alphaIndex(intervalIndex)))
            setVector(outputOmega, _location(omegaIndex(intervalIndex)))
        }
        let strain = getStrain(intervalIndex)
        let absoluteStrain = strain < 0 ? -strain : strain
        let nuance: f32 = 0.5
        if (!colorPushes && !colorPulls) {
            let roleColor = ROLE_COLORS[intervalRole]
            setLineColor(intervalIndex, roleColor)
        } else if (colorPushes && colorPulls) {
            if (absoluteStrain < slackThreshold) {
                setLineColor(intervalIndex, SLACK_COLOR)
            } else if (maxPushStrain + maxPullStrain < TINY_FLOAT) {
                setLineColor(intervalIndex, LOST_COLOR)
            } else {
                nuance = toNuance(strain + maxPushStrain, maxPushStrain + maxPullStrain)
                setLineColorNuance(intervalIndex, nuance)
            }
        } else if (isPush(intervalRole)) {
            if (colorPulls) {
                setLineColor(intervalIndex, ATTENUATED_COLOR)
            } else if (absoluteStrain < slackThreshold) {
                setLineColor(intervalIndex, SLACK_COLOR)
            } else if (maxPushStrain - minPushStrain < TINY_FLOAT) {
                setLineColor(intervalIndex, LOST_COLOR)
            } else {
                nuance = toNuance(-strain - minPushStrain, maxPushStrain - minPushStrain)
                setLineColorNuance(intervalIndex, nuance)
            }
        } else { // pull
            if (colorPushes) {
                setLineColor(intervalIndex, ATTENUATED_COLOR)
            } else if (absoluteStrain < slackThreshold) {
                setLineColor(intervalIndex, SLACK_COLOR)
            } else if (maxPullStrain - minPullStrain < TINY_FLOAT) {
                setLineColor(intervalIndex, LOST_COLOR)
            } else {
                nuance = toNuance(strain - minPullStrain, maxPullStrain - minPullStrain)
                setLineColorNuance(intervalIndex, nuance)
            }
        }
        setStrainNuance(intervalIndex, nuance)
    }
}

// Triangles and normals depicting the faces =================================================

export function getFaceJointIndex(faceIndex: u16, jointNumber: u16): u16 {
    return getU16(_faceJointIndex(faceIndex, jointNumber))
}

function setFaceJointIndex(faceIndex: u16, jointNumber: u16, v: u16): void {
    setU16(_faceJointIndex(faceIndex, jointNumber), v)
}

// function pushNormalTowardsJoint(normal: usize, location: usize, midpoint: usize): void {
//     subVectors(_X, location, midpoint)
//     multiplyScalar(_X, 1 / magnitude(_X))
//     addScaledVector(normal, _X, 0.7)
//     multiplyScalar(normal, 1 / magnitude(normal))
// }

function setFaceMidpoints(): void {
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        let _midpoint = _faceMidpoint(faceIndex)
        zero(_midpoint)
        let loc0 = _location(getFaceJointIndex(faceIndex, 0))
        let loc1 = _location(getFaceJointIndex(faceIndex, 1))
        let loc2 = _location(getFaceJointIndex(faceIndex, 2))
        add(_midpoint, loc0)
        add(_midpoint, loc1)
        add(_midpoint, loc2)
        multiplyScalar(_midpoint, 1 / 3.0)
    }
}

function setFaceVectors(): void {
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        let loc0 = _location(getFaceJointIndex(faceIndex, 0))
        let loc1 = _location(getFaceJointIndex(faceIndex, 1))
        let loc2 = _location(getFaceJointIndex(faceIndex, 2))
        // output the locations for rendering triangles
        setVector(_faceLocation(faceIndex, 0), loc0)
        setVector(_faceLocation(faceIndex, 1), loc1)
        setVector(_faceLocation(faceIndex, 2), loc2)
        // midpoint
        // normals for each vertex
        let _normal0 = _faceNormal(faceIndex, 0)
        let _normal1 = _faceNormal(faceIndex, 1)
        let _normal2 = _faceNormal(faceIndex, 2)
        subVectors(_A, loc1, loc0)
        subVectors(_B, loc2, loc0)
        crossVectors(_normal0, _A, _B)
        multiplyScalar(_normal0, 1 / magnitude(_normal0))
        setVector(_normal1, _normal0)
        setVector(_normal2, _normal0)
        // adjust them
        // let midpoint = _faceMidpoint(faceIndex)
        // pushNormalTowardsJoint(_normal0, loc0, midpoint)
        // pushNormalTowardsJoint(_normal1, loc1, midpoint)
        // pushNormalTowardsJoint(_normal2, loc2, midpoint)
    }
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
    return faceIndex
}

export function removeFace(deadFaceIndex: u16): void {
    let faceCount = getFaceCount() - 1
    for (let faceIndex: u16 = deadFaceIndex; faceIndex < faceCount; faceIndex++) {
        let nextFace = faceIndex + 1
        setFaceJointIndex(faceIndex, 0, getFaceJointIndex(nextFace, 0))
        setFaceJointIndex(faceIndex, 1, getFaceJointIndex(nextFace, 1))
        setFaceJointIndex(faceIndex, 2, getFaceJointIndex(nextFace, 2))
    }
    setFaceCount(faceCount)
}

// Physics =====================================================================================

function pushPullEndZonePhysics(intervalIndex: u16, alphaFaceIndex: u16, omegaFaceIndex: u16, finalNuance: f32, orientationForce: f32): void {
    let alphaDistanceSum: f32 = 0
    let omegaDistanceSum: f32 = 0
    let _alphaMidpoint = _faceMidpoint(alphaFaceIndex)
    let _omegaMidpoint = _faceMidpoint(omegaFaceIndex)
    for (let faceJoint: u16 = 0; faceJoint < 3; faceJoint++) {
        alphaDistanceSum += distance(_location(getFaceJointIndex(alphaFaceIndex, faceJoint)), _omegaMidpoint)
        omegaDistanceSum += distance(_location(getFaceJointIndex(omegaFaceIndex, faceJoint)), _alphaMidpoint)
    }
    let averageAlpha = alphaDistanceSum / <f32>3
    let averageOmega = omegaDistanceSum / <f32>3
    for (let faceJoint: u16 = 0; faceJoint < 3; faceJoint++) {
        let faceAlphaJointIndex = getFaceJointIndex(alphaFaceIndex, faceJoint)
        let faceOmegaJointIndex = getFaceJointIndex(omegaFaceIndex, faceJoint)
        let _alpha = _location(faceAlphaJointIndex)
        let _omega = _location(faceOmegaJointIndex)
        subVectors(_A, _alpha, _omegaMidpoint)
        subVectors(_B, _omega, _alphaMidpoint)
        let lengthAlpha = normalize(_A)
        let lengthOmega = normalize(_B)
        let pushAlphaJoint = finalNuance * (averageAlpha - lengthAlpha)
        let pushOmegaJoint = finalNuance * (averageOmega - lengthOmega)
        addScaledVector(_force(faceAlphaJointIndex), _A, pushAlphaJoint * orientationForce)
        addScaledVector(_force(faceOmegaJointIndex), _B, pushOmegaJoint * orientationForce)
    }

}

function intervalPhysics(intervalIndex: u16, state: u8, stage: Stage): void {
    let currentLength = interpolateCurrentLength(intervalIndex, state)
    let intervalRole = getIntervalRole(intervalIndex)
    let push = isPush(intervalRole)
    if (push) {
        switch (stage) {
            case Stage.Growing:
            case Stage.Shaping:
                currentLength *= 1 + getFeature(FabricFeature.ShapingPretenstFactor)
                break
            case Stage.Slack:
                break
            case Stage.Realizing:
                currentLength *= 1 + getFeature(FabricFeature.PretenstFactor) * getRealizingNuance()
                break
            case Stage.Realized:
                currentLength *= 1 + getFeature(FabricFeature.PretenstFactor)
                break
        }
    }
    let realLength = calculateRealLength(intervalIndex, intervalRole)
    let strain = (realLength - currentLength) / currentLength
    if (push && strain > 0 || !push && strain < 0) {
        strain = 0
    }
    setStrain(intervalIndex, strain)
    let force = strain * getStiffness(intervalIndex)
    if (stage <= Stage.Slack) {
        force *= getFeature(FabricFeature.ShapingStiffnessFactor)
    }
    if (intervalRole === IntervalRole.FacePull) {
        force /= 6
        let alphaFaceIndex = alphaIndex(intervalIndex)
        let omegaFaceIndex = omegaIndex(intervalIndex)
        for (let faceJoint: u16 = 0; faceJoint < 3; faceJoint++) {
            let faceAlphaJointIndex = getFaceJointIndex(alphaFaceIndex, faceJoint)
            let faceOmegaJointIndex = getFaceJointIndex(omegaFaceIndex, faceJoint)
            addScaledVector(_force(faceAlphaJointIndex), _unit(intervalIndex), force)
            addScaledVector(_force(faceOmegaJointIndex), _unit(intervalIndex), -force)
        }
        let endZone = getFeature(FabricFeature.FacePullEndZone)
        if (currentLength <= endZone) {
            let finalNuance: f32 = (endZone - currentLength) / endZone
            let orientationForce = getFeature(FabricFeature.FacePullOrientationForce)
            pushPullEndZonePhysics(intervalIndex, alphaFaceIndex, omegaFaceIndex, finalNuance, orientationForce)
        }
    } else {
        force /= 2
        addScaledVector(_force(alphaIndex(intervalIndex)), _unit(intervalIndex), force)
        addScaledVector(_force(omegaIndex(intervalIndex)), _unit(intervalIndex), -force)
        let mass = currentLength * getLinearDensity(intervalIndex) / 2
        let _alphaMass = _intervalMass(alphaIndex(intervalIndex))
        setF32(_alphaMass, getF32(_alphaMass) + mass)
        let _omegaMass = _intervalMass(omegaIndex(intervalIndex))
        setF32(_omegaMass, getF32(_omegaMass) + mass)
    }
}

function jointPhysics(jointIndex: u16, gravityAbove: f32, dragAbove: f32, activeSurface: boolean): void {
    let altitude = getY(_location(jointIndex))
    let _forceVector = _force(jointIndex)
    let _velocityVector = _velocity(jointIndex)
    if (altitude > 0 || !activeSurface) {
        setY(_velocityVector, getY(_velocityVector) - gravityAbove)
        multiplyScalar(_velocityVector, 1 - dragAbove)
        addScaledVector(_velocityVector, _forceVector, 1.0 / getF32(_intervalMass(jointIndex)))
    } else if (getTerrainUnder(jointIndex) === LAND) {
        addScaledVector(_velocityVector, _forceVector, 1.0 / getF32(_intervalMass(jointIndex)))
        let degreeSubmerged: f32 = -altitude < 1 ? -altitude : 0
        let degreeCushioned: f32 = 1 - degreeSubmerged
        switch (surfaceCharacter) {
            case SurfaceCharacter.Frozen:
                zero(_velocityVector)
                setY(_location(jointIndex), -RESURFACE)
                break
            case SurfaceCharacter.Sticky:
                multiplyScalar(_velocityVector, degreeCushioned)
                setY(_velocityVector, degreeSubmerged * RESURFACE)
                break
            case SurfaceCharacter.Slippery:
                setY(_location(jointIndex), 0)
                setY(_velocityVector, 0)
                break
            case SurfaceCharacter.Bouncy:
                multiplyScalar(_velocityVector, degreeCushioned)
                setY(_velocityVector, getY(_velocityVector) - ANTIGRAVITY * degreeSubmerged)
                break
        }
    } else {
        logInt(1, 666) // not implemented
    }
}

function tick(maxIntervalBusyCountdown: u16, state: u8, stage: Stage): u16 {
    setFaceMidpoints()
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        intervalPhysics(intervalIndex, state, stage)
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
    let pretensingNuance = getRealizingNuance()
    let gravity = getFeature(FabricFeature.Gravity)
    let shapingDrag = getFeature(FabricFeature.ShapingDrag)
    let drag = getFeature(FabricFeature.Drag)
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        switch (stage) {
            case Stage.Growing:
            case Stage.Shaping:
                jointPhysics(jointIndex, 0, shapingDrag, false)
                break
            case Stage.Slack:
                break
            case Stage.Realizing:
                jointPhysics(jointIndex, gravity * pretensingNuance, drag, true)
                break
            case Stage.Realized:
                jointPhysics(jointIndex, gravity, drag, true)
                break
        }
        zero(_force(jointIndex))
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(_location(jointIndex), _velocity(jointIndex))
        setF32(_intervalMass(jointIndex), 0.0000001)
    }
    return maxIntervalBusyCountdown
}

export function initInstance(): Stage {
    setAge(0)
    setJointCount(0)
    setIntervalCount(0)
    setFaceCount(0)
    setFabricBusyTicks(0)
    setPreviousState(REST_STATE)
    setCurrentState(REST_STATE)
    setNextState(REST_STATE)
    return setStage(Stage.Busy)
}

export function adoptLengths(): Stage {
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let lengthNow: f32 = calculateRealLength(intervalIndex, getIntervalRole(intervalIndex))
        initializeCurrentLength(intervalIndex, lengthNow)
        setIntervalStateLength(intervalIndex, REST_STATE, lengthNow)
    }
    let jointCount = getJointCount()
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        zero(_force(jointIndex))
        zero(_velocity(jointIndex))
    }
    setAltitude(0.0)
    renderNumbers()
    return setStage(Stage.Slack)
}

function startRealizing(): Stage {
    setFabricBusyTicks(getU16Feature(FabricFeature.RealizingCountdown))
    if (surfaceCharacter === SurfaceCharacter.Frozen) {
        setAltitude(FROZEN_ALTITUDE)
    }
    renderNumbers()
    return setStage(Stage.Realizing)
}

function slackToShaping(): Stage {
    let intervalCount = getIntervalCount()
    let countdown = getU16Feature(FabricFeature.IntervalCountdown)
    let shapingPretenseFactor = getFeature(FabricFeature.ShapingPretenstFactor)
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        if (isPush(getIntervalRole(intervalIndex))) {
            multiplyRestLength(intervalIndex, shapingPretenseFactor, countdown)
        }
    }
    return setStage(Stage.Shaping)
}

export function iterate(requestedStage: Stage): Stage {
    let age = getAge()
    let stage = getStage()
    let intervalBusyCountdown: u16 = 0
    let currentState = getCurrentState()
    let ticksPerFrame = getU16Feature(FabricFeature.IterationsPerFrame)
    for (let thisTick: u16 = 0; thisTick < ticksPerFrame; thisTick++) {
        intervalBusyCountdown = tick(intervalBusyCountdown, currentState, stage)
    }
    setAge(age + <u32>ticksPerFrame)
    switch (stage) {
        case Stage.Busy:
            if (requestedStage === Stage.Growing) {
                return setStage(requestedStage)
            }
            break
        case Stage.Growing:
            setAltitude(0.0)
            break
        case Stage.Shaping:
            setAltitude(0.0)
            switch (requestedStage) {
                case Stage.Realizing:
                    return startRealizing()
            }
            break
        case Stage.Slack:
            switch (requestedStage) {
                case Stage.Realizing:
                    return startRealizing()
                case Stage.Shaping:
                    return slackToShaping()
            }
            break
    }
    let fabricBusyCountdown = getFabricBusyCountdown()
    if (intervalBusyCountdown === 0 || fabricBusyCountdown > 0) {
        if (fabricBusyCountdown === 0) {
            if (stage === Stage.Realizing) {
                return setStage(Stage.Realized)
            }
            return stage
        }
        let nextCountdown: u32 = fabricBusyCountdown - ticksPerFrame
        if (nextCountdown > fabricBusyCountdown) { // rollover
            nextCountdown = 0
        }
        setFabricBusyTicks(nextCountdown)
        if (nextCountdown === 0) {
            return stage
        }
    }
    return Stage.Busy
}

export function renderNumbers(): f32 {
    zero(_MIDPOINT)
    let jointCount = getJointCount()
    let maxJointSpeedSquared: f32 = 0
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(_MIDPOINT, _location(jointIndex))
        let jointSpeedSquared = quadrance(_velocity(jointIndex))
        if (jointSpeedSquared > maxJointSpeedSquared) {
            maxJointSpeedSquared = jointSpeedSquared
        }
    }
    multiplyScalar(_MIDPOINT, 1.0 / <f32>jointCount)
    setFaceMidpoints()
    setFaceVectors()
    outputIntervals()
    return maxJointSpeedSquared
}

export function finishGrowing(): Stage {
    renderNumbers()
    return setStage(Stage.Shaping)
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

export function _jointVelocities(): usize {
    return _VELOCITIES
}

export function _intervalUnits(): usize {
    return _INTERVAL_UNITS
}

export function _intervalStrains(): usize {
    return _INTERVAL_STRAINS
}

export function _intervalStrainNuances(): usize {
    return _INTERVAL_STRAIN_NUANCES
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

const RAINBOW: f32[] = [
    0.25000, 0.20000, 1.00000,
    0.20611, 0.23731, 0.99726,
    0.16543, 0.27639, 0.98907,
    0.12843, 0.31684, 0.97553,
    0.09549, 0.35819, 0.95677,
    0.06699, 0.40000, 0.93301,
    0.04323, 0.44181, 0.90451,
    0.02447, 0.48316, 0.87157,
    0.01093, 0.52361, 0.83457,
    0.00274, 0.56269, 0.79389,
    0.00000, 0.60000, 0.75000,
    0.00274, 0.63511, 0.70337,
    0.01093, 0.66765, 0.65451,
    0.02447, 0.69726, 0.60396,
    0.04323, 0.72361, 0.55226,
    0.06699, 0.74641, 0.50000,
    0.09549, 0.76542, 0.44774,
    0.12843, 0.78042, 0.39604,
    0.16543, 0.79126, 0.34549,
    0.20611, 0.79781, 0.29663,
    0.25000, 0.80000, 0.25000,
    0.29663, 0.79781, 0.20611,
    0.34549, 0.79126, 0.16543,
    0.39604, 0.78042, 0.12843,
    0.44774, 0.76542, 0.09549,
    0.50000, 0.74641, 0.06699,
    0.55226, 0.72361, 0.04323,
    0.60396, 0.69726, 0.02447,
    0.65451, 0.66765, 0.01093,
    0.70337, 0.63511, 0.00274,
    0.75000, 0.60000, 0.00000,
    0.79389, 0.56269, 0.00274,
    0.83457, 0.52361, 0.01093,
    0.87157, 0.48316, 0.02447,
    0.90451, 0.44181, 0.04323,
    0.93301, 0.40000, 0.06699,
    0.95677, 0.35819, 0.09549,
    0.97553, 0.31684, 0.12843,
    0.98907, 0.27639, 0.16543,
    0.99726, 0.23731, 0.20611,
]
