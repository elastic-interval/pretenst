declare function logBoolean(idx: u32, b: boolean): void

declare function logFloat(idx: u32, f: f32): void

declare function logInt(idx: u32, i: i32): void

const U8 = sizeof<u8>()
const U16 = sizeof<u16>()
const U32 = sizeof<u32>()
const F32 = sizeof<f32>()

const INTERVAL_ROLE_COUNT: u8 = 5
const ROLE_MUSCLE: u8 = 0
const ROLE_BAR: u8 = 1
const ROLE_TRI_CABLE: u8 = 2
const ROLE_RING_CABLE: u8 = 3
const ROLE_CROSS_CABLE: u8 = 4

const FLOATS_IN_VECTOR = 3
const ERROR: usize = 65535
const LATERALITY_SIZE: usize = U8
const JOINT_NAME_SIZE: usize = U16
const INDEX_SIZE: usize = U16
const INTERVAL_ROLE_SIZE: usize = U8
const MUSCLE_HIGHLOW_SIZE: usize = U8
const VECTOR_SIZE: usize = F32 * 3
const CLOCK_POINTS: u8 = 16
const JOINT_RADIUS: f32 = 0.5
const AMBIENT_JOINT_MASS: f32 = 0.1
const SEED_CORNERS: u16 = 5
const REST_DIRECTION: u8 = 0
const MUSCLE_DIRECTIONS: u8 = 5
const DEFAULT_HIGH_LOW: u8 = 0x08
const GROWING_INTERVAL: u8 = 1
const MATURE_INTERVAL: u8 = 2
const GESTATING: u8 = 1
const NOT_GESTATING: u8 = 0
const LAND: u8 = 1
const GESTATION_DRAG_FACTOR: f32 = 100

// Dimensioning ================================================================================

let jointCountMax: u16 = 0
let intervalCountMax: u16 = 0
let faceCountMax: u16 = 0
let instanceCountMax: u16 = 0

let fabricBytes: usize = 0

let jointOffset: usize = 0
let faceMidpointOffset: usize = 0
let faceNormalOffset: usize = 0
let faceLocationOffset: usize = 0
let intervalOffset: usize = 0
let faceOffset: usize = 0
let lineOffset: usize = 0
let lineColorOffset: usize = 0

let statePtr: usize = 0
let vectorA: usize = 0
let vectorB: usize = 0
let vector: usize = 0
let midpointPtr: usize = 0
let seedPtr: usize = 0
let forwardPtr: usize = 0
let rightPtr: usize = 0

export function init(jointsPerFabric: u16, intervalsPerFabric: u16, facesPerFabric: u16, instances: u16): usize {
    jointCountMax = jointsPerFabric
    intervalCountMax = intervalsPerFabric
    faceCountMax = facesPerFabric
    instanceCountMax = instances
    let faceVectorsSize = faceCountMax * VECTOR_SIZE
    let faceJointVectorsSize = faceVectorsSize * 3
    let jointsSize = jointCountMax * JOINT_SIZE
    let intervalsSize = intervalCountMax * INTERVAL_SIZE
    let facesSize = faceCountMax * FACE_SIZE
    let lineSize = intervalCountMax * VECTOR_SIZE * 2
    // offsets
    fabricBytes = (
        statePtr = (
            vectorB = (
                vectorA = (
                    vector = (
                        faceOffset = (
                            intervalOffset = (
                                jointOffset = (
                                    faceLocationOffset = (
                                        faceNormalOffset = (
                                            faceMidpointOffset = (
                                                lineOffset = (
                                                    lineColorOffset = (
                                                        rightPtr = (
                                                            forwardPtr = (
                                                                seedPtr = (
                                                                    midpointPtr
                                                                ) + VECTOR_SIZE
                                                            ) + VECTOR_SIZE
                                                        ) + VECTOR_SIZE
                                                    ) + VECTOR_SIZE
                                                ) + lineSize
                                            ) + lineSize
                                        ) + faceVectorsSize
                                    ) + faceJointVectorsSize
                                ) + faceJointVectorsSize
                            ) + jointsSize
                        ) + intervalsSize
                    ) + facesSize
                ) + VECTOR_SIZE
            ) + VECTOR_SIZE
        ) + VECTOR_SIZE
    ) + STATE_SIZE
    let blocks = (HEXALOT_SIZE + fabricBytes * instanceCountMax) >> 16
    memory.grow(blocks + 1)
    return fabricBytes
}

// Physics =====================================================================================

const DRAG_ABOVE: f32 = 0.00009539999882690609
const GRAVITY_ABOVE: f32 = 0.000018920998627436347
const DRAG_BELOW_LAND: f32 = 0.9607399702072144
const DRAG_BELOW_WATER: f32 = 0.001
const GRAVITY_BELOW_LAND: f32 = -0.002540299901738763
const GRAVITY_BELOW_WATER: f32 = -0.00001
const GLOBAL_ELASTIC_FACTOR: f32 = 0.5767999887466431
const MAX_SPAN_VARIATION: f32 = 0.1
const TIME_SWEEP_SPEED: f32 = 30

