/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { roleLength } from "../storage/local-storage"

import { IntervalRole } from "./fabric-engine"
import { JOINT_RADIUS } from "./fabric-instance"
import {
    BAR_ARRAY,
    BarEnd,
    factorToPercent,
    IActiveCode,
    IBarDefinition,
    IBrick,
    ICodeTree,
    IConnector,
    IFace,
    IInterval,
    IJoint,
    IPercent,
    percentOrHundred,
    percentToFactor,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-brick-types"
import { TensegrityFabric } from "./tensegrity-fabric"

// function createBrickPointsUpright(): Vector3[] {
//     const points = BAR_ARRAY.reduce(barsToPoints, [])
//     points.forEach(p => {
//         const xx = p.x
//         p.x = p.z
//         p.y += PHI
//         p.z = xx
//     })
//     return points
// }

function createBrickPointsOnOrigin(base: Triangle, scale: IPercent): Vector3 [] {
    const barsToPoints = (vectors: Vector3[], bar: IBarDefinition): Vector3[] => {
        vectors.push(new Vector3().add(bar.alpha))
        vectors.push(new Vector3().add(bar.omega))
        return vectors
    }
    const points = BAR_ARRAY.reduce(barsToPoints, [])
    const newBase = TRIANGLE_DEFINITIONS[base].opposite
    const trianglePoints = TRIANGLE_DEFINITIONS[newBase].barEnds.map((barEnd: BarEnd) => points[barEnd]).reverse()
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
    const y = new Vector3().sub(midpoint).normalize()
    const z = new Vector3().crossVectors(y, x).normalize()
    const basis = new Matrix4().makeBasis(x, y, z)
    const scaleFactor = percentToFactor(scale)
    const fromBasis = new Matrix4()
        .getInverse(basis)
        .setPosition(new Vector3(0, midpoint.length() + JOINT_RADIUS, 0))
        .scale(new Vector3(scaleFactor, scaleFactor, scaleFactor))
    return points.map(p => p.applyMatrix4(fromBasis))
}

function createBrick(fabric: TensegrityFabric, points: Vector3[], base: Triangle, scale: IPercent): IBrick {
    const jointIndexes = points.map((p, index) => fabric.createJointIndex(index, p))
    const bars = BAR_ARRAY.map(({}: IBarDefinition, index: number) => {
        const role = IntervalRole.Bar
        const alphaIndex = jointIndexes[index * 2]
        const omegaIndex = jointIndexes[index * 2 + 1]
        const alpha: IJoint = {index: alphaIndex, oppositeIndex: omegaIndex}
        const omega: IJoint = {index: omegaIndex, oppositeIndex: alphaIndex}
        return fabric.createInterval(alpha, omega, role, roleLength(role, scale))
    })
    const joints = bars.reduce((arr: IJoint[], bar) => {
        arr.push(bar.alpha, bar.omega)
        return arr
    }, [])
    fabric.joints.push(...joints)
    const brick: IBrick = {base, scale, fabric, joints, bars, cables: [], rings: [[], [], [], []], faces: []}
    TRIANGLE_DEFINITIONS.forEach(triangle => {
        const tJoints = triangle.barEnds.map(barEnd => joints[barEnd])
        for (let walk = 0; walk < 3; walk++) {
            const role = IntervalRole.Triangle
            const interval = fabric.createInterval(tJoints[walk], tJoints[(walk + 1) % 3], role, roleLength(role, scale))
            brick.cables.push(interval)
            brick.rings[triangle.ringMember[walk]].push(interval)
        }
    })
    TRIANGLE_DEFINITIONS.forEach(triangle => {
        const face = fabric.createFace(brick, triangle.name)
        brick.faces.push(face)
    })
    fabric.instance.clear()
    return brick
}

export function createBrickOnOrigin(fabric: TensegrityFabric, scale: IPercent): IBrick {
    const points = createBrickPointsOnOrigin(Triangle.PPP, scale)
    return createBrick(fabric, points, Triangle.NNN, scale)
}

function createBrickOnFace(face: IFace, scale: IPercent): IBrick {
    const negativeFace = TRIANGLE_DEFINITIONS[face.triangle].negative
    const brick = face.brick
    const triangle = face.triangle
    const trianglePoints = brick.faces[triangle].joints.map(joint => brick.fabric.instance.getJointLocation(joint.index))
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const midSide = new Vector3().addVectors(trianglePoints[0], trianglePoints[1]).multiplyScalar(0.5)
    const x = new Vector3().subVectors(midSide, midpoint).normalize()
    const u = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
    const proj = new Vector3().add(x).multiplyScalar(x.dot(u))
    const z = u.sub(proj).normalize()
    const y = new Vector3().crossVectors(z, x).normalize()
    const xform = new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
    const base = negativeFace ? Triangle.NNN : Triangle.PPP
    const points = createBrickPointsOnOrigin(base, scale)
    const movedToFace = points.map(p => p.applyMatrix4(xform))
    const baseTriangle = negativeFace ? Triangle.PPP : Triangle.NNN
    return createBrick(brick.fabric, movedToFace, baseTriangle, scale)
}

interface IJointPair {
    jointA: IJoint
    locationA: Vector3
    jointB: IJoint
    locationB: Vector3
    distance: number
}

function facesToRing(fabric: TensegrityFabric, faceA: IFace, faceB: IFace): IJoint[] {
    const jointsA: IJoint[] = TRIANGLE_DEFINITIONS[faceA.triangle].barEnds.map(barEnd => faceA.brick.joints[barEnd])
    const jointsB: IJoint[] = TRIANGLE_DEFINITIONS[faceB.triangle].barEnds.map(barEnd => faceB.brick.joints[barEnd])
    const jointPairs: IJointPair[] = []
    jointsA.forEach(jointA => {
        jointsB.forEach(jointB => {
            const locationA = fabric.instance.getJointLocation(jointA.index)
            const locationB = fabric.instance.getJointLocation(jointB.index)
            const distance = locationA.distanceTo(locationB)
            jointPairs.push({jointA, locationA, jointB, locationB, distance})
        })
    })
    jointPairs.sort((a, b) => a.distance - b.distance)
    // console.log("jointPairs", jointPairs.map(p => `${p.jointA.index}:${p.jointB.index}=${p.distance}`))
    const ring: IJoint[] = []
    let takeA = true
    let pairIndex = 0
    while (ring.length < 6) {
        const jointPair = jointPairs[pairIndex]
        if (!jointPair) {
            throw new Error()
        }
        jointPairs.splice(pairIndex, 1)
        if (takeA) {
            ring.push(jointPair.jointA)
            pairIndex = jointPairs.findIndex(p => p.jointB === jointPair.jointB)
            takeA = false
        } else {
            ring.push(jointPair.jointB)
            pairIndex = jointPairs.findIndex(p => p.jointA === jointPair.jointA)
            takeA = true
        }
    }
    if (TRIANGLE_DEFINITIONS[faceA.triangle].negative) {
        ring.reverse()
    }
    return ring
}

export function connectBricks(faceA: IFace, faceB: IFace, scale: IPercent): IConnector {
    const fabric = faceA.brick.fabric
    const ring = facesToRing(fabric, faceA, faceB)
    const cables: IInterval[] = []
    const createRingCable = (index: number) => {
        const role = IntervalRole.Ring
        const joint = ring[index]
        const nextJoint = ring[(index + 1) % ring.length]
        const ringCable = fabric.createInterval(joint, nextJoint, role, roleLength(role, scale))
        cables.push(ringCable)
    }
    const createCrossCable = (index: number) => {
        const role = IntervalRole.Cross
        const joint = ring[index]
        const nextJoint = ring[(index + 1) % ring.length]
        const prevJoint = ring[(index + ring.length - 1) % ring.length]
        const prevJointOppositeLocation = fabric.instance.getJointLocation(prevJoint.oppositeIndex)
        const jointLocation = fabric.instance.getJointLocation(joint.index)
        const nextJointOppositeLocation = fabric.instance.getJointLocation(nextJoint.oppositeIndex)
        const prevOpposite = jointLocation.distanceTo(prevJointOppositeLocation)
        const nextOpposite = jointLocation.distanceTo(nextJointOppositeLocation)
        const partnerJoint = fabric.joints[(prevOpposite < nextOpposite) ? prevJoint.oppositeIndex : nextJoint.oppositeIndex]
        const crossCable = fabric.createInterval(joint, partnerJoint, role, roleLength(role, scale))
        cables.push(crossCable)
    }
    for (let walk = 0; walk < ring.length; walk++) {
        createRingCable(walk)
        createCrossCable(walk)
    }
    const handleFace = (faceToRemove: IFace): IFace => {
        const triangle = faceToRemove.triangle
        const brick = faceToRemove.brick
        const face = brick.faces[triangle]
        TRIANGLE_DEFINITIONS.filter(t => t.opposite !== triangle && t.negative !== TRIANGLE_DEFINITIONS[triangle].negative).forEach(t => {
            brick.faces[t.name].canGrow = false
        })
        const triangleRing = TRIANGLE_DEFINITIONS[triangle].ring
        const engine = fabric.instance.engine
        brick.rings[triangleRing].filter(interval => !interval.removed).forEach(interval => {
            engine.setIntervalRole(interval.index, interval.intervalRole = IntervalRole.Ring)
            const length = roleLength(interval.intervalRole, scale)
            engine.changeRestLength(interval.index, length)
        })
        return face
    }
    return {
        cables,
        facesToRemove: [
            handleFace(faceA),
            handleFace(faceB),
        ],
    }
}

export function createConnectedBrick(brick: IBrick, triangle: Triangle, scale: IPercent): IBrick {
    const face = brick.faces[triangle]
    const scaleFactor = percentToFactor(scale)
    const existingScale = percentToFactor(brick.scale)
    const brickScale = factorToPercent(scaleFactor * existingScale)
    const next = createBrickOnFace(face, brickScale)
    const connector = connectBricks(face, next.faces[next.base], brickScale)
    connector.facesToRemove.forEach(faceToRemove => brick.fabric.removeFace(faceToRemove, true))
    return next
}

export function executeActiveCode(before: IActiveCode[]): IActiveCode[] {
    const after: IActiveCode[] = []

    function grow(previousBrick: IBrick, codeTree: ICodeTree, triangle: Triangle, scale: IPercent): IActiveCode {
        const connectTriangle = previousBrick.base === Triangle.PPP ? TRIANGLE_DEFINITIONS[triangle].opposite : triangle
        const brick = createConnectedBrick(previousBrick, connectTriangle, scale)
        return {codeTree, brick}
    }

    function maybeGrow(previousBrick: IBrick, triangle: Triangle, codeTree?: ICodeTree): void {
        if (!codeTree) {
            return
        }
        const scale = percentOrHundred(codeTree.S)
        after.push(grow(previousBrick, {...codeTree, _: codeTree._ - 1}, triangle, scale))
    }

    before.forEach(beforeCode => {
        const {brick, codeTree} = beforeCode
        if (codeTree._ < 0) {
            throw new Error("Negative in code tree")
        }
        const oppositeCodeTree = codeTree._X
        const scale = percentOrHundred(codeTree.S)
        if (codeTree._ > 0) {
            const decremented = codeTree._ - 1
            const nextCodeTree = {...codeTree, _: decremented}
            after.push(grow(beforeCode.brick, nextCodeTree, Triangle.PPP, scale))
        } else if (oppositeCodeTree) {
            const decremented = oppositeCodeTree._ - 1
            const nextCodeTree = {...oppositeCodeTree, _: decremented}
            after.push(grow(beforeCode.brick, nextCodeTree, Triangle.PPP, scale))
            maybeGrow(brick, Triangle.PNN, codeTree.A)
            maybeGrow(brick, Triangle.NPN, codeTree.B)
            maybeGrow(brick, Triangle.NNP, codeTree.C)
        } else {
            maybeGrow(brick, Triangle.NPP, codeTree.A)
            maybeGrow(brick, Triangle.PNP, codeTree.B)
            maybeGrow(brick, Triangle.PPN, codeTree.C)
        }
    })
    return after
}

export function optimizeFabric(fabric: TensegrityFabric, highCross: boolean): void {
    const scale = percentOrHundred() // TODO: figure this out
    const instance = fabric.instance
    const engine = instance.engine
    const crossCables = fabric.intervals.filter(interval => interval.intervalRole === IntervalRole.Cross)
    const opposite = (joint: IJoint, cable: IInterval) => cable.alpha.index === joint.index ? cable.omega : cable.alpha
    const finish = (removeA: IInterval, removeB: IInterval, adjustA: IInterval, adjustB: IInterval, role: IntervalRole) => {
        fabric.removeInterval(removeA)
        fabric.removeInterval(removeB)
        engine.setIntervalRole(adjustA.index, adjustA.intervalRole = role)
        engine.changeRestLength(adjustA.index, roleLength(role, scale))
        engine.setIntervalRole(adjustB.index, adjustB.intervalRole = role)
        engine.changeRestLength(adjustB.index, roleLength(role, scale))
    }
    crossCables.forEach(ab => {
        const a = ab.alpha
        const aLoc = instance.getJointLocation(a.index)
        const b = ab.omega
        const cablesB = fabric.intervals.filter(interval => (
            interval.intervalRole !== IntervalRole.Cross && interval.intervalRole !== IntervalRole.Bar &&
            (interval.alpha.index === b.index || interval.omega.index === b.index)
        ))
        const bc = cablesB.reduce((cableA, cableB) => {
            const oppositeA = instance.getJointLocation(opposite(b, cableA).index)
            const oppositeB = instance.getJointLocation(opposite(b, cableB).index)
            return aLoc.distanceToSquared(oppositeA) < aLoc.distanceToSquared(oppositeB) ? cableA : cableB
        })
        const c = opposite(b, bc)
        const d = fabric.joints[b.oppositeIndex]
        const cd = fabric.findInterval(c, d)
        const ad = fabric.findInterval(a, d)
        if (!cd || !ad) {
            return
        }
        const role = IntervalRole.BowMid
        fabric.createInterval(c, a, role, roleLength(role, scale))
        if (highCross) {
            finish(ab, cd, bc, ad, IntervalRole.BowEndHigh)
        } else {
            finish(bc, ad, ab, cd, IntervalRole.BowEndLow)
        }
    })
}

export interface IFacePair {
    faceA: IFace
    locationA: Vector3
    normalA: Vector3
    faceB: IFace
    locationB: Vector3
    normalB: Vector3
    distance: number
    dot: number
}

export function closestFacePairs(fabric: TensegrityFabric, maxDistance: number): IFacePair[] {
    const faces = fabric.growthFaces
    const facePairs: IFacePair[] = []
    faces.forEach((faceA, indexA) => {
        faces.forEach((faceB, indexB) => {
            if (indexB >= indexA) {
                return
            }
            const locationA = fabric.instance.getFaceMidpoint(faceA.index)
            const locationB = fabric.instance.getFaceMidpoint(faceB.index)
            const distance = locationA.distanceTo(locationB)
            if (distance >= maxDistance) {
                return
            }
            const normalA = fabric.instance.getFaceNormal(faceA.index)
            const normalB = fabric.instance.getFaceNormal(faceB.index)
            const dot = normalA.dot(normalB)
            if (dot > -0.2) {
                return
            }
            facePairs.push({faceA, locationA, normalA, faceB, locationB, normalB, distance, dot})
        })
    })
    facePairs.sort((a, b) => a.distance - b.distance)
    return facePairs
}

export function connectClosestFacePair(fabric: TensegrityFabric): void {
    const closestPairs = closestFacePairs(fabric, 5)
    const facePair = closestPairs[0]
    const scale = percentOrHundred() // TODO: figure this out
    const connector = connectBricks(facePair.faceA, facePair.faceB, scale)
    connector.facesToRemove.forEach(faceToRemove => fabric.removeFace(faceToRemove, true))
}
