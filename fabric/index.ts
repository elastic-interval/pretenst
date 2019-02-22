declare function logBoolean(idx: u32, b: boolean): void

declare function logFloat(idx: u32, f: f32): void

declare function logInt(idx: u32, i: i32): void

const U8 = sizeof<u8>()
const U16 = sizeof<u16>()
const F32 = sizeof<f32>()

const ERROR: usize = 65535
const LATERALITY_SIZE: usize = U8
const JOINT_NAME_SIZE: usize = U16
const INDEX_SIZE: usize = U16
const MUSCLE_HIGHLOW_SIZE: usize = U8
const VECTOR_SIZE: usize = F32 * 3
const CLOCK_POINTS: u8 = 16
const JOINT_RADIUS: f32 = 0.5
const AMBIENT_JOINT_MASS: f32 = 0.1
const BILATERAL_MIDDLE: u8 = 0
const SEED_CORNERS: u16 = 5
const REST_DIRECTION: u8 = 0
const MUSCLE_DIRECTIONS: u8 = 5
const DEFAULT_HIGH_LOW: u8 = 0x08
const GROWING_INTERVAL: u8 = 1
const MATURE_INTERVAL: u8 = 2

// Physics =====================================================================================

const DRAG_ABOVE: f32 = 0.00009539999882690609
const GRAVITY_ABOVE: f32 = 0.000018920998627436347
const DRAG_BELOW: f32 = 0.9607399702072144
const GRAVITY_BELOW: f32 = -0.002540299901738763
const ELASTIC_FACTOR: f32 = 0.5767999887466431
const MAX_SPAN_VARIATION: f32 = 0.1
const TIME_SWEEP_SPEED: f32 = 30

let physicsDragAbove: f32 = DRAG_ABOVE

export function setDragAbove(factor: f32): f32 {
    return physicsDragAbove = DRAG_ABOVE * factor
}

let physicsGravityAbove: f32 = GRAVITY_ABOVE

export function setGravityAbove(factor: f32): f32 {
    return physicsGravityAbove = GRAVITY_ABOVE * factor
}

let physicsDragBelow: f32 = DRAG_BELOW

export function setDragBelow(factor: f32): f32 {
    return physicsDragBelow = DRAG_BELOW * factor
}

let physicsGravityBelow: f32 = GRAVITY_BELOW

export function setGravityBelow(factor: f32): f32 {
    return physicsGravityBelow = GRAVITY_BELOW * factor
}

let physicsElasticFactor: f32 = ELASTIC_FACTOR

export function setElasticFactor(factor: f32): f32 {
    return physicsElasticFactor = ELASTIC_FACTOR * factor
}

let maxSpanVariation: f32 = MAX_SPAN_VARIATION

export function setMaxSpanVariation(factor: f32): f32 {
    return maxSpanVariation = MAX_SPAN_VARIATION * factor
}

let timeSweepSpeed: f32 = TIME_SWEEP_SPEED

export function setSpanVariationSpeed(factor: f32): f32 {
    return timeSweepSpeed = TIME_SWEEP_SPEED * factor
}

// TODO: everything below must be reviewed to work with multiple instances

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
    // offsets
    fabricBytes = (
        vectorB = (
            vectorA = (
                vector = (
                    faceOffset = (
                        intervalOffset = (
                            jointOffset = (
                                faceLocationOffset = (
                                    faceNormalOffset = (
                                        faceMidpointOffset = (
                                            rightPtr = (
                                                forwardPtr = (
                                                    seedPtr = (
                                                        midpointPtr
                                                    ) + VECTOR_SIZE
                                                ) + VECTOR_SIZE
                                            ) + VECTOR_SIZE
                                        ) + VECTOR_SIZE
                                    ) + faceVectorsSize
                                ) + faceJointVectorsSize
                            ) + faceJointVectorsSize
                        ) + jointsSize
                    ) + intervalsSize
                ) + facesSize
            ) + VECTOR_SIZE
        ) + VECTOR_SIZE
    ) + VECTOR_SIZE
    let blocks = (fabricBytes * instanceCountMax) >> 16
    memory.grow(blocks + 1)
    return fabricBytes
}

// Peek and Poke ================================================================================

let instance: u16 = 0
let instancePtr: usize = 0

export function setInstance(index: u16): void {
    instance = index
    instancePtr = instance * fabricBytes
}

@inline
function abs(val: f32): f32 {
    return val < 0 ? -val : val
}

@inline()
function getU8(vPtr: usize): u8 {
    return load<u8>(instancePtr + vPtr)
}