const MAX_PULL: f32 = 1.53
const MAX_PUSH: f32 = 3.6
const STRESS_FACTOR_CHANGE: f32 = 0.01
const STRESS_FACTOR_LIMIT_TOLERANCE = STRESS_FACTOR_CHANGE * 3
const WITHIN_LIMITS: u8 = 0
const RAISE_MAX_PUSH_LIMIT: u8 = 1
const TIGHTEN_MAX_PUSH_LIMIT: u8 = 2
const RAISE_MAX_PULL_LIMIT: u8 = 3
const TIGHTEN_MAX_PULL_LIMIT: u8 = 4
const TIGHTEN_MIN_PUSH_LIMIT: u8 = 5
const LOWER_MIN_PUSH_LIMIT: u8 = 6
const TIGHTEN_MIN_PULL_LIMIT: u8 = 7
const LOWER_MIN_PULL_LIMIT: u8 = 8
const PULL_WITHIN_LIMITS: u8 = 9
const PUSH_WITHIN_LIMITS: u8 = 10
const PUSH_TOUCHES_MAX: u8 = 11
const PULL_TOUCHES_MAX: u8 = 12
const PUSH_TOUCHES_MIN: u8 = 13
const PULL_TOUCHES_MIN: u8 = 14

const MIN_COLOR: f32 = 0.05
const MAX_COLOR: f32 = 1.0

let maxPull: f32 = MAX_PULL
let minPull: f32 = 0
let maxPush: f32 = MAX_PUSH
let minPush: f32 = 0

let physicsDragAbove: f32 = DRAG_ABOVE

export function setDragAbove(factor: f32): f32 {
    return physicsDragAbove = DRAG_ABOVE * factor
}

let physicsGravityAbove: f32 = GRAVITY_ABOVE

export function setGravityAbove(factor: f32): f32 {
    return physicsGravityAbove = GRAVITY_ABOVE * factor
}

let physicsDragBelowWater: f32 = DRAG_BELOW_WATER

export function setDragBelowWater(factor: f32): f32 {
    return physicsDragBelowWater = DRAG_BELOW_WATER * factor
}

let physicsGravityBelowWater: f32 = GRAVITY_BELOW_WATER

export function setGravityBelowWater(factor: f32): f32 {
    return physicsGravityBelowWater = GRAVITY_BELOW_WATER * factor
}

let physicsDragBelowLand: f32 = DRAG_BELOW_LAND

export function setDragBelowLand(factor: f32): f32 {
    return physicsDragBelowLand = DRAG_BELOW_LAND * factor
}

let physicsGravityBelowLand: f32 = GRAVITY_BELOW_LAND

export function setGravityBelowLand(factor: f32): f32 {
    return physicsGravityBelowLand = GRAVITY_BELOW_LAND * factor
}

let globalElasticFactor: f32 = GLOBAL_ELASTIC_FACTOR

export function setGlobalElasticFactor(factor: f32): f32 {
    return globalElasticFactor = GLOBAL_ELASTIC_FACTOR * factor
}

let maxSpanVariation: f32 = MAX_SPAN_VARIATION

export function setMaxSpanVariation(factor: f32): f32 {
    return maxSpanVariation = MAX_SPAN_VARIATION * factor
}

let timeSweepSpeed: f32 = TIME_SWEEP_SPEED

export function setSpanVariationSpeed(factor: f32): f32 {
    return timeSweepSpeed = TIME_SWEEP_SPEED * factor
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

@inline()
function getU8(vPtr: usize): u8 {
    return load<u8>(instancePtr + vPtr)
}

@inline()
function setU8(vPtr: usize, value: u8): void {
    store<u8>(instancePtr + vPtr, value)
}

@inline()
function getU16(vPtr: usize): u16 {
    return load<u16>(instancePtr + vPtr)
}

@inline()
function setU16(vPtr: usize, value: u16): void {
    store<u16>(instancePtr + vPtr, value)
}

@inline()
function getU32(vPtr: usize): u32 {
    return load<u32>(instancePtr + vPtr)
}

@inline()
function setU32(vPtr: usize, value: u32): void {
    store<u32>(instancePtr + vPtr, value)
}

@inline()
function getF32(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr)
}

@inline()
function setF32(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr, value)
}

@inline()
function getX(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr)
}

@inline()
function setX(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr, value)
}

@inline()
function getY(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr + F32)
}

@inline()
function setY(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr + F32, value)
}

@inline()
function getZ(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr + F32 * 2)
}

@inline()
function setZ(vPtr: usize, value: f32): void {
    store<f32>(instancePtr + vPtr + F32 * 2, value)
}

@inline()
function getU8Global(vPtr: usize): u8 {
    return load<u8>(vPtr)
}

