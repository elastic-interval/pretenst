const INDEX_SIZE = sizeof<u32>();
const FLOAT_SIZE = sizeof<f64>();
const VECTOR_SIZE = FLOAT_SIZE * 3;
const JOINT_SIZE = VECTOR_SIZE * 5 + FLOAT_SIZE * 2;
const INTERVAL_SIZE = INDEX_SIZE * 2 + VECTOR_SIZE + FLOAT_SIZE;
const FACE_SIZE = INDEX_SIZE * 3 + VECTOR_SIZE * 2;
const MAX_JOINTS = 200;
const MAX_INTERVALS = 500;
const MAX_FACES = 200;
const JOINTS_OFFSET = 0;
const INTERVALS_OFFSET = MAX_JOINTS * JOINT_SIZE;
const FACES_OFFSET = INTERVALS_OFFSET + MAX_INTERVALS * INTERVAL_SIZE;

let jointCount = 0;
let intervalCount = 0;
let faceCount = 0;

@inline
function getIndex(vPtr: u32): f64 {
    return load<f64>(vPtr);
}

@inline
function setIndex(vPtr: u32, index: u32): void {
    store<u32>(vPtr, index);
}

@inline
function getFloat(vPtr: u32): f64 {
    return load<f64>(vPtr);
}

@inline
function setFloat(vPtr: u32, v: f64): void {
    store<f64>(vPtr, v);
}

@inline
function getX(vPtr: u32): f64 {
    return getFloat(vPtr);
}

@inline
function setX(vPtr: u32, v: f64): void {
    setFloat(vPtr, v);
}

@inline
function getY(vPtr: u32): f64 {
    return load<f64>(vPtr, FLOAT_SIZE);
}

@inline
function setY(vPtr: u32, v: f64): void {
    store<f64>(vPtr, v, FLOAT_SIZE);
}

@inline
function getZ(vPtr: u32): f64 {
    return load<f64>(vPtr, FLOAT_SIZE * 2);
}

@inline
function setZ(vPtr: u32, v: f64): void {
    store<f64>(vPtr, v, FLOAT_SIZE * 2);
}

function set(vPtr: u32, x: f64, y: f64, z: f64): void {
    setX(vPtr, x);
    setY(vPtr, y);
    setZ(vPtr, z);
}

