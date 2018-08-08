
let INDEX_SIZE: u32 = sizeof<u32>();
let FLOAT_SIZE: u32 = sizeof<f32>();
let VECTOR_SIZE: u32 = FLOAT_SIZE * 3;
let JOINT_SIZE: u32 = VECTOR_SIZE * 5 + FLOAT_SIZE * 2;
let INTERVAL_SIZE: u32 = INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE * 2;
let FACE_SIZE: u32 = INDEX_SIZE * 3 + VECTOR_SIZE * 2;
let LINE_SIZE: u32 = VECTOR_SIZE * 2;
let METADATA_SIZE: u32 = VECTOR_SIZE * 3;
let JOINT_RADIUS: f32 = 0.15;
let AMBIENT_JOINT_MASS: f32 = 0.1;
let CABLE_MASS_FACTOR: f32 = 0.05;
let SPRING_SMOOTH: f32 = 0.03;
let BAR_SMOOTH: f32 = 0.6;
let CABLE_SMOOTH: f32 = 0.01;

let jointCount: u32 = 0;
let jointCountMax: u32 = 0;
let intervalCount: u32 = 0;
let intervalCountMax: u32 = 0;
let faceCount: u32 = 0;
let faceCountMax: u32 = 0;

let jointOffset: u32 = 0;
let intervalOffset: u32 = 0;
let faceOffset: u32 = 0;
let metadataOffset: u32 = 0;

let projectionPtr: u32 = 0;
let alphaProjectionPtr: u32 = 0;
let omegaProjectionPtr: u32 = 0;
let gravPtr: u32 = 0;

let ELASTIC: f32 = 0.05;
let airDrag: f32 = 0.0002;
let airGravity: f32 = 0.0001;
let landDrag: f32 = 50;
let landGravity: f32 = 30;

declare function logFloat(idx: u32, f: f32): void;

function getIndex(vPtr: u32): u32 {
    return load<u32>(vPtr);
}

function setIndex(vPtr: u32, index: u32): void {
    store<u32>(vPtr, index);
}

function getFloat(vPtr: u32): f32 {
    return load<f32>(vPtr);
}

function setFloat(vPtr: u32, v: f32): void {
    store<f32>(vPtr, v);
}

function getX(vPtr: u32): f32 {
    return getFloat(vPtr);
}

function setX(vPtr: u32, v: f32): void {
    setFloat(vPtr, v);
}

function getY(vPtr: u32): f32 {
    return load<f32>(vPtr + FLOAT_SIZE);
}

function setY(vPtr: u32, v: f32): void {
    store<f32>(vPtr + FLOAT_SIZE, v);
}

function getZ(vPtr: u32): f32 {
    return load<f32>(vPtr + FLOAT_SIZE * 2);
}

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

function length(vPtr: u32): f32 {
    return <f32>Math.sqrt(quadrance(vPtr));
}

// line: size is 2 vectors, or 6 floats, or 24 bytes

function lineAlphaPtr(index: u32): u32 {
    return index * LINE_SIZE;
}

function lineOmegaPtr(index: u32): u32 {
    return index * LINE_SIZE + VECTOR_SIZE;
}

// joint: size is (5 x 3 + 2) = 17 float64s * 8 = 136 bytes
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

function createJoint(x: f32, y: f32, z: f32): u32 {
    let jointIndex = jointCount++;
    setAll(locationPtr(jointIndex), x, y, z);
    zero(forcePtr(jointIndex));
    zero(velocityPtr(jointIndex));
    zero(gravityPtr(jointIndex));
    zero(absorbVelocityPtr(jointIndex));
    setFloat(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS);
    return jointIndex;
}

// interval: size is 2 unsigned32 + unit (3 f32s) + span + idealSpan, 5float + 2int = 48 bytes
//      alpha, omega: u32
//      unit: vector
//      span, idealSpan: f32

function intervalPtr(index: u32): u32 {
    return intervalOffset + index * INTERVAL_SIZE;
}

function getAlphaIndex(intervalIndex: u32): u32 {
    return getIndex(intervalPtr(intervalIndex));
}

function setAlphaIndex(intervalIndex: u32, v: u32): void {
    setIndex(intervalPtr(intervalIndex), v);
}

function getOmegaIndex(intervalIndex: u32): u32 {
    return getIndex(intervalPtr(intervalIndex) + INDEX_SIZE);
}

function setOmegaIndex(intervalIndex: u32, v: u32): void {
    setIndex(intervalPtr(intervalIndex) + INDEX_SIZE, v);
}

function unitPtr(intervalIndex: u32): u32 {
    return intervalPtr(intervalIndex) + INDEX_SIZE * 2;
}

function spanPtr(intervalIndex: u32): u32 {
    return intervalPtr(intervalIndex) + INDEX_SIZE * 2 + VECTOR_SIZE;
}