@inline()
function getF32Global(vPtr: usize): f32 {
    return load<f32>(vPtr)
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

function length(vPtr: usize): f32 {
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

const TIME_SWEEP_OFFSET = U32
const JOINT_COUNT_OFFSET = TIME_SWEEP_OFFSET + U16
const JOINT_TAG_COUNT_OFFSET = JOINT_COUNT_OFFSET + U16
const INTERVAL_COUNT_OFFSET = JOINT_TAG_COUNT_OFFSET + U16
const FACE_COUNT_OFFSET = INTERVAL_COUNT_OFFSET + U16
const GESTATING_OFFSET = FACE_COUNT_OFFSET + U16
const PREVIOUS_DIRECTION_OFFSET = GESTATING_OFFSET + U8
const CURRENT_DIRECTION_OFFSET = PREVIOUS_DIRECTION_OFFSET + U8
const NEXT_DIRECTION_OFFSET = CURRENT_DIRECTION_OFFSET + U8
const ELASTIC_FACTOR_OFFSET = NEXT_DIRECTION_OFFSET + U8 + U16 // last one is padding for multiple of 4 bytes
const STATE_SIZE = ELASTIC_FACTOR_OFFSET * INTERVAL_ROLE_COUNT * F32

function setAge(value: u32): void {
    setU32(statePtr, value)
}

export function getAge(): u32 {
    return getU32(statePtr)
}

function setTimeSweep(value: u16): void {
    setU16(statePtr + TIME_SWEEP_OFFSET, value)
}

function getTimeSweep(): u16 {
    return getU16(statePtr + TIME_SWEEP_OFFSET)
}

export function getJointCount(): u16 {
    return getU16(statePtr + JOINT_COUNT_OFFSET)
}

function setJointCount(value: u16): void {
    setU16(statePtr + JOINT_COUNT_OFFSET, value)
}

function getJointTagCount(): u16 {
    return getU16(statePtr + JOINT_TAG_COUNT_OFFSET)
}

function setJointTagCount(value: u16): void {
    setU16(statePtr + JOINT_TAG_COUNT_OFFSET, value)
}

export function nextJointTag(): u16 {
    let count = getJointTagCount()
    setJointTagCount(count + 1)
    return count
}

export function getIntervalCount(): u16 {
    return getU16(statePtr + INTERVAL_COUNT_OFFSET)
}

function setIntervalCount(value: u16): void {
    setU16(statePtr + INTERVAL_COUNT_OFFSET, value)
}

export function getFaceCount(): u16 {
    return getU16(statePtr + FACE_COUNT_OFFSET)
}

function setFaceCount(value: u16): void {
    setU16(statePtr + FACE_COUNT_OFFSET, value)
}

export function isGestating(): u8 {
    return getU8(statePtr + GESTATING_OFFSET)
}

function setGestating(value: u8): void {
    setU8(statePtr + GESTATING_OFFSET, value)
}

function getPreviousDirection(): u8 {
    return getU8(statePtr + PREVIOUS_DIRECTION_OFFSET)
}

function setPreviousDirection(value: u8): void {
    setU8(statePtr + PREVIOUS_DIRECTION_OFFSET, value)
}

export function getCurrentDirection(): u8 {
    return getU8(statePtr + CURRENT_DIRECTION_OFFSET)
}

function setCurrentDirection(value: u8): void {
    setU8(statePtr + CURRENT_DIRECTION_OFFSET, value)
}

export function getNextDirection(): u8 {
    return getU8(statePtr + NEXT_DIRECTION_OFFSET)
}

export function setNextDirection(value: u8): void {
    setU8(statePtr + NEXT_DIRECTION_OFFSET, value)
}

export function setElasticFactor(intervalRole: u8, factor: f32): f32 {
    let elasticFactor = GLOBAL_ELASTIC_FACTOR * factor
    setF32(statePtr + ELASTIC_FACTOR_OFFSET + intervalRole * F32, elasticFactor)
    return elasticFactor
}

export function getElasticFactor(intervalRole: u8): f32 {
    return getF32(statePtr + ELASTIC_FACTOR_OFFSET + intervalRole * F32)
}

export function reset(): void {
    setAge(0)
    setTimeSweep(0)
    setJointCount(0)
    setJointTagCount(0)
    setIntervalCount(0)
    setFaceCount(0)
    setGestating(GESTATING)
    setPreviousDirection(REST_DIRECTION)
    setCurrentDirection(REST_DIRECTION)
    setNextDirection(REST_DIRECTION)
    for (let role: u8 = 0; role < INTERVAL_ROLE_COUNT; role++) {
        setElasticFactor(role, 1)
    }
}

// Joints =====================================================================================

const JOINT_SIZE: usize = VECTOR_SIZE * 3 + LATERALITY_SIZE + JOINT_NAME_SIZE + F32 * 2

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
    let jointCount = getJointCount()
    if (jointCount + 1 >= jointCountMax) {
        return ERROR
    }
    setJointCount(jointCount + 1)
    let jointIndex = jointCount
    setAll(locationPtr(jointIndex), x, y, z)
    zero(forcePtr(jointIndex))
    zero(velocityPtr(jointIndex))
    setF32(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS)
    setJointLaterality(jointIndex, laterality)
    setJointTag(jointIndex, jointTag)
    return jointIndex
}

function copyJointFromNext(jointIndex: u16): void {
    let nextIndex = jointIndex + 1
    setVector(locationPtr(jointIndex), locationPtr(nextIndex))
    setVector(forcePtr(jointIndex), forcePtr(nextIndex))
    setVector(velocityPtr(jointIndex), velocityPtr(nextIndex))
    setF32(intervalMassPtr(jointIndex), getF32(intervalMassPtr(nextIndex)))
    setJointLaterality(jointIndex, getJointLaterality(nextIndex))
    setJointTag(jointIndex, getJointTag(nextIndex))
}

function locationPtr(jointIndex: u16): usize {
    return jointOffset + jointIndex * VECTOR_SIZE
}

function velocityPtr(jointIndex: u16): usize {
    return locationPtr(jointCountMax) + jointIndex * VECTOR_SIZE
}

function forcePtr(jointIndex: u16): usize {
    return velocityPtr(jointCountMax) + jointIndex * VECTOR_SIZE
}

function intervalMassPtr(jointIndex: u16): usize {
    return forcePtr(jointCountMax) + jointIndex * F32
}

function altitudePtr(jointIndex: u16): usize {
    return intervalMassPtr(jointCountMax) + jointIndex * F32
}

function lateralityPtr(jointIndex: u16): usize {
    return altitudePtr(jointCountMax) + jointIndex * U8
}

function tagPtr(jointIndex: u16): usize {
    return lateralityPtr(jointCountMax) + jointIndex * U16
}

function setJointLaterality(jointIndex: u16, laterality: u8): void {
    setU8(lateralityPtr(jointIndex), laterality)
}

export function getJointLaterality(jointIndex: u16): u8 {
    return getU8(lateralityPtr(jointIndex))
}

function setJointTag(jointIndex: u16, tag: u16): void {
    setU16(tagPtr(jointIndex), tag)
}

export function getJointTag(jointIndex: u16): u16 {
    return getU16(tagPtr(jointIndex))
}

export function centralize(): void {
    let jointCount = getJointCount()
    let x: f32 = 0
    let lowY: f32 = 10000
    let z: f32 = 0
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        x += getX(locationPtr(thisJoint))
        let y = getY(locationPtr(thisJoint))
        if (y < lowY) {
            lowY = y
        }
        z += getZ(locationPtr(thisJoint))
    }
    x = x / <f32>jointCount
    z = z / <f32>jointCount
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = locationPtr(thisJoint)
        setX(jPtr, getX(jPtr) - x)
        setZ(jPtr, getZ(jPtr) - z)
    }
}