function zero(vPtr: u32): void {
    set(vPtr, 0, 0, 0);
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

function addScaledVector(vPtr: u32, v: u32, s: f64): void {
    setX(vPtr, getX(vPtr) + getX(v) * s);
    setY(vPtr, getY(vPtr) + getY(v) * s);
    setZ(vPtr, getZ(vPtr) + getZ(v) * s);
}

function multiplyScalar(vPtr: u32, s: f64): void {
    setX(vPtr, getX(vPtr) * s);
    setY(vPtr, getY(vPtr) * s);
    setZ(vPtr, getZ(vPtr) * s);
}

function dot(vPtr: u32, v: u32): f64 {
    return getX(vPtr) * getX(v) + getY(vPtr) * getY(v) + getZ(vPtr) * getZ(v);
}

function lerp(vPtr: u32, v: u32, interpolation: f64): void {
    let antiInterpolation = 1.0 - interpolation;
    setX(vPtr, getX(vPtr) * antiInterpolation + getX(v) * interpolation);
    setY(vPtr, getY(vPtr) * antiInterpolation + getY(v) * interpolation);
    setX(vPtr, getZ(vPtr) * antiInterpolation + getZ(v) * interpolation);
}

function quadrance(vPtr: u32): f64 {
    const x = getX(vPtr);
    const y = getX(vPtr);
    const z = getX(vPtr);
    return x * x + y * y + z * z;
}

function length(vPtr: u32): f64 {
    return Math.sqrt(quadrance(vPtr));
}

// joint

@inline
function jointPtr(index: u32): u32 {
    return JOINTS_OFFSET + index * JOINT_SIZE;
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

function intervalMass(jointIndex: u32): f64 {
    return getFloat(jointPtr(jointIndex) + VECTOR_SIZE * 5);
}

function altitude(jointIndex: u32): f64 {
    return getFloat(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE);
}

function createJoint(x: f64, y: f64, z: f64): u32 {
    const jointIndex = jointCount++;
    set(locationPtr(jointIndex), x, y, z);
    zero(forcePtr(jointIndex));
    zero(velocityPtr(jointIndex));
    zero(gravityPtr(jointIndex));
    zero(absorbVelocityPtr(jointIndex));
    return jointIndex;
}

// interval

function intervalPtr(index: u32): u32 {
    return INTERVALS_OFFSET + index * INTERVAL_SIZE;
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

function calculateSpan(intervalIndex: u32): f64 {
    subVectors(unitPtr(intervalIndex), locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)));
    const span = length(unitPtr(intervalIndex));
    setFloat(spanPtr(intervalIndex), span);
    multiplyScalar(unitPtr(intervalIndex), 1 / span);
    return span;
}

function createInterval(alphaIndex: u32, omegaIndex: u32): u32 {
    const intervalIndex = intervalCount++;
    setAlphaIndex(intervalIndex, alphaIndex);
    setOmegaIndex(intervalIndex, omegaIndex);
    const span = calculateSpan(intervalIndex);
    setFloat(idealSpanPtr(intervalIndex), span);
    return intervalIndex;
}

// face

function facePtr(index: u32): u32 {
    return FACES_OFFSET + index * FACE_SIZE;
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
    const faceIndex = faceCount++;
    setFaceJointIndex(faceIndex, 0, joint0Index);
    setFaceJointIndex(faceIndex, 1, joint1Index);
    setFaceJointIndex(faceIndex, 2, joint2Index);
    zero(middlePtr(faceIndex));
    zero(apexPtr(faceIndex));
    return faceIndex;
}

// construction

export function setAltitude(altitude: f64): void {
    let lowest: f64 = 10000;
    for (let jointIndex: i32 = 0; jointIndex < jointCount; jointIndex++) {
        if (getY(jointPtr(jointIndex)) < lowest) {
            lowest = getY(jointPtr(jointIndex));
        }
    }
    for (let jointIndex: i32 = 0; jointIndex < jointCount; jointIndex++) {
        setY(jointPtr(jointIndex), getY(jointPtr(jointIndex)) - lowest + altitude);
    }
}

export function centralize(): void {
    let x: f64 = 0;
    let z: f64 = 0;
    for (let jointIndex: i32 = 0; jointIndex < jointCount; jointIndex++) {
        x += getX(jointPtr(jointIndex));
        z += getZ(jointPtr(jointIndex));
    }
    x = x / <f64>jointCount;
    z = z / <f64>jointCount;
    for (let jointIndex: i32 = 0; jointIndex < jointCount; jointIndex++) {
        setX(jointPtr(jointIndex), getX(jointPtr(jointIndex)) - x);
        setZ(jointPtr(jointIndex), getZ(jointPtr(jointIndex)) - z);
    }
}

function tetra(): void {
    const shake = (): f64 => (Math.random() - 0.5) * 0.1;
    const joint = (x: f64, y: f64, z: f64): u32 => createJoint(x + shake(), y + shake(), z + shake());
    joint(1, -1, 1);
    joint(-1, 1, 1);
    joint(-1, -1, -1);
    joint(1, 1, -1);
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
    setAltitude(2);
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

// export const JOINT_RADIUS = 0.15;
// const AMBIENT_JOINT_MASS = 0.1;
// const CABLE_MASS_FACTOR = 0.05;
// const SPRING_SMOOTH = 0.03;
// // const BAR_SMOOTH = 0.6;
// // const CABLE_SMOOTH = 0.01;
//
// export interface IPhysicsValue {
//     name: string;
//     value: number;
// }
//
// export interface IConstraints {
//     elastic: () => number;
//     exertJointPhysics: (joint: Joint, fabric: Fabric) => void;
// }
//
// export class Physics {
//
//     private static splitArrows(arrow: Vector3, basis: Vector3, projection: Vector3, howMuch: number) {
//         const agreement = arrow.dot(basis);
//         projection.set(basis.x, basis.y, basis.z);
//         projection.multiplyScalar(agreement * howMuch);
//     }
//
//     private gravity = new Vector3();
//     private projection = new Vector3();
//     private alphaProjection = new Vector3();
//     private omegaProjection = new Vector3();
//
//     constructor(public constraints: IConstraints) {
//     }
//
//     public iterate(fabric: Fabric) {
//         fabric.intervals.forEach(interval => {
//             this.elastic(interval);
//         });
//         fabric.intervals.forEach(interval => {
//             this.smoothVelocity(interval, SPRING_SMOOTH);
//         });
//         fabric.joints.forEach(joint => {
//             this.constraints.exertJointPhysics(joint, fabric);
//             joint.velocity.addScaledVector(joint.force, 1.0 / joint.intervalMass);
//             joint.force.set(0, 0, 0);
//             joint.velocity.add(joint.absorbVelocity);
//             joint.absorbVelocity.set(0, 0, 0);
//         });
//         fabric.intervals.forEach(interval => {
//             const alphaAltitude = interval.alpha.altitude;
//             const omegaAltitude = interval.omega.altitude;
//             const straddle = (alphaAltitude > 0 && omegaAltitude <= 0) || (alphaAltitude <= 0 && omegaAltitude > 0);
//             if (straddle) {
//                 const totalAltitude = Math.abs(alphaAltitude) + Math.abs(omegaAltitude);
//                 if (totalAltitude > 0.001) {
//                     const g = interval.alpha.gravity;
//                     this.gravity.set(g.x, g.y, g.z);
//                     this.gravity.lerp(interval.omega.gravity, Math.abs(omegaAltitude) / totalAltitude);
//                 }
//                 else {
//                     this.gravity.addVectors(interval.alpha.gravity, interval.omega.gravity).multiplyScalar(0.5);
//                 }
//             }
//             else {
//                 this.gravity.addVectors(interval.alpha.gravity, interval.omega.gravity).multiplyScalar(0.5);
//             }
//             interval.alpha.velocity.add(this.gravity);
//             interval.omega.velocity.add(this.gravity);
//         });
//         fabric.joints.forEach(joint => {
//             joint.location.add(joint.velocity);
//             joint.intervalMass = AMBIENT_JOINT_MASS;
//         });
//     }
//
//     private elastic(interval: Interval) {
//         interval.calculate();
//         interval.stress = this.constraints.elastic()* (interval.span - interval.idealSpan) * interval.idealSpan * interval.idealSpan;
//         interval.alpha.force.addScaledVector(interval.unit, interval.stress / 2);
//         interval.omega.force.addScaledVector(interval.unit, -interval.stress / 2);
//         const canPush = true;
//         const mass = canPush ? interval.idealSpan * interval.idealSpan * interval.idealSpan : interval.span * CABLE_MASS_FACTOR;
//         interval.alpha.intervalMass += mass / 2;
//         interval.omega.intervalMass += mass / 2;
//     }
//
//     private smoothVelocity(interval: Interval, degree: number) {
//         Physics.splitArrows(interval.alpha.velocity, interval.unit, this.alphaProjection, degree);
//         Physics.splitArrows(interval.omega.velocity, interval.unit, this.omegaProjection, degree);
//         this.projection.addVectors(this.alphaProjection, this.omegaProjection).multiplyScalar(0.5);
//         interval.alpha.absorbVelocity.sub(this.alphaProjection);
//         interval.omega.absorbVelocity.sub(this.omegaProjection);
//         interval.alpha.absorbVelocity.add(this.projection);
//         interval.omega.absorbVelocity.add(this.projection);
//     }
//
// }

// export class VerticalConstraints implements IConstraints {
//
//     private static exertGravity(joint: Joint, value: number) {
//         joint.velocity.y -= value;
//     }
//
//     public airDrag: IPhysicsValue = {name: "airDrag", value: 0.0002};
//     public airGravity: IPhysicsValue = {name: "airGravity", value: 0.0001};
//     public landDrag: IPhysicsValue = {name: "landDrag", value: 50};
//     public landGravity: IPhysicsValue = {name: "landGravity", value: 30};
//     public elasticFactor: IPhysicsValue = {name: "elasticFactor", value: 0.05};
//
//     public exertJointPhysics(joint: Joint, fabric: Fabric) {
//         const altitude = joint.location.y;
//         if (altitude > JOINT_RADIUS) {
//             VerticalConstraints.exertGravity(joint, this.airGravity.value);
//             joint.velocity.multiplyScalar(1 - this.airDrag.value);
//         }
//         else if (altitude < -JOINT_RADIUS) {
//             VerticalConstraints.exertGravity(joint, -this.airGravity.value * this.landGravity.value);
//             joint.velocity.multiplyScalar(1 - this.airDrag.value * this.landDrag.value);
//         }
//         else {
//             const degree = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2);
//             const gravityValue = this.airGravity.value * degree + -this.airGravity.value * this.landGravity.value * (1 - degree);
//             VerticalConstraints.exertGravity(joint, gravityValue);
//             const drag = this.airDrag.value * degree + this.airDrag.value * this.landDrag.value * (1 - degree);
//             joint.velocity.multiplyScalar(1 - drag);
//         }
//     }
//
//     public elastic = () => {
//         return this.elasticFactor.value;
//     };
// }