@inline()
function setU8(vPtr: usize, highLow: u8): void {
    store<u8>(instancePtr + vPtr, highLow)
}

@inline()
function getU16(vPtr: usize): u16 {
    return load<u16>(instancePtr + vPtr)
}

@inline()
function setU16(vPtr: usize, index: u16): void {
    store<u16>(instancePtr + vPtr, index)
}

@inline()
function getF32(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr)
}

@inline()
function setF32(vPtr: usize, v: f32): void {
    store<f32>(instancePtr + vPtr, v)
}

@inline()
function getX(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr)
}

@inline()
function setX(vPtr: usize, v: f32): void {
    store<f32>(instancePtr + vPtr, v)
}

@inline()
function getY(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr + F32)
}

@inline()
function setY(vPtr: usize, v: f32): void {
    store<f32>(instancePtr + vPtr + F32, v)
}

@inline()
function getZ(vPtr: usize): f32 {
    return load<f32>(instancePtr + vPtr + F32 * 2)
}

@inline()
function setZ(vPtr: usize, v: f32): void {
    store<f32>(instancePtr + vPtr + F32 * 2, v)
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

// Body state =====================================================================================

let ticksSoFar: u32 = 0
let timeSweep: u16 = 0
let gestating: boolean = true
let previousDirection: u8 = REST_DIRECTION
let currentDirection: u8 = REST_DIRECTION
let nextDirection: u8 = REST_DIRECTION
let jointCount: u16 = 0
let jointTagCount: u16 = 0
let intervalCount: u16 = 0
let faceCount: u16 = 0

export function reset(): void {
    jointTagCount = 0
    jointCount = 0
    intervalCount = 0
    faceCount = 0
}

export function getAge(): u32 {
    return ticksSoFar
}

export function getJointCount(): usize {
    return jointCount
}

export function getIntervalCount(): usize {
    return intervalCount
}

export function getFaceCount(): usize {
    return faceCount
}

export function nextJointTag(): u16 {
    jointTagCount++
    return jointTagCount
}

// Joints =====================================================================================

const JOINT_SIZE: usize = VECTOR_SIZE * 3 + LATERALITY_SIZE + JOINT_NAME_SIZE + F32 * 2

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
    if (jointCount + 1 >= jointCountMax) {
        return ERROR
    }
    let jointIndex = jointCount++
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

function jointPtr(jointIndex: u16): usize {
    return jointOffset + jointIndex * JOINT_SIZE
}

function locationPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex)
}

function velocityPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE
}

function forcePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 2
}

function intervalMassPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 3
}

function altitudePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 3 + F32
}

function setJointLaterality(jointIndex: u16, laterality: u8): void {
    setU8(jointPtr(jointIndex) + VECTOR_SIZE * 3 + F32 * 2, laterality)
}

export function getJointLaterality(jointIndex: u16): u8 {
    return getU8(jointPtr(jointIndex) + VECTOR_SIZE * 3 + F32 * 2)
}

function setJointTag(jointIndex: u16, tag: u16): void {
    setU16(jointPtr(jointIndex) + VECTOR_SIZE * 3 + F32 * 2 + LATERALITY_SIZE, tag)
}

export function getJointTag(jointIndex: u16): u16 {
    return getU16(jointPtr(jointIndex) + VECTOR_SIZE * 3 + F32 * 2 + LATERALITY_SIZE)
}

export function centralize(): void {
    let x: f32 = 0
    let lowY: f32 = 10000
    let z: f32 = 0
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        x += getX(jointPtr(thisJoint))
        let y = getY(jointPtr(thisJoint))
        if (y < lowY) {
            lowY = y
        }
        z += getZ(jointPtr(thisJoint))
    }
    x = x / <f32>jointCount
    z = z / <f32>jointCount
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = jointPtr(thisJoint)
        setX(jPtr, getX(jPtr) - x)
        setZ(jPtr, getZ(jPtr) - z)
    }
}

export function setAltitude(altitude: f32): f32 {
    let lowY: f32 = 10000
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let y = getY(jointPtr(thisJoint))
        if (y < lowY) {
            lowY = y
        }
    }
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = jointPtr(thisJoint)
        setY(jPtr, getY(jPtr) + altitude - lowY)
    }
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    return altitude - lowY
}

function calculateJointMidpoint(): void {
    zero(midpointPtr)
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        add(midpointPtr, locationPtr(jointIndex))
    }
    multiplyScalar(midpointPtr, 1.0 / <f32>jointCount)
}