export function setAltitude(altitude: f32): f32 {
    let jointCount = getJointCount()
    let lowY: f32 = 10000
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let y = getY(locationPtr(thisJoint))
        if (y < lowY) {
            lowY = y
        }
    }
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = locationPtr(thisJoint)
        setY(jPtr, getY(jPtr) + altitude - lowY)
    }
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    return altitude - lowY
}

function calculateJointMidpoint(): void {
    let jointCount = getJointCount()
    zero(midpointPtr)
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(midpointPtr, locationPtr(jointIndex))
    }
    multiplyScalar(midpointPtr, 1.0 / <f32>jointCount)
}

function calculateDirectionVectors(): void {
    let rightJoint = isGestating() ? SEED_CORNERS + 1 : SEED_CORNERS // hanger joint still there
    let leftJoint = rightJoint + 1
    addVectors(seedPtr, locationPtr(rightJoint), locationPtr(leftJoint))
    multiplyScalar(seedPtr, 0.5)
    subVectors(rightPtr, locationPtr(rightJoint), locationPtr(leftJoint))
    setY(rightPtr, 0) // horizontal, should be near already
    multiplyScalar(rightPtr, 1 / length(rightPtr))
    setAll(vector, 0, 1, 0) // up
    crossVectors(forwardPtr, vector, rightPtr)
    multiplyScalar(forwardPtr, 1 / length(forwardPtr))
}

// Intervals =====================================================================================

const INTERVAL_SIZE: usize = INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE + F32 + INTERVAL_ROLE_SIZE + MUSCLE_HIGHLOW_SIZE * MUSCLE_DIRECTIONS

export function createInterval(alphaIndex: u16, omegaIndex: u16, idealSpan: f32, intervalRole: u8, growing: boolean): usize {
    let intervalCount = getIntervalCount()
    if (intervalCount + 1 >= intervalCountMax) {
        return ERROR
    }
    let intervalIndex = intervalCount
    setIntervalCount(intervalCount + 1)
    setAlphaIndex(intervalIndex, alphaIndex)
    setOmegaIndex(intervalIndex, omegaIndex)
    setIdealSpan(intervalIndex, idealSpan > 0 ? idealSpan : calculateSpan(intervalIndex) * -idealSpan)
    setIntervalRole(intervalIndex, intervalRole)
    for (let direction: u8 = 0; direction < MUSCLE_DIRECTIONS; direction++) {
        if (direction === REST_DIRECTION) {
            setIntervalHighLow(intervalIndex, direction, growing ? GROWING_INTERVAL : MATURE_INTERVAL)
        } else {
            setIntervalHighLow(intervalIndex, direction, DEFAULT_HIGH_LOW)
        }
    }
    outputLineGeometry(intervalIndex)
    setTimeSweep(1)
    setGestating(GESTATING)
    return intervalIndex
}

export function removeInterval(intervalIndex: u16): void {
    let intervalCount = getIntervalCount()
    while (intervalIndex < intervalCount) {
        copyIntervalFromOffset(intervalIndex, 1)
        intervalIndex++
    }
    setIntervalCount(intervalCount - 1)
}

function copyIntervalFromOffset(intervalIndex: u16, offset: u16): void {
    let nextIndex = intervalIndex + offset
    setIntervalRole(intervalIndex, getIntervalRole(nextIndex))
    setAlphaIndex(intervalIndex, getAlphaIndex(nextIndex))
    setOmegaIndex(intervalIndex, getOmegaIndex(nextIndex))
    setIdealSpan(intervalIndex, getIdealSpan(nextIndex))
    for (let direction: u8 = 0; direction < MUSCLE_DIRECTIONS; direction++) {
        setIntervalHighLow(intervalIndex, direction, getIntervalHighLow(nextIndex, direction))
    }
}

function intervalPtr(intervalIndex: u16): usize {
    return intervalOffset + intervalIndex * INTERVAL_SIZE
}

function getAlphaIndex(intervalIndex: u16): u16 {
    return getU16(intervalPtr(intervalIndex))
}

function setAlphaIndex(intervalIndex: u16, v: u16): void {
    setU16(intervalPtr(intervalIndex), v)
}

function getOmegaIndex(intervalIndex: u16): u16 {
    return getU16(intervalPtr(intervalIndex) + INDEX_SIZE)
}

function setOmegaIndex(intervalIndex: u16, v: u16): void {
    setU16(intervalPtr(intervalIndex) + INDEX_SIZE, v)
}

function unitPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INDEX_SIZE + INDEX_SIZE
}

function idealSpanPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE
}

function getIdealSpan(intervalIndex: u16): f32 {
    return getF32(idealSpanPtr(intervalIndex))
}

function setIdealSpan(intervalIndex: u16, idealSpan: f32): void {
    setF32(idealSpanPtr(intervalIndex), idealSpan)
}

export function setIntervalRole(intervalIndex: u16, intervalRole: u8): void {
    setU8(intervalPtr(intervalIndex) + INDEX_SIZE * 2 + VECTOR_SIZE + F32, intervalRole)
}

function getIntervalRole(intervalIndex: u16): u8 {
    return getU8(intervalPtr(intervalIndex) + INDEX_SIZE * 2 + VECTOR_SIZE + F32)
}

function getIntervalHighLow(intervalIndex: u16, direction: u8): u8 {
    return getU8(intervalPtr(intervalIndex) + INDEX_SIZE * 2 + VECTOR_SIZE + F32 + INTERVAL_ROLE_SIZE + MUSCLE_HIGHLOW_SIZE * direction)
}

export function setIntervalHighLow(intervalIndex: u16, direction: u8, highLow: u8): void {
    setU8(intervalPtr(intervalIndex) + INDEX_SIZE * 2 + VECTOR_SIZE + F32 + INTERVAL_ROLE_SIZE + MUSCLE_HIGHLOW_SIZE * direction, highLow)
}

function calculateSpan(intervalIndex: u16): f32 {
    let unit = unitPtr(intervalIndex)
    subVectors(unit, locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)))
    let span = length(unit)
    multiplyScalar(unit, 1 / span)
    return span
}

function findIntervalIndex(joint0: u16, joint1: u16): u16 {
    let intervalCount = getIntervalCount()
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        let alpha = getAlphaIndex(thisInterval)
        let omega = getOmegaIndex(thisInterval)
        if (alpha === joint0 && omega === joint1 || alpha === joint1 && omega === joint0) {
            return thisInterval
        }
    }
    return intervalCountMax
}

export function findOppositeIntervalIndex(intervalIndex: u16): u16 {
    let tagAlpha = getJointTag(getAlphaIndex(intervalIndex))
    let tagOmega = getJointTag(getOmegaIndex(intervalIndex))
    let intervalCount = getIntervalCount()
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        if (thisInterval === intervalIndex) {
            continue
        }
        let thisTagAlpha = getJointTag(getAlphaIndex(thisInterval))
        let thisTagOmega = getJointTag(getOmegaIndex(thisInterval))
        let matchAlpha = tagAlpha === thisTagAlpha || tagAlpha === thisTagOmega
        let matchOmega = tagOmega === thisTagOmega || tagOmega === thisTagAlpha
        if (matchAlpha && matchOmega) {
            return thisInterval
        }
    }
    return intervalCountMax
}

function advance(clockPoint: u32): u32 {
    return clockPoint + 65536
}

function getIntervalSpanVariationFloat(intervalIndex: u16, direction: u8): f32 {
    if (direction === REST_DIRECTION) {
        return 0
    }
    let highLow: u8 = getIntervalHighLow(intervalIndex, direction)
    let highClockPoint: u32 = <u32>(highLow / CLOCK_POINTS) << 12
    let lowClockPoint: u32 = <u32>(highLow % CLOCK_POINTS) << 12
    if (highClockPoint === lowClockPoint) {
        lowClockPoint += 1 << 12
    }
    let pointsFromHigh: u32
    let pointsFromLow: u32
    let timeSweep = getTimeSweep()
    if (timeSweep === lowClockPoint) {
        pointsFromHigh = 1
        pointsFromLow = 0
    } else if (timeSweep === highClockPoint) {
        pointsFromHigh = 0
        pointsFromLow = 1
    } else if (lowClockPoint < highClockPoint) {
        // L-H
        if (timeSweep > lowClockPoint) {
            if (timeSweep < highClockPoint) {
                // L-t-H
                pointsFromLow = timeSweep - lowClockPoint
                pointsFromHigh = highClockPoint - timeSweep
            } else {
                // L-H-t (H-t-L)
                pointsFromLow = advance(lowClockPoint) - timeSweep
                pointsFromHigh = timeSweep - highClockPoint
            }
        } else {
            // t-L-H (L-H-t)
            pointsFromLow = lowClockPoint - timeSweep
            pointsFromHigh = advance(timeSweep) - highClockPoint
        }
    } else {
        // H-L
        if (timeSweep > highClockPoint) {
            if (timeSweep < lowClockPoint) {
                // H-t-L
                pointsFromHigh = timeSweep - highClockPoint
                pointsFromLow = lowClockPoint - timeSweep
            } else {
                // H-L-t (L-t-H)
                pointsFromHigh = advance(highClockPoint) - timeSweep
                pointsFromLow = timeSweep - lowClockPoint
            }
        } else {
            // t-H-L (H-L-t)
            pointsFromHigh = highClockPoint - timeSweep
            pointsFromLow = advance(timeSweep) - lowClockPoint
        }
    }
    let both: u32 = pointsFromHigh + pointsFromLow
    let lowToHigh: f32 = <f32>both
    let degreeHigh = <f32>pointsFromLow / lowToHigh
    let degreeLow = <f32>pointsFromHigh / lowToHigh
    return degreeHigh * maxSpanVariation + degreeLow * -maxSpanVariation
}

