/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Matrix4, Vector3 } from "three"

import { IntervalRole } from "./fabric-exports"
import {
    BAR_ARRAY,
    BarEnd,
    IBarDefinition,
    IBrick,
    IConnector,
    IFace,
    IGrowthTree,
    IInterval,
    IJoint,
    SPAN,
    Triangle,
    TRIANGLE_ARRAY,
} from "./tensegrity-brick-types"
import { TensegrityFabric } from "./tensegrity-fabric"

export function createBrickOnOrigin(fabric: TensegrityFabric): IBrick {
    const points = createBrickPointsOnOrigin(Triangle.PPP, 3, 1.0)
    return createBrick(fabric, points, Triangle.NNN)
}

export function createBrickOnFace(face: IFace): IBrick {
    const brick = face.brick
    const triangle = face.triangle
    const trianglePoints = brick.faces[triangle].joints.map(joint => brick.fabric.exports.getJointLocation(joint.index))
    const xform = xformToTriangle(trianglePoints)
    const points = createBrickPointsOnOrigin(Triangle.PPP, 0.8, 1.0)
    const movedToFace = points.map(p => p.applyMatrix4(xform))
    return createBrick(brick.fabric, movedToFace, Triangle.NNN)
}

export function connectBricks(faceA: IFace, faceB: IFace): IConnector {
    const a: IJoint[] = TRIANGLE_ARRAY[faceA.triangle].barEnds.map(barEnd => faceA.brick.joints[barEnd])
    const b: IJoint[] = TRIANGLE_ARRAY[faceB.triangle].barEnds.map(barEnd => faceB.brick.joints[barEnd])
    const joints = a.concat(b)
    const fabric = faceA.brick.fabric
    const ring = jointsToRing(fabric, joints)
    const cables: IInterval[] = []
    const createRingCable = (index: number) => {
        const joint = ring[index]
        const nextJoint = ring[(index + 1) % ring.length]
        const ringCable = fabric.createInterval(joint, nextJoint, IntervalRole.Ring, SPAN)
        cables.push(ringCable)
    }
    const createCrossCable = (index: number) => {
        const joint = ring[index]
        const nextJoint = ring[(index + 1) % ring.length]
        const prevJoint = ring[(index + ring.length - 1) % ring.length]
        const prevJointOppositeLocation = fabric.exports.getJointLocation(prevJoint.oppositeIndex)
        const jointLocation = fabric.exports.getJointLocation(joint.index)
        const nextJointOppositeLocation = fabric.exports.getJointLocation(nextJoint.oppositeIndex)
        const prevOpposite = jointLocation.distanceTo(prevJointOppositeLocation)
        const nextOpposite = jointLocation.distanceTo(nextJointOppositeLocation)
        const partnerJoint = fabric.joints[(prevOpposite < nextOpposite) ? prevJoint.oppositeIndex : nextJoint.oppositeIndex]
        const crossCable = fabric.createInterval(joint, partnerJoint, IntervalRole.Cross, SPAN)
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
        TRIANGLE_ARRAY.filter(t => t.opposite !== triangle && t.negative !== TRIANGLE_ARRAY[triangle].negative).forEach(t => {
            brick.faces[t.name].canGrow = false
        })
        const triangleRing = TRIANGLE_ARRAY[triangle].ring
        brick.rings[triangleRing].filter(interval => !interval.removed).forEach(interval => {
            interval.intervalRole = IntervalRole.Ring
            fabric.exports.setIntervalRole(interval.index, IntervalRole.Ring)
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

export function createConnectedBrick(brick: IBrick, triangle: Triangle): IBrick {
    const face = brick.faces[triangle]
    const next = createBrickOnFace(face)
    const connector = connectBricks(face, next.faces[next.base])
    connector.facesToRemove.forEach(faceToRemove => brick.fabric.removeFace(faceToRemove, true))
    return next
}

function executeGrowth(growthTree: IGrowthTree[]): IGrowthTree[] {
    const growing: IGrowthTree[] = []
    growthTree.forEach(tree => {
        const brick = tree.brick
        if (!brick) {
            throw new Error()
        }
        const grow = (next: IGrowthTree | undefined, triangle: Triangle) => {
            if (!next) {
                return
            }
            next.brick = createConnectedBrick(brick, triangle)
            growing.push(next)
        }
        grow(tree.forward, Triangle.PPP)
        grow(tree.turnA, Triangle.NPP)
        grow(tree.turnB, Triangle.PNP)
        grow(tree.turnC, Triangle.PPN)
    })
    return growing
}

function parseBetween(between: string): { turnA: string, turnB: string, turnC: string } {
    const commaIndexes: number[] = []
    let level = 0
    for (let walk = 0; walk < between.length; walk++) {
        const ch = between.charAt(walk)
        if (ch === "(") {
            level++
        }
        if (ch === ")") {
            level--
        }
        if (ch === "," && level === 0) {
            commaIndexes.push(walk)
        }
    }
    if (commaIndexes.length !== 2) {
        throw new Error("Commas")
    }
    const turnA = between.substring(0, commaIndexes[0])
    const turnB = between.substring(commaIndexes[0] + 1, commaIndexes[1])
    const turnC = between.substring(commaIndexes[1] + 1)
    return {turnA, turnB, turnC}
}

function parseCommands(commands: string): IGrowthTree {
    const command = commands.charAt(0)
    if (command === "0") {
        if (commands.length === 1) {
            return {}
        }
        if (commands.charAt(1) !== "(") {
            throw new Error("Open")
        }
        const lastClose = commands.lastIndexOf(")")
        if (lastClose !== commands.length - 1) {
            throw new Error("Close")
        }
        const between = commands.substring(2, lastClose)
        const {turnA, turnB, turnC} = parseBetween(between)
        return {turnA: parseCommands(turnA), turnB: parseCommands(turnB), turnC: parseCommands(turnC)}
    }
    if (command >= "0" && command <= "9") {
        const forwardCount = parseInt(command, 10)
        const nextCount = (forwardCount - 1).toString(10)
        return {forward: parseCommands(nextCount.toString() + commands.substr(1))}
    }
    throw new Error("Syntax error")
}

export function execute(brick: IBrick, commands: string): void {
    const growthTree: IGrowthTree = parseCommands(commands)
    growthTree.brick = brick
    let growing: IGrowthTree[] = [growthTree]
    while (growing.length > 0) {
        growing = executeGrowth(growing)
    }
    console.log("fabric " + brick.fabric.name, brick.fabric.exports.index)
}

export function optimizeFabric(fabric: TensegrityFabric, highCross: boolean): void {
    const crossCables = fabric.intervals.filter(interval => interval.intervalRole === IntervalRole.Cross)
    const opposite = (joint: IJoint, cable: IInterval) => cable.alpha.index === joint.index ? cable.omega : cable.alpha
    const finish = (removeA: IInterval, removeB: IInterval, adjustA: IInterval, adjustB: IInterval, role: IntervalRole) => {
        fabric.removeInterval(removeA)
        fabric.removeInterval(removeB)
        fabric.exports.setIntervalRole(adjustA.index, adjustA.intervalRole = role)
        fabric.exports.setIntervalRole(adjustB.index, adjustB.intervalRole = role)
    }
    crossCables.forEach(ab => {
        const a = ab.alpha
        const aLoc = fabric.exports.getJointLocation(a.index)
        const b = ab.omega
        const cablesB = fabric.intervals.filter(interval => (
            interval.intervalRole !== IntervalRole.Cross && interval.intervalRole !== IntervalRole.Bar &&
            (interval.alpha.index === b.index || interval.omega.index === b.index)
        ))
        const bc = cablesB.reduce((cableA, cableB) => {
            const oppositeA = fabric.exports.getJointLocation(opposite(b, cableA).index)
            const oppositeB = fabric.exports.getJointLocation(opposite(b, cableB).index)
            return aLoc.distanceToSquared(oppositeA) < aLoc.distanceToSquared(oppositeB) ? cableA : cableB
        })
        const c = opposite(b, bc)
        const d = fabric.joints[b.oppositeIndex]
        const cd = fabric.findInterval(c, d)
        const ad = fabric.findInterval(a, d)
        if (!cd || !ad) {
            return
        }
        fabric.createInterval(c, a, IntervalRole.BowMid, SPAN)
        if (highCross) {
            finish(ab, cd, bc, ad, IntervalRole.BowEndHigh)
        } else {
            finish(bc, ad, ab, cd, IntervalRole.BowEndLow)
        }
    })
}

export function brickToString(fabric: TensegrityFabric, brick: IBrick): string {
    // const points = brick.joints.map(joint => fabric.getJointLocation(joint))
    // const minHeight = points.reduce((height, point) => Math.min(height, point.y), Number.POSITIVE_INFINITY).toFixed(3)
    // const maxHeight = points.reduce((height, point) => Math.max(height, point.y), Number.NEGATIVE_INFINITY).toFixed(3)
    // return `Brick{\n\theight ${minHeight} to ${maxHeight}\n}`
    function vectorToString(indent: number): (vector: Vector3) => string {
        return vector => {
            const x = vector.x.toFixed(3)
            const y = vector.y.toFixed(3)
            const z = vector.z.toFixed(3)
            return `${"\t".repeat(indent)}(${x},${y},${z})`
        }
    }

    function intervalToString(indent: number): (interval: IInterval) => string {
        return (interval: IInterval) => {
            return `${"\t".repeat(indent)}(${interval.alpha}:${interval.omega})=${interval.span}`
        }
    }

    function faceToString(indent: number): (face: IFace) => string {
        return (face: IFace) => {
            return `${"\t".repeat(indent)}(${face.joints[0]}:${face.joints[1]}:${face.joints[2]})`
        }
    }

    const points = brick.joints.map(joint => fabric.exports.getJointLocation(joint.index))
    const joints = points.map(vectorToString(2)).join("\n")
    const minHeight = points.reduce((height, point) => Math.min(height, point.y), Number.POSITIVE_INFINITY).toFixed(3)
    const maxHeight = points.reduce((height, point) => Math.max(height, point.y), Number.NEGATIVE_INFINITY).toFixed(3)
    const bars = brick.bars.map(bar => intervalToString(2)(bar)).join("\n")
    const cables = brick.cables.map(intervalToString(2)).join("\n")
    const faces = brick.faces.map(faceToString(2)).join("\n")
    return `Brick{\n\theight ${minHeight} to ${maxHeight}\n\n\tjoints:\n${joints}\n\tbars:\n${bars}\n\tcables:\n${cables}\n\tfaces:\n${faces}`
}

export function connectorToString(fabric: TensegrityFabric, connector: IConnector): string {
    function intervalToString(indent: number): (interval: IInterval) => string {
        return (interval: IInterval) => {
            return `${"\t".repeat(indent)}(${interval.alpha}:${interval.omega})=${interval.span}`
        }
    }

    const cables = connector.cables.map(intervalToString(2)).join("\n")
    return `Connector{\n\tcables:\n${cables}\n}`
}

function xformToTriangle(trianglePoints: Vector3[]): Matrix4 {
    if (trianglePoints.length !== 3) {
        throw new Error()
    }
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const midSide = new Vector3().addVectors(trianglePoints[0], trianglePoints[1]).multiplyScalar(0.5)
    const x = new Vector3().subVectors(midSide, midpoint).normalize()
    const u = new Vector3().subVectors(trianglePoints[1], midpoint).normalize()
    const proj = new Vector3().add(x).multiplyScalar(x.dot(u))
    const z = u.sub(proj).normalize()
    const y = new Vector3().crossVectors(z, x).normalize()
    return new Matrix4().makeBasis(x, y, z).setPosition(midpoint)
}

function jointsToRing(fabric: TensegrityFabric, joints: IJoint[]): IJoint[] {
    const ring: IJoint[] = []
    while (joints.length > 0) {
        const ringEnd = ring[ring.length - 1]
        if (!ringEnd) {
            const anyJoint = joints.pop()
            if (!anyJoint) {
                throw new Error()
            }
            ring.push(anyJoint)
        } else {
            const ringEndLocation = fabric.exports.getJointLocation(ringEnd.index)
            let closest: IJoint | undefined
            joints.forEach(otherJoint => {
                if (!closest) {
                    closest = otherJoint
                    return
                }
                const otherLocation = fabric.exports.getJointLocation(otherJoint.index)
                const otherDistance = otherLocation.distanceTo(ringEndLocation)
                const closestLocation = fabric.exports.getJointLocation(closest.index)
                const closestDistance = closestLocation.distanceTo(ringEndLocation)
                if (otherDistance < closestDistance) {
                    closest = otherJoint
                }
            })
            if (!closest) {
                throw new Error()
            }
            ring.push(closest)
            joints = joints.filter(j => closest && j.index !== closest.index)
        }
    }
    return ring
}

function barsToPoints(vectors: Vector3[], bar: IBarDefinition): Vector3[] {
    vectors.push(new Vector3().add(bar.alpha))
    vectors.push(new Vector3().add(bar.omega))
    return vectors
}

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

function createBrickPointsOnOrigin(base: Triangle, altitude: number, scale: number): Vector3 [] {
    const points = BAR_ARRAY.reduce(barsToPoints, [])
    points.forEach(point => point.multiplyScalar(scale))
    const newBase = TRIANGLE_ARRAY[base].opposite
    const trianglePoints = TRIANGLE_ARRAY[newBase].barEnds.map((barEnd: BarEnd) => points[barEnd]).reverse()
    const midpoint = trianglePoints.reduce((mid: Vector3, p: Vector3) => mid.add(p), new Vector3()).multiplyScalar(1.0 / 3.0)
    const x = new Vector3().subVectors(trianglePoints[0], midpoint).normalize()
    const y = new Vector3().sub(midpoint).normalize()
    const z = new Vector3().crossVectors(y, x).normalize()
    const basis = new Matrix4().makeBasis(x, y, z)
    const fromBasis = new Matrix4().getInverse(basis).setPosition(new Vector3(0, midpoint.length() * altitude, 0))
    return points.map(p => p.applyMatrix4(fromBasis))
}

function createBrick(fabric: TensegrityFabric, points: Vector3[], baseTriangle: Triangle): IBrick {
    const jointIndexes = points.map((p, index) => fabric.createJointIndex(index, p))
    const bars = BAR_ARRAY.map(({}: IBarDefinition, index: number) => {
        const alphaIndex = jointIndexes[index * 2]
        const omegaIndex = jointIndexes[index * 2 + 1]
        const alpha: IJoint = {index: alphaIndex, oppositeIndex: omegaIndex}
        const omega: IJoint = {index: omegaIndex, oppositeIndex: alphaIndex}
        return fabric.createInterval(alpha, omega, IntervalRole.Bar, SPAN)
    })
    const joints = bars.reduce((arr: IJoint[], bar) => {
        arr.push(bar.alpha, bar.omega)
        return arr
    }, [])
    fabric.joints.push(...joints)
    const brick: IBrick = {base: baseTriangle, fabric, joints, bars, cables: [], rings: [[], [], [], []], faces: []}
    const role = IntervalRole.Triangle
    TRIANGLE_ARRAY.forEach(triangle => {
        const triangleJoints = triangle.barEnds.map(barEnd => joints[barEnd])
        for (let walk = 0; walk < 3; walk++) {
            const interval = fabric.createInterval(triangleJoints[walk], triangleJoints[(walk + 1) % 3], role, SPAN)
            brick.cables.push(interval)
            brick.rings[triangle.ringMember[walk]].push(interval)
        }
    })
    TRIANGLE_ARRAY.forEach(triangle => {
        const face = fabric.createFace(brick, triangle.name)
        brick.faces.push(face)
    })
    fabric.exports.clear()
    return brick
}