function idealSpanPtr(intervalIndex: u32): u32 {
    return intervalPtr(intervalIndex) + INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE;
}

function calculateSpan(intervalIndex: u32): f32 {
    let unit = unitPtr(intervalIndex);
    subVectors(unit, locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)));
    let span = length(unit);
    setFloat(spanPtr(intervalIndex), span);
    multiplyScalar(unit, 1 / span);
    return span;
}

function createInterval(alphaIndex: u32, omegaIndex: u32): u32 {
    let intervalIndex = intervalCount++;
    setAlphaIndex(intervalIndex, alphaIndex);
    setOmegaIndex(intervalIndex, omegaIndex);
    let span = calculateSpan(intervalIndex);
    setFloat(idealSpanPtr(intervalIndex), span);
    return intervalIndex;
}

// face

function facePtr(index: u32): u32 {
    return faceOffset + index * FACE_SIZE;
}

function getFaceJointIndex(faceIndex: u32, index: u32): u32 {
    return getIndex(facePtr(faceIndex) + index * INDEX_SIZE);
}

function setFaceJointIndex(faceIndex: u32, index: u32, v: u32): void {
    setIndex(facePtr(faceIndex) + index * INDEX_SIZE, v);
}

function middlePtr(faceIndex: u32): u32 {
    return facePtr(faceIndex) + INDEX_SIZE * 3;
}

function apexPtr(faceIndex: u32): u32 {
    return facePtr(faceIndex) + INDEX_SIZE * 3 + VECTOR_SIZE;
}

function createFace(joint0Index: u32, joint1Index: u32, joint2Index: u32): u32 {
    let faceIndex = faceCount++;
    setFaceJointIndex(faceIndex, 0, joint0Index);
    setFaceJointIndex(faceIndex, 1, joint1Index);
    setFaceJointIndex(faceIndex, 2, joint2Index);
    zero(middlePtr(faceIndex));
    zero(apexPtr(faceIndex));
    return faceIndex;
}

// construction and physics

function logIdealSpans():void {
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
    let stress = ELASTIC * (span - idealSpan) * idealSpan * idealSpan;
    addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2);
    addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2);
    let canPush = true;
    let mass = canPush ? idealSpan * idealSpan * idealSpan : span * CABLE_MASS_FACTOR;
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
        exertGravity(jointIndex, airGravity);
        multiplyScalar(velocityPtr(jointIndex), 1 - airDrag);
    }
    else if (altitude < -JOINT_RADIUS) {
        exertGravity(jointIndex, -airGravity * landGravity);
        multiplyScalar(velocityPtr(jointIndex), 1 - airDrag * landDrag);
    }
    else {
        let degree = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2);
        let gravityValue = airGravity * degree + -airGravity * landGravity * (1 - degree);
        exertGravity(jointIndex, gravityValue);
        let drag = airDrag * degree + airDrag * landDrag * (1 - degree);
        multiplyScalar(velocityPtr(jointIndex), 1 - drag);
    }
}

function tick(): void {
    for (let intervalIndex: u32 = 0; intervalIndex < intervalCount; intervalIndex++) {
        elastic(intervalIndex);
    }
    for (let intervalIndex: u32 = 0; intervalIndex < intervalCount; intervalIndex++) {
        smoothVelocity(intervalIndex, SPRING_SMOOTH);
    }
    for (let jointIndex: u32 = 0; jointIndex < jointCount; jointIndex++) {
        exertJointPhysics(jointIndex);
        addScaledVector(velocityPtr(jointIndex), forcePtr(jointIndex), 1.0 / getFloat(intervalMassPtr(jointIndex)));
        zero(forcePtr(jointIndex));
        add(velocityPtr(jointIndex), absorbVelocityPtr(jointIndex));
        zero(absorbVelocityPtr(jointIndex));
    }
    for (let intervalIndex: u32 = 0; intervalIndex < intervalCount; intervalIndex++) {
        let alphaAltitude = getFloat(altitudePtr(getAlphaIndex(intervalIndex)));
        let omegaAltitude = getFloat(altitudePtr(getOmegaIndex(intervalIndex)));
        let straddle = (alphaAltitude > 0 && omegaAltitude <= 0) || (alphaAltitude <= 0 && omegaAltitude > 0);
        if (straddle) {
            let absAlphaAltitude = abs(alphaAltitude);
            let absOmegaAltitude = abs(omegaAltitude);
            let totalAltitude = absAlphaAltitude + absOmegaAltitude;
            if (totalAltitude > 0.001) {
                setVector(gravPtr, gravityPtr(getAlphaIndex(intervalIndex)));
                lerp(gravPtr, gravityPtr(getOmegaIndex(intervalIndex)), absOmegaAltitude / totalAltitude);
            }
            else {
                addVectors(gravPtr, gravityPtr(getAlphaIndex(intervalIndex)), gravityPtr(getAlphaIndex(intervalIndex)));
                multiplyScalar(gravPtr, 0.5);
            }
        }
        else {
            addVectors(gravPtr, gravityPtr(getAlphaIndex(intervalIndex)), gravityPtr(getAlphaIndex(intervalIndex)));
            multiplyScalar(gravPtr, 0.5);
        }
        add(velocityPtr(getAlphaIndex(intervalIndex)), gravPtr);
        add(velocityPtr(getOmegaIndex(intervalIndex)), gravPtr);
    }
    for (let jointIndex: u32 = 0; jointIndex < jointCount; jointIndex++) {
        add(locationPtr(jointIndex), velocityPtr(jointIndex));
        setFloat(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS);
    }
}