function calculateDirectionVectors(): void {
    addVectors(seedPtr, locationPtr(SEED_CORNERS), locationPtr(SEED_CORNERS + 1))
    multiplyScalar(seedPtr, 0.5)
    subVectors(rightPtr, locationPtr(SEED_CORNERS), locationPtr(SEED_CORNERS + 1))
    setY(rightPtr, 0) // horizontal, should be near already
    multiplyScalar(rightPtr, 1 / length(rightPtr))
    setAll(vector, 0, 1, 0) // up
    crossVectors(forwardPtr, vector, rightPtr)
    multiplyScalar(forwardPtr, 1 / length(forwardPtr))
}

// Intervals =====================================================================================

const INTERVAL_SIZE: usize = INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE + F32 + MUSCLE_HIGHLOW_SIZE * MUSCLE_DIRECTIONS

export function createInterval(alphaIndex: u16, omegaIndex: u16, idealSpan: f32, growing: boolean): usize {
    if (intervalCount + 1 >= intervalCountMax) {
        return ERROR
    }
    let intervalIndex = intervalCount++
    setAlphaIndex(intervalIndex, alphaIndex)
    setOmegaIndex(intervalIndex, omegaIndex)
    setIdealSpan(intervalIndex, idealSpan > 0 ? idealSpan : calculateSpan(intervalIndex))
    for (let direction: u8 = 0; direction < MUSCLE_DIRECTIONS; direction++) {
        if (direction === REST_DIRECTION) {
            setIntervalHighLow(intervalIndex, direction, growing ? GROWING_INTERVAL : MATURE_INTERVAL)
        } else {
            setIntervalHighLow(intervalIndex, direction, DEFAULT_HIGH_LOW)
        }
    }
    return intervalIndex
}

function copyIntervalFromOffset(intervalIndex: u16, offset: u16): void {
    let nextIndex = intervalIndex + offset
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

function getIntervalHighLow(intervalIndex: u16, direction: u8): u8 {
    return getU8(intervalPtr(intervalIndex) + INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE + F32 + MUSCLE_HIGHLOW_SIZE * direction)
}

export function setIntervalHighLow(intervalIndex: u16, direction: u8, highLow: u8): void {
    setU8(intervalPtr(intervalIndex) + INDEX_SIZE + INDEX_SIZE + VECTOR_SIZE + F32 + MUSCLE_HIGHLOW_SIZE * direction, highLow)
}

function calculateSpan(intervalIndex: u16): f32 {
    let unit = unitPtr(intervalIndex)
    subVectors(unit, locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)))
    let span = length(unit)
    multiplyScalar(unit, 1 / span)
    return span
}

function findIntervalIndex(joint0: u16, joint1: u16): u16 {
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
    if (currentDirection === REST_DIRECTION) {
        return idealSpan
    }
    if (previousDirection !== currentDirection) {
        let previousSpanVariation = getIntervalSpanVariationFloat(intervalIndex, previousDirection)
        let spanVariation = getIntervalSpanVariationFloat(intervalIndex, currentDirection)
        return idealSpan + idealSpan * (progress * spanVariation + (1 - progress) * previousSpanVariation)
    } else {
        let spanVariation = getIntervalSpanVariationFloat(intervalIndex, currentDirection)
        return idealSpan + idealSpan * spanVariation
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

export function getFaceLaterality(faceIndex: u16): u8 {
    for (let jointWalk: u16 = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
        let jointLaterality = getJointLaterality(getFaceJointIndex(faceIndex, jointWalk))
        if (jointLaterality !== BILATERAL_MIDDLE) {
            return jointLaterality
        }
    }
    return BILATERAL_MIDDLE
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
    if (faceCount + 1 >= faceCountMax) {
        return ERROR
    }
    let faceIndex = faceCount++
    setFaceJointIndex(faceIndex, 0, joint0Index)
    setFaceJointIndex(faceIndex, 1, joint1Index)
    setFaceJointIndex(faceIndex, 2, joint2Index)
    outputFaceGeometry(faceIndex)
    return faceIndex
}

export function removeFace(deadFaceIndex: u16): void {
    for (let faceIndex: u16 = deadFaceIndex; faceIndex < faceCount - 1; faceIndex++) {
        let nextFace = faceIndex + 1
        setFaceJointIndex(faceIndex, 0, getFaceJointIndex(nextFace, 0))
        setFaceJointIndex(faceIndex, 1, getFaceJointIndex(nextFace, 1))
        setFaceJointIndex(faceIndex, 2, getFaceJointIndex(nextFace, 2))
        outputFaceGeometry(faceIndex)
    }
    faceCount--
}

// Physics =====================================================================================

function elastic(intervalIndex: u16, elasticFactor: f32): void {
    let idealSpan = interpolateCurrentSpan(intervalIndex)
    let stress = elasticFactor * (calculateSpan(intervalIndex) - idealSpan) * idealSpan * idealSpan
    addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2)
    addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2)
    let mass = idealSpan * idealSpan * idealSpan
    let alphaMass = intervalMassPtr(getAlphaIndex(intervalIndex))
    setF32(alphaMass, getF32(alphaMass) + mass / 2)
    let omegaMass = intervalMassPtr(getOmegaIndex(intervalIndex))
    setF32(omegaMass, getF32(omegaMass) + mass / 2)
}