function interpolateCurrentSpan(intervalIndex: u16): f32 {
    let timeSweep = getTimeSweep()
    let progress = <f32>timeSweep / 65536
    let idealSpan = getIdealSpan(intervalIndex)
    let intervalState = getIntervalHighLow(intervalIndex, REST_DIRECTION)
    if (intervalState === GROWING_INTERVAL) {
        if (timeSweep === 0) { // done growing
            setIntervalHighLow(intervalIndex, REST_DIRECTION, MATURE_INTERVAL)
            return idealSpan
        } else { // busy growing
            let currentSpan: f32 = calculateSpan(intervalIndex)
            return currentSpan * (1 - progress) + idealSpan * progress
        }
    }
    let currentDirection = getCurrentDirection()
    let previousDirection = getPreviousDirection()
    if (previousDirection !== currentDirection) {
        let previousSpanVariation = getIntervalSpanVariationFloat(intervalIndex, previousDirection)
        let spanVariation = getIntervalSpanVariationFloat(intervalIndex, currentDirection)
        return idealSpan + idealSpan * (progress * spanVariation + (1 - progress) * previousSpanVariation)
    } else {
        let spanVariation = getIntervalSpanVariationFloat(intervalIndex, currentDirection)
        return idealSpan + idealSpan * spanVariation
    }
}

function setLineColor(lineColorPtr: usize, red: f32, green: f32, blue: f32): void {
    setX(lineColorPtr, red)
    setY(lineColorPtr, green)
    setZ(lineColorPtr, blue)
    setX(lineColorPtr + VECTOR_SIZE, red)
    setY(lineColorPtr + VECTOR_SIZE, green)
    setZ(lineColorPtr + VECTOR_SIZE, blue)
}

function outputLineGeometry(intervalIndex: u16): u8 {
    let linePtr = lineOffset + intervalIndex * VECTOR_SIZE * 2
    setVector(linePtr, locationPtr(getAlphaIndex(intervalIndex)))
    setVector(linePtr + VECTOR_SIZE, locationPtr(getOmegaIndex(intervalIndex)))
    let lineColorPtr = lineColorOffset + intervalIndex * VECTOR_SIZE * 2
    let intervalRole = getIntervalRole(intervalIndex)
    let elasticFactor = getElasticFactor(intervalRole) * globalElasticFactor
    let currentIdealSpan = interpolateCurrentSpan(intervalIndex)
    let stress = (calculateSpan(intervalIndex) - currentIdealSpan) * elasticFactor
    if (stress < 0) { // PUSH
        stress = -stress
        if (stress > maxPush) {
            setLineColor(lineColorPtr, 0.0, 1.0, 0.0)
            return RAISE_MAX_PUSH_LIMIT
        }
        if (stress < minPush) {
            setLineColor(lineColorPtr, 0.0, 1.0, 0.0)
            return LOWER_MIN_PUSH_LIMIT
        }
        let color = (stress - minPush) / (maxPush - minPush)
        setLineColor(lineColorPtr, color, (1.0 - color) * 0.75, 0.0)
        let tooLowForMax: boolean = stress < maxPush - STRESS_FACTOR_LIMIT_TOLERANCE
        let tooHighForMin: boolean = stress > minPush + STRESS_FACTOR_LIMIT_TOLERANCE
        if (tooLowForMax && !tooHighForMin) {
            return PUSH_TOUCHES_MIN
        }
        if (tooHighForMin && !tooLowForMax) {
            return PUSH_TOUCHES_MAX
        }
        return PUSH_WITHIN_LIMITS
    } else { // PULL
        if (stress > maxPull) {
            setLineColor(lineColorPtr, 0.0, 1.0, 0.0)
            return RAISE_MAX_PULL_LIMIT
        }
        if (stress < minPull) {
            setLineColor(lineColorPtr, 0.0, 1.0, 0.0)
            return LOWER_MIN_PULL_LIMIT
        }
        let color = (stress - minPull) / (maxPull - minPull)
        setLineColor(lineColorPtr, 0.0, (1.0 - color) * 0.75, color)
        let tooLowForMax: boolean = stress < maxPull - STRESS_FACTOR_LIMIT_TOLERANCE
        let tooHighForMin: boolean = stress > minPull + STRESS_FACTOR_LIMIT_TOLERANCE
        if (tooLowForMax && !tooHighForMin) {
            return PULL_TOUCHES_MIN
        }
        if (tooHighForMin && !tooLowForMax) {
            return PULL_TOUCHES_MAX
        }
        return PULL_WITHIN_LIMITS
    }
}

// Faces =====================================================================================

const FACE_SIZE: usize = INDEX_SIZE * 3

function facePtr(faceIndex: u16): usize {
    return faceOffset + faceIndex * FACE_SIZE
}

export function getFaceJointIndex(faceIndex: u16, jointNumber: usize): u16 {
    return getU16(facePtr(faceIndex) + jointNumber * INDEX_SIZE)
}

function setFaceJointIndex(faceIndex: u16, jointNumber: u16, v: u16): void {
    setU16(facePtr(faceIndex) + jointNumber * INDEX_SIZE, v)
}

function getFaceTag(faceIndex: u16, jointNumber: u16): u16 {
    return getJointTag(getFaceJointIndex(faceIndex, jointNumber))
}

function outputMidpointPtr(faceIndex: u16): usize {
    return faceMidpointOffset + faceIndex * VECTOR_SIZE
}

function outputNormalPtr(faceIndex: u16, jointNumber: u16): usize {
    return faceNormalOffset + (faceIndex * 3 + jointNumber) * VECTOR_SIZE
}

