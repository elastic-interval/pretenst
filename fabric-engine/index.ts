/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

declare function logBoolean(idx: u32, b: boolean): void

declare function logFloat(idx: u32, f: f32): void

declare function logInt(idx: u32, i: i32): void

// DECLARATION

const JOINT_RADIUS: f32 = 0.1
const AMBIENT_JOINT_MASS: f32 = 0.1
const BAR_MASS_PER_LENGTH: f32 = 1
const CABLE_MASS_PER_LENGTH: f32 = 0.01
const SLACK_THRESHOLD: f32 = 0.0001
const INITIAL_BAR_ELASTIC: f32 = 1.2
const INITIAL_CABLE_ELASTIC: f32 = 0.3

export enum PhysicsFeature {
    GravityAbove = 0,
    DragAbove = 1,
    AntigravityBelow = 2,
    DragBelow = 3,
    AntigravityBelowWater = 4,
    DragBelowWater = 5,
    PushElastic = 6,
    PullElastic = 7,
    BusyCountdown = 8,
    AnnealingCountdown = 9,
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

export enum LifePhase {
    Growing = 0,
    Slack = 1,
    Annealing = 2,
    Pretenst = 3,
}

const LAND: u8 = 1
const ERROR: u16 = 65535

const MAX_INSTANCES: u16 = 32
const MAX_INTERVALS: u16 = 1024
const MAX_JOINTS: u16 = 512
const MAX_FACES: u16 = 256

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

const _ELASTIC_FACTORS = _INTERVAL_STRAINS + _32_INTERVALS

@inline()
function _elasticFactor(intervalIndex: u16): usize {
    return _ELASTIC_FACTORS + _32(intervalIndex)
}

const _INTERVAL_ROLES = _ELASTIC_FACTORS + _32_INTERVALS

@inline()
function _intervalRole(intervalIndex: u16): usize {
    return _INTERVAL_ROLES + _8(intervalIndex)
}

const _INTERVAL_BUSY_COUNTDOWNS = _INTERVAL_ROLES + _8_INTERVALS

@inline()
function _intervalBusyCountdown(intervalIndex: u16): usize {
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
const _LIFE_PHASE = _PRETENST + sizeof<f32>()
const _A = _LIFE_PHASE + sizeof<u16>()
const _B = _A + sizeof<f32>() * 3
const _X = _B + sizeof<f32>() * 3
const _JOINT_COUNT = _X + sizeof<f32>() * 3
const _INTERVAL_COUNT = _JOINT_COUNT + sizeof<u16>()
const _FACE_COUNT = _INTERVAL_COUNT + sizeof<u16>()
const _FABRIC_BUSY_COUNTDOWN = _FACE_COUNT + sizeof<u16>()
const _PREVIOUS_STATE = _FABRIC_BUSY_COUNTDOWN + sizeof<u16>()
const _CURRENT_STATE = _PREVIOUS_STATE + sizeof<u16>()
const _NEXT_STATE = _CURRENT_STATE + sizeof<u16>()
const _FABRIC_END = _NEXT_STATE + sizeof<u16>()

// INSTANCES

const FABRIC_SIZE: usize = _FABRIC_END // may need alignment

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

// Physics =====================================================================================

let globalGravityAbove: f32
let globalDragAbove: f32
let globalDragBelowWater: f32
let globalAntigravityBelowWater: f32
let globalDragBelow: f32
let globalAntigravityBelow: f32
let globalPushElasticFactor: f32
let globalPullElasticFactor: f32
let globalBusyCountdownMax: f32
let globalAnnealingCountdownMax: f32

export function setPhysicsFeature(globalFeature: PhysicsFeature, value: f32): f32 {
    switch (globalFeature) {
        case PhysicsFeature.GravityAbove:
            return globalGravityAbove = value
        case PhysicsFeature.DragAbove:
            return globalDragAbove = value
        case PhysicsFeature.AntigravityBelow:
            return globalAntigravityBelow = value
        case PhysicsFeature.DragBelow:
            return globalDragBelow = value
        case PhysicsFeature.AntigravityBelowWater:
            return globalAntigravityBelowWater = value
        case PhysicsFeature.DragBelowWater:
            return globalDragBelowWater = value
        case PhysicsFeature.PushElastic:
            return globalPushElasticFactor = value
        case PhysicsFeature.PullElastic:
            return globalPullElasticFactor = value
        case PhysicsFeature.BusyCountdown:
            return globalBusyCountdownMax = value
        case PhysicsFeature.AnnealingCountdown:
            return globalAnnealingCountdownMax = value
        default:
            return 0
    }
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

function getFabricBusyCountdown(): u16 {
    return getU16(_FABRIC_BUSY_COUNTDOWN)
}

function setFabricBusyCountdown(countdown: u16): void {
    setU16(_FABRIC_BUSY_COUNTDOWN, countdown)
}

function getAnnealingFactor(): f32 {
    let fabricBusyCountdown = getFabricBusyCountdown()
    return (globalAnnealingCountdownMax - <f32>fabricBusyCountdown) / globalAnnealingCountdownMax
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

export function setLifePhase(lifePhase: LifePhase, pretenst: f32): LifePhase {
    setU8(_LIFE_PHASE, <u8>lifePhase)
    setF32(_PRETENST, pretenst)
    switch (lifePhase) {
        case LifePhase.Growing:
            setAge(0)
            setJointCount(0)
            setIntervalCount(0)
            setFaceCount(0)
            setFabricBusyCountdown(0)
            setPreviousState(REST_STATE)
            setCurrentState(REST_STATE)
            setNextState(REST_STATE)
            break
        case LifePhase.Slack:
            let intervalCount = getIntervalCount()
            for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
                let lengthNow: f32 = calculateLength(intervalIndex)
                initializeCurrentLength(intervalIndex, lengthNow)
                setIntervalStateLength(intervalIndex, REST_STATE, lengthNow)
            }
            break
        case LifePhase.Annealing:
            setFabricBusyCountdown(<u16>globalAnnealingCountdownMax)
            break
        case LifePhase.Pretenst:
            break
    }
    return lifePhase
}

function getLifePhase(): LifePhase {
    return getU8(_LIFE_PHASE)
}

function getPretenst(): f32 {
    return getF32(_PRETENST)
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
    setF32(_intervalMass(jointIndex), AMBIENT_JOINT_MASS)
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

export function createInterval(alpha: u16, omega: u16, intervalRole: u8, restLength: f32, elasticFactor: f32): usize {
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
    initializeCurrentLength(intervalIndex, calculateLength(intervalIndex))
    setElasticFactor(intervalIndex, elasticFactor)
    for (let state: u8 = REST_STATE; state < STATE_COUNT; state++) {
        setIntervalStateLength(intervalIndex, state, restLength)
    }
    let intervalBusyCountdown: u16 = <u16>globalBusyCountdownMax
    setIntervalBusyCountdown(intervalIndex, intervalBusyCountdown)
    setFabricBusyCountdown(intervalBusyCountdown)
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
    setU16(_intervalBusyCountdown(intervalIndex), getIntervalBusyCountdown(nextIndex))
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

function getElasticFactor(intervalIndex: u16): f32 {
    return getF32(_elasticFactor(intervalIndex))
}

function setElasticFactor(intervalIndex: u16, elasticFactor: f32): void {
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
    let countdown = <u16>globalBusyCountdownMax
    setIntervalBusyCountdown(intervalIndex, countdown)
    setFabricBusyCountdown(countdown)
}

export function multiplyRestLength(intervalIndex: u16, factor: f32): void {
    let restLength = getIntervalStateLength(intervalIndex, REST_STATE)
    changeRestLength(intervalIndex, restLength * factor)
}

function getIntervalBusyCountdown(intervalIndex: u16): u16 {
    return getU16(_intervalBusyCountdown(intervalIndex))
}

function setIntervalBusyCountdown(intervalIndex: u16, countdown: u16): void {
    setU16(_intervalBusyCountdown(intervalIndex), countdown)
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

function calculateLength(intervalIndex: u16): f32 {
    let unit = _unit(intervalIndex)
    subVectors(unit, _location(omegaIndex(intervalIndex)), _location(alphaIndex(intervalIndex)))
    let length = magnitude(unit)
    multiplyScalar(unit, 1 / length)
    return length
}

function interpolateCurrentLength(intervalIndex: u16, state: u8): f32 {
    let currentLength = getCurrentLength(intervalIndex)
    let intervalBusyCountdown = getIntervalBusyCountdown(intervalIndex)
    if (intervalBusyCountdown === 0) {
        return currentLength
    }
    let progress = (globalBusyCountdownMax - <f32>intervalBusyCountdown) / globalBusyCountdownMax
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
    MinBarStrain = 0,
    MaxBarStrain = 1,
    MinCableStrain = 2,
    MaxCableStrain = 3,
}

const BIG_STRAIN: f32 = 1

let minBarStrain: f32 = BIG_STRAIN
let maxBarStrain: f32 = -BIG_STRAIN
let minCableStrain: f32 = BIG_STRAIN
let maxCableStrain: f32 = -BIG_STRAIN

export function getLimit(limit: Limit): f32 {
    switch (limit) {
        case Limit.MinBarStrain:
            return minBarStrain
        case Limit.MaxBarStrain:
            return maxBarStrain
        case Limit.MinCableStrain:
            return minCableStrain
        case Limit.MaxCableStrain:
            return maxCableStrain
        default:
            return 666
    }
}

let colorBars = true
let colorCables = true

export function setColoring(bars: boolean, cables: boolean): void {
    colorBars = bars
    colorCables = cables
}

function outputLinesGeometry(): void {
    minBarStrain = BIG_STRAIN
    maxBarStrain = -BIG_STRAIN
    minCableStrain = BIG_STRAIN
    maxCableStrain = -BIG_STRAIN
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let strain = getStrain(intervalIndex)
        let intervalRole = getIntervalRole(intervalIndex)
        if (intervalRole === IntervalRole.Bar) {
            strain = -strain
            if (strain < minBarStrain) {
                minBarStrain = strain
            }
            if (strain > maxBarStrain) {
                maxBarStrain = strain
            }
        } else { // cable role
            if (strain < minCableStrain) {
                minCableStrain = strain
            }
            if (strain > maxCableStrain) {
                maxCableStrain = strain
            }
        }
    }
    let lifePhase = getLifePhase()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setVector(_lineLocation(intervalIndex, false), _location(alphaIndex(intervalIndex)))
        setVector(_lineLocation(intervalIndex, true), _location(omegaIndex(intervalIndex)))
        let directionalStrain = getStrain(intervalIndex)
        let intervalRole = getIntervalRole(intervalIndex)
        let isBar: boolean = intervalRole === IntervalRole.Bar
        let strain = isBar ? -directionalStrain : directionalStrain
        if (lifePhase === LifePhase.Growing || lifePhase === LifePhase.Slack || colorBars && colorCables) {
            let slack = strain < SLACK_THRESHOLD
            let color = slack ? SLACK_COLOR : isBar ? HOT_COLOR : COLD_COLOR
            setLineColor(intervalIndex, color[0], color[1], color[2])
        } else if (colorBars || colorCables) {
            if (isBar && colorCables || !isBar && colorBars) {
                setLineColor(intervalIndex, ATTENUATED_COLOR[0], ATTENUATED_COLOR[1], ATTENUATED_COLOR[2])
            } else {
                let min = isBar ? minBarStrain : minCableStrain
                let max = isBar ? maxBarStrain : maxCableStrain
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

function intervalPhysics(intervalIndex: u16, state: u8, lifePhase: LifePhase): void {
    let intervalRole = getIntervalRole(intervalIndex)
    let bar = intervalRole === IntervalRole.Bar
    let pretenst = getPretenst()
    let pretenstFactor = <f32>1.0 + (bar ? (lifePhase === LifePhase.Annealing) ? pretenst * getAnnealingFactor() : pretenst : 0)
    let currentLength = interpolateCurrentLength(intervalIndex, state) * pretenstFactor
    let elasticFactor = getElasticFactor(intervalIndex)
    let displacement = calculateLength(intervalIndex) - currentLength
    let strain = displacement / currentLength
    setStrain(intervalIndex, strain)
    let globalElasticFactor: f32 = 0
    switch (lifePhase) {
        case LifePhase.Growing:
        case LifePhase.Slack:
            globalElasticFactor = bar ? INITIAL_BAR_ELASTIC : INITIAL_CABLE_ELASTIC
            break
        case LifePhase.Annealing:
        case LifePhase.Pretenst:
            globalElasticFactor = bar ? globalPushElasticFactor : (strain < 0) ? 0 : globalPullElasticFactor
            break
    }
    let force = strain * elasticFactor * globalElasticFactor
    addScaledVector(_force(alphaIndex(intervalIndex)), _unit(intervalIndex), force / 2)
    addScaledVector(_force(omegaIndex(intervalIndex)), _unit(intervalIndex), -force / 2)
    let mass = currentLength * currentLength * elasticFactor * (bar ? BAR_MASS_PER_LENGTH : CABLE_MASS_PER_LENGTH)
    let alphaMass = _intervalMass(alphaIndex(intervalIndex))
    setF32(alphaMass, getF32(alphaMass) + mass / 2)
    let omegaMass = _intervalMass(omegaIndex(intervalIndex))
    setF32(omegaMass, getF32(omegaMass) + mass / 2)
}

function jointPhysics(jointIndex: u16, lifePhase: LifePhase): void {
    let velocityVectorPtr = _velocity(jointIndex)
    let velocityY = getY(velocityVectorPtr)
    let altitude = getY(_location(jointIndex))
    let gravityAbove: f32 = 0
    let dragAbove: f32 = 0
    switch (lifePhase) {
        case LifePhase.Growing:
        case LifePhase.Slack:
            gravityAbove = 0
            altitude = JOINT_RADIUS * 2 // simulate far above
            dragAbove = 0.001
            break
        case LifePhase.Annealing:
            let annealingFactor = getAnnealingFactor()
            gravityAbove = globalGravityAbove * annealingFactor
            dragAbove = globalDragAbove
            break
        case LifePhase.Pretenst:
            gravityAbove = globalGravityAbove
            dragAbove = globalDragAbove
            break
    }
    if (altitude > JOINT_RADIUS) { // far above
        setY(velocityVectorPtr, getY(velocityVectorPtr) - gravityAbove)
        multiplyScalar(_velocity(jointIndex), 1 - dragAbove)
        return
    }
    let land = getTerrainUnder(jointIndex) === LAND
    let gravityBelow = land ? globalAntigravityBelow : globalAntigravityBelowWater
    let dragBelow = land ? globalDragBelow : globalDragBelowWater
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

function tick(maxIntervalBusyCountdown: u16, state: u8, lifePhase: LifePhase): u16 {
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        intervalPhysics(intervalIndex, state, lifePhase)
        let countdown = getIntervalBusyCountdown(intervalIndex)
        if (countdown === 0) {
            continue
        }
        if (countdown > maxIntervalBusyCountdown) {
            maxIntervalBusyCountdown = countdown
        }
        countdown--
        setIntervalBusyCountdown(intervalIndex, countdown)
        if (countdown === 0) { // reached the end just now
            initializeCurrentLength(intervalIndex, getIntervalStateLength(intervalIndex, REST_STATE))
        }
    }
    let jointCount = getJointCount()
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        jointPhysics(jointIndex, lifePhase)
        switch (lifePhase) {
            case LifePhase.Growing:
            case LifePhase.Slack:
                setVector(_velocity(jointIndex), _force(jointIndex))
                break
            case LifePhase.Annealing:
            case LifePhase.Pretenst:
                addScaledVector(_velocity(jointIndex), _force(jointIndex), 1.0 / getF32(_intervalMass(jointIndex)))
                break
        }
        zero(_force(jointIndex))
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(_location(jointIndex), _velocity(jointIndex))
        setF32(_intervalMass(jointIndex), AMBIENT_JOINT_MASS)
    }
    return maxIntervalBusyCountdown
}

export function iterate(ticks: u16): boolean {
    let lifePhase = getLifePhase()
    let currentState = getCurrentState()
    let maxIntervalBusyCountdown: u16 = 0
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        maxIntervalBusyCountdown = tick(maxIntervalBusyCountdown, currentState, lifePhase)
    }
    setAge(getAge() + <u32>ticks)
    outputLinesGeometry()
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    calculateJointMidpoint()
    if (maxIntervalBusyCountdown === 0) {
        let fabricBusyCountdown = getFabricBusyCountdown()
        if (fabricBusyCountdown === 0) {
            return false
        }
        let nextCountdown: u16 = fabricBusyCountdown - ticks
        if (nextCountdown > fabricBusyCountdown) { // rollover
            nextCountdown = 0
        }
        setFabricBusyCountdown(nextCountdown)
        if (nextCountdown === 0) {
            return false
        }
    }
    if (lifePhase === LifePhase.Growing || lifePhase === LifePhase.Slack) {
        setAltitude(JOINT_RADIUS)
    }
    return true
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

export function _elasticFactors(): usize {
    return _ELASTIC_FACTORS
}

export function _fabricOffset(): usize {
    return SURFACE_SIZE + FABRIC_SIZE * instance
}