// =================================

export function init(joints: u32, intervals: u32, faces: u32): u32 {
    jointCountMax = joints;
    intervalCountMax = intervals;
    faceCountMax = faces;
    let bytes = intervals * VECTOR_SIZE * 2 + joints * JOINT_SIZE + intervals * INTERVAL_SIZE * faces * FACE_SIZE;
    let blocks = bytes >> 16;
    memory.grow(blocks > 0 ? blocks : 1);
    jointOffset = intervalCountMax * VECTOR_SIZE * 2;
    intervalOffset = jointOffset + jointCountMax * JOINT_SIZE;
    faceOffset = intervalOffset + intervalCountMax * INTERVAL_SIZE;
    metadataOffset = faceOffset + faceCountMax * FACE_SIZE;
    projectionPtr = metadataOffset;
    alphaProjectionPtr = projectionPtr + VECTOR_SIZE;
    omegaProjectionPtr = alphaProjectionPtr + VECTOR_SIZE;
    gravPtr = omegaProjectionPtr + VECTOR_SIZE;
    return bytes;
}

export function centralize(altitude: f32): void {
    let x: f32 = 0;
    let lowY: f32 = 10000;
    let z: f32 = 0;
    for (let jointIndex: u32 = 0; jointIndex < jointCount; jointIndex++) {
        x += getX(jointPtr(jointIndex));
        let y = getY(jointPtr(jointIndex));
        if (y < lowY) {
            lowY = y;
        }
        z += getZ(jointPtr(jointIndex));
    }
    x = x / <f32>jointCount;
    z = z / <f32>jointCount;
    for (let jointIndex: u32 = 0; jointIndex < jointCount; jointIndex++) {
        let jPtr = jointPtr(jointIndex);
        setX(jPtr, getX(jPtr) - x);
        setY(jPtr, getY(jPtr) - lowY + altitude);
        setZ(jPtr, getZ(jPtr) - z);
    }
}

export function createTetra(): void {
    createJoint(1, -1, 1);
    createJoint(-1, 1, 1);
    createJoint(-1, -1, -1);
    createJoint(1, 1, -1);
    createInterval(0, 1);
    createInterval(1, 2);
    createInterval(2, 3);
    createInterval(2, 0);
    createInterval(0, 3);
    createInterval(3, 1);
    createFace(0, 1, 2);
    createFace(1, 3, 2);
    createFace(1, 0, 3);
    createFace(2, 3, 0);
}

export function iterate(ticks: u32): void {
    for (let walk: u32 = 0; walk < ticks; walk++) {
        tick();
    }
    for (let intervalIndex: u32 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setVector(lineAlphaPtr(intervalIndex), locationPtr(getAlphaIndex(intervalIndex)));
        setVector(lineOmegaPtr(intervalIndex), locationPtr(getOmegaIndex(intervalIndex)));
    }
}

// public tetraFace(face: Face): void {
//     this.faces = this.faces.filter((f: Face): boolean => f.name !== face.name);
//     let apexJoint = new Joint('apex', face.apex);
//     this.joints.push(apexJoint);
//     let diff = new Vector3(0, 0, 0);
//     let l0 = diff.subVectors(face.joints[0].location, face.joints[1].location).length();
//     let l1 = diff.subVectors(face.joints[1].location, face.joints[2].location).length();
//     let l2 = diff.subVectors(face.joints[2].location, face.joints[0].location).length();
//     let idealSpan = (l0 + l1 + l2) / 3;
//     face.joints
//         .map((j: Joint): Interval => new Interval(j, apexJoint).withIdealSpan(idealSpan))
//         .forEach((i: Interval): void => {
//             this.intervals.push(i)
//         });
//     this.faces.push(new Face([face.joints[0], face.joints[1], apexJoint]));
//     this.faces.push(new Face([face.joints[1], face.joints[2], apexJoint]));
//     this.faces.push(new Face([face.joints[2], face.joints[0], apexJoint]));
// }