function exertJointPhysics(jointIndex: u16, dragAbove: f32): void {
    let velocityVectorPtr = velocityPtr(jointIndex)
    let velocityY = getY(velocityVectorPtr)
    let altitude = getY(locationPtr(jointIndex))
    if (altitude > JOINT_RADIUS) {
        setY(velocityVectorPtr, getY(velocityVectorPtr) - physicsGravityAbove)
        multiplyScalar(velocityPtr(jointIndex), 1 - dragAbove)
    }
    else if (altitude > -JOINT_RADIUS) {
        let degreeAbove: f32 = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2)
        let degreeBelow: f32 = 1.0 - degreeAbove
        if (velocityY < 0) {
            multiplyScalar(velocityVectorPtr, degreeAbove) // zero at the bottom
        }
        let gravityValue: f32 = physicsGravityAbove * degreeAbove + physicsGravityBelow * degreeBelow
        setY(velocityVectorPtr, getY(velocityVectorPtr) - gravityValue)
        let drag = dragAbove * degreeAbove + physicsDragBelow * degreeBelow
        multiplyScalar(velocityPtr(jointIndex), 1 - drag)
    }
    else {
        if (velocityY < 0) {
            zero(velocityVectorPtr)
        } else {
            setY(velocityVectorPtr, velocityY - physicsGravityBelow)
        }
        multiplyScalar(velocityPtr(jointIndex), 1 - physicsDragBelow)
    }
}

function tick(): void {
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        elastic(intervalIndex, gestating ? physicsElasticFactor * 0.1 : physicsElasticFactor)
    }
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        exertJointPhysics(jointIndex, physicsDragAbove * (gestating ? 50 : 1))
        addScaledVector(velocityPtr(jointIndex), forcePtr(jointIndex), 1.0 / getF32(intervalMassPtr(jointIndex)))
        zero(forcePtr(jointIndex))
    }
    for (let jointIndex: u16 = gestating ? 1 : 0; jointIndex < jointCount; jointIndex++) {
        add(locationPtr(jointIndex), velocityPtr(jointIndex))
        setF32(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS)
    }
}

export function isGestating(): boolean {
    return gestating
}

export function endGestation(): void {
    gestating = false
    // remove the hanger joint, and consequences
    jointCount--
    for (let jointIndex: u16 = 0; jointIndex < jointCount; jointIndex++) {
        copyJointFromNext(jointIndex)
    }
    intervalCount -= 2
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        copyIntervalFromOffset(intervalIndex, 2)
    }
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setAlphaIndex(intervalIndex, getAlphaIndex(intervalIndex) - 1)
        setOmegaIndex(intervalIndex, getOmegaIndex(intervalIndex) - 1)
    }
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        for (let jointNumber: u16 = 0; jointNumber < 3; jointNumber++) {
            let jointIndex = getFaceJointIndex(faceIndex, jointNumber)
            setFaceJointIndex(faceIndex, jointNumber, jointIndex - 1)
        }
    }
}

export function getDirection(): u8 {
    return currentDirection
}

export function setDirection(direction: u8): void {
    nextDirection = direction
}

export function iterate(ticks: usize): boolean {
    let wrapAround = false
    let timeSweepStep: u16 = <u16>timeSweepSpeed
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        let current = timeSweep
        timeSweep += timeSweepStep
        if (timeSweep < current) {
            wrapAround = true
            if (gestating) {
                timeSweep = 0
            } else {
                previousDirection = currentDirection
                if (nextDirection !== currentDirection) {
                    currentDirection = nextDirection
                }
            }
        }
        tick()
    }
    if (currentDirection !== REST_DIRECTION) {
        ticksSoFar += ticks
    }
    for (let faceIndex: u16 = 0; faceIndex < faceCount; faceIndex++) {
        outputFaceGeometry(faceIndex)
    }
    calculateJointMidpoint()
    calculateDirectionVectors()
    return wrapAround
}