function outputLocationPtr(faceIndex: u16, jointNumber: u16): usize {
    return faceLocationOffset + (faceIndex * 3 + jointNumber) * VECTOR_SIZE
}

function pushNormalTowardsJoint(normal: usize, location: usize, midpoint: usize): void {
    subVectors(vector, location, midpoint)
    multiplyScalar(vector, 1 / length(vector))
    addScaledVector(normal, vector, 0.7)
    multiplyScalar(normal, 1 / length(normal))
}

export function getFaceAverageIdealSpan(faceIndex: u16): f32 {
    let joint0 = getFaceJointIndex(faceIndex, 0)
    let joint1 = getFaceJointIndex(faceIndex, 1)
    let joint2 = getFaceJointIndex(faceIndex, 2)
    let interval0 = findIntervalIndex(joint0, joint1)
    let interval1 = findIntervalIndex(joint1, joint2)
    let interval2 = findIntervalIndex(joint2, joint0)
    let ideal0 = getIdealSpan(interval0)
    let ideal1 = getIdealSpan(interval1)
    let ideal2 = getIdealSpan(interval2)
    return (ideal0 + ideal1 + ideal2) / 3
}

// Triangles and normals depicting the faces =================================================

function outputFaceGeometry(faceIndex: u16): void {
    let loc0 = locationPtr(getFaceJointIndex(faceIndex, 0))
    let loc1 = locationPtr(getFaceJointIndex(faceIndex, 1))
    let loc2 = locationPtr(getFaceJointIndex(faceIndex, 2))
    // output the locations for rendering triangles
    setVector(outputLocationPtr(faceIndex, 0), loc0)
    setVector(outputLocationPtr(faceIndex, 1), loc1)
    setVector(outputLocationPtr(faceIndex, 2), loc2)
    // midpoint
    let midpoint = outputMidpointPtr(faceIndex)
    zero(midpoint)
    add(midpoint, loc0)
    add(midpoint, loc1)
    add(midpoint, loc2)
    multiplyScalar(midpoint, 1 / 3.0)
    // normals for each vertex
    let normal0 = outputNormalPtr(faceIndex, 0)
    let normal1 = outputNormalPtr(faceIndex, 1)
    let normal2 = outputNormalPtr(faceIndex, 2)
    subVectors(vectorA, loc1, loc0)
    subVectors(vectorB, loc2, loc0)
    crossVectors(normal0, vectorA, vectorB)
    multiplyScalar(normal0, 1 / length(normal0))
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

// Birth =======================================================================================

export function endGestation(): void {
    setGestating(NOT_GESTATING)
    let jointCount = getJointCount() - 1
    setJointCount(jointCount)
    // remove the hanger joint, and consequences
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        copyJointFromNext(jointIndex)
    }
    let intervalCount = getIntervalCount() - 2
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        copyIntervalFromOffset(intervalIndex, 2)
    }
    setIntervalCount(intervalCount)
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setAlphaIndex(intervalIndex, getAlphaIndex(intervalIndex) - 1)
        setOmegaIndex(intervalIndex, getOmegaIndex(intervalIndex) - 1)
    }
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        for (let jointNumber: u16 = 0; jointNumber < 3; jointNumber++) {
            let jointIndex = getFaceJointIndex(faceIndex, jointNumber)
            setFaceJointIndex(faceIndex, jointNumber, jointIndex - 1)
        }
    }
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
    let locPtr = locationPtr(jointIndex)
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
    return 1
    // TODO: save the three most recent spotIndexes at the joint and check mostly only those
    // TODO: use minimum and maximum quadrance limits (inner and outer circle of hexagon)
    // let spotIndex = getNearestSpotIndex(jointIndex)
    // if (spotIndex === HEXALOT_BITS) {
    //     return HEXALOT_BITS
    // }
    // return getHexalotBit(spotIndex)
}

// Physics =====================================================================================

function intervalPhysics(intervalIndex: u16): void {
    let intervalRole = getIntervalRole(intervalIndex)
    let elasticFactor = getElasticFactor(intervalRole) * globalElasticFactor
    let canPush = (intervalRole <= ROLE_BAR)
    let currentIdealSpan = interpolateCurrentSpan(intervalIndex)
    let stress = (calculateSpan(intervalIndex) - currentIdealSpan) * elasticFactor
    if (canPush || stress > 0) {
        addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2)
        addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2)
    }
    let mass = currentIdealSpan * currentIdealSpan * currentIdealSpan
    let alphaMass = intervalMassPtr(getAlphaIndex(intervalIndex))
    setF32(alphaMass, getF32(alphaMass) + mass / 2)
    let omegaMass = intervalMassPtr(getOmegaIndex(intervalIndex))
    setF32(omegaMass, getF32(omegaMass) + mass / 2)
}

function jointPhysics(jointIndex: u16, dragAbove: f32): void {
    let velocityVectorPtr = velocityPtr(jointIndex)
    let velocityY = getY(velocityVectorPtr)
    let altitude = getY(locationPtr(jointIndex))
    if (altitude > JOINT_RADIUS) { // far above
        setY(velocityVectorPtr, getY(velocityVectorPtr) - physicsGravityAbove)
        multiplyScalar(velocityPtr(jointIndex), 1 - dragAbove)
    } else {
        let land = getTerrainUnder(jointIndex) === LAND
        let physicsGravityBelow = land ? physicsGravityBelowLand : physicsGravityBelowWater
        let physicsDragBelow = land ? physicsDragBelowLand : physicsDragBelowWater
        if (altitude > -JOINT_RADIUS) { // close to the surface
            let degreeAbove: f32 = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2)
            let degreeBelow: f32 = 1.0 - degreeAbove
            if (velocityY < 0 && land) {
                multiplyScalar(velocityVectorPtr, degreeAbove) // zero at the bottom
            }
            let gravityValue: f32 = physicsGravityAbove * degreeAbove + physicsGravityBelow * degreeBelow
            setY(velocityVectorPtr, getY(velocityVectorPtr) - gravityValue)
            let drag = dragAbove * degreeAbove + physicsDragBelow * degreeBelow
            multiplyScalar(velocityPtr(jointIndex), 1 - drag)
        } else { // far under the surface
            if (velocityY < 0 && land) {
                zero(velocityVectorPtr)
            } else {
                setY(velocityVectorPtr, velocityY - physicsGravityBelow)
            }
            multiplyScalar(velocityPtr(jointIndex), 1 - physicsDragBelow)
        }
    }
}

function tick(gestating: boolean): void {
    let intervalCount = getIntervalCount()
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        intervalPhysics(intervalIndex)
    }
    let jointCount = getJointCount()
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        jointPhysics(jointIndex, physicsDragAbove * (gestating ? GESTATION_DRAG_FACTOR : 1))
        addScaledVector(velocityPtr(jointIndex), forcePtr(jointIndex), 1.0 / getF32(intervalMassPtr(jointIndex)))
        zero(forcePtr(jointIndex))
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(locationPtr(jointIndex), velocityPtr(jointIndex))
        setF32(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS)
    }
}

function lineGeometry(): u8 {
    let intervalCount = getIntervalCount()
    let pushTouchesMin: u16 = 0
    let pushTouchesMax: u16 = 0
    let pullTouchesMin: u16 = 0
    let pullTouchesMax: u16 = 0
    let grossLimitViolation = WITHIN_LIMITS
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let violation = outputLineGeometry(intervalIndex)
        switch (violation) {
            case RAISE_MAX_PUSH_LIMIT:
            case LOWER_MIN_PUSH_LIMIT:
            case RAISE_MAX_PULL_LIMIT:
            case LOWER_MIN_PULL_LIMIT:
                if (grossLimitViolation === WITHIN_LIMITS) {
                    grossLimitViolation = violation
                }
                break
            case PUSH_TOUCHES_MIN:
                pushTouchesMin++
                break
            case PUSH_TOUCHES_MAX:
                pushTouchesMax++
                break
            case PULL_TOUCHES_MIN:
                pullTouchesMin++
                break
            case PULL_TOUCHES_MAX:
                pullTouchesMax++
                break
        }
    }
    if (grossLimitViolation !== WITHIN_LIMITS) {
        return grossLimitViolation
    }
    if (!pullTouchesMin) {
        return TIGHTEN_MIN_PULL_LIMIT
    }
    if (!pullTouchesMax) {
        return TIGHTEN_MAX_PULL_LIMIT
    }
    if (!pushTouchesMin) {
        return TIGHTEN_MIN_PUSH_LIMIT
    }
    if (!pushTouchesMax) {
        return TIGHTEN_MAX_PUSH_LIMIT
    }
    return WITHIN_LIMITS
}

export function iterate(ticks: u16): boolean {
    let wrapAround = false
    let timeSweepStep: u16 = <u16>timeSweepSpeed
    let currentDirection = getCurrentDirection()
    let gestating = isGestating() === GESTATING
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        let timeSweep = getTimeSweep()
        let current = timeSweep
        timeSweep += timeSweepStep
        setTimeSweep(timeSweep)
        if (timeSweep < current) {
            wrapAround = true
            setTimeSweep(0)
            if (!isGestating()) {
                setPreviousDirection(currentDirection)
                let nextDirection = getNextDirection()
                if (nextDirection !== currentDirection) {
                    setCurrentDirection(nextDirection)
                }
            }
            setGestating(NOT_GESTATING)
        }
        tick(gestating)
    }
    setAge(getAge() + <u32>ticks)
    let stressViolation = lineGeometry()
    switch (stressViolation) {
        case TIGHTEN_MAX_PUSH_LIMIT:
            maxPush -= STRESS_FACTOR_CHANGE
            break
        case TIGHTEN_MAX_PULL_LIMIT:
            maxPull -= STRESS_FACTOR_CHANGE
            break
        case TIGHTEN_MIN_PUSH_LIMIT:
            if (maxPush - minPush < STRESS_FACTOR_LIMIT_TOLERANCE * 2) {
                break
            }
            minPush += STRESS_FACTOR_CHANGE
            break
        case TIGHTEN_MIN_PULL_LIMIT:
            if (maxPull - minPull < STRESS_FACTOR_LIMIT_TOLERANCE * 2) {
                break
            }
            minPull += STRESS_FACTOR_CHANGE
            break
        case RAISE_MAX_PUSH_LIMIT:
            maxPush += STRESS_FACTOR_CHANGE
            break
        case RAISE_MAX_PULL_LIMIT:
            maxPull += STRESS_FACTOR_CHANGE
            break
        case LOWER_MIN_PUSH_LIMIT:
            minPush -= STRESS_FACTOR_CHANGE
            break
        case LOWER_MIN_PULL_LIMIT:
            minPull -= STRESS_FACTOR_CHANGE
            break
    }
    let faceCount = getFaceCount()
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    calculateJointMidpoint()
    calculateDirectionVectors()
    return wrapAround
}

