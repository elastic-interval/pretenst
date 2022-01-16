import { Vector3 } from "three"

import { avg, midpoint, pointsToNormal, sub } from "./eig-util"
import { PULL_A, PULL_B, PUSH_A, PUSH_B } from "./tenscript"
import { Tensegrity } from "./tensegrity"
import {
    areAdjacent, expectPush,
    FaceName,
    factorFromPercent,
    IInterval,
    IJoint,
    IPercent,
    ITwist,
    ITwistFace,
    Spin,
} from "./tensegrity-types"

export function createTwist(tensegrity: Tensegrity, spin: Spin, scale: IPercent, baseKnown?: Vector3[]): ITwist {
    const base = !baseKnown ? createBase(new Vector3(), 3) :
        baseKnown.length === 3 ? baseKnown : createBase(baseKnown[0], 3)
    switch (spin) {
        case Spin.Left:
            return createSingle(base, spin, true, scale, tensegrity)
        case Spin.Right:
            return createSingle(base, spin, false, scale, tensegrity)
        case Spin.LeftRight:
            return createDouble(base, true, scale, tensegrity)
        case Spin.RightLeft:
            return createDouble(base, false, scale, tensegrity)
        default:
            throw new Error("Spin?")
    }
}

export function faceFromTwist(faceName: FaceName, twist: ITwist): ITwistFace {
    switch (twist.faces.length) {
        case 2:
            switch (faceName) {
                case FaceName.a:
                    return twist.faces[0]
                case FaceName.A:
                    return twist.faces[1]
            }
            break
        case 8:
            switch (faceName) {
                case FaceName.a:
                    return twist.faces[0]
                case FaceName.B:
                    return twist.faces[2]
                case FaceName.C:
                    return twist.faces[1]
                case FaceName.D:
                    return twist.faces[3]
                case FaceName.b:
                    return twist.faces[4]
                case FaceName.c:
                    return twist.faces[5]
                case FaceName.d:
                    return twist.faces[6]
                case FaceName.A:
                    return twist.faces[7]
            }
            break
    }
    throw new Error(`Face ${FaceName[faceName]} not found in twist with ${twist.faces.length} faces`)
}

export function adjacentPullsFromTwist(tensegrity: Tensegrity, twist: ITwist): IInterval[] {
    return tensegrity.intervals
        .filter(({role}) => !role.push)
        .reduce((detailsSoFar, interval) => {
            const adjacent = twist.pushes.find(push => areAdjacent(push, interval))
            if (adjacent) {
                detailsSoFar.push(interval)
            }
            return detailsSoFar
        }, [] as IInterval[])
}

function addFace(twist: ITwist, ends: IJoint[], pulls: IInterval[], spin: Spin, scale: IPercent, joint?: IJoint): void {
    const f0 = ends[0]
    const f1 = ends[2]
    const f2 = ends[1]
    const pushes = [expectPush(f0), expectPush(f1), expectPush(f2)]
    const face: ITwistFace = {twist, spin, scale, ends, pushes, pulls, markNumbers: [], removed: false, joint}
    twist.faces.push(face)
}

export function removeFace(face: ITwistFace, tensegrity: Tensegrity): void {
    face.pulls.forEach(pull => tensegrity.removeInterval(pull))
    face.pulls = []
    if (face.joint) {
        tensegrity.removeJoint(face.joint)
    }
    face.removed = true
}

function createSingle(base: Vector3[], spin: Spin, leftSpin: boolean, scale: IPercent, tensegrity: Tensegrity): ITwist {
    const twist: ITwist = {pushes: [], pulls: [], faces: []}
    const pairs = pointPairs(base, scale, leftSpin)
    const ends = pairs.map(({alpha, omega}) => ({
        alpha: tensegrity.createJoint(alpha),
        omega: tensegrity.createJoint(omega),
    }))
    const alphaJoint = tensegrity.createJoint(midpoint(pairs.map(({alpha}) => alpha)))
    const omegaJoint = tensegrity.createJoint(midpoint(pairs.map(({omega}) => omega)))
    tensegrity.instance.refreshFloatView()
    ends.forEach(({alpha, omega}) => {
        const push = tensegrity.createInterval(alpha, omega, PUSH_A, scale)
        twist.pushes.push(push)
        alpha.push = omega.push = push
    })
    const makeFace = (joints: IJoint[], midJoint: IJoint) => {
        const pulls = joints.map(j => tensegrity.createInterval(j, midJoint, PULL_A, scale))
        twist.pulls.push(...pulls)
        addFace(twist, joints, pulls, spin, scale, midJoint)
    }
    makeFace(ends.map(({alpha}) => alpha), alphaJoint)
    makeFace(ends.map(({omega}) => omega).reverse(), omegaJoint)
    ends.forEach(({alpha}, index) => {
        const omega = ends[(ends.length + index + (leftSpin ? -1 : 1)) % ends.length].omega
        twist.pulls.push(tensegrity.createInterval(alpha, omega, PULL_B, scale))
    })
    return twist
}

function createDouble(base: Vector3[], leftSpin: boolean, scale: IPercent, tensegrity: Tensegrity): ITwist {
    const twist: ITwist = {pushes: [], pulls: [], faces: []}
    const botPairs = pointPairs(base, scale, leftSpin)
    const topPairs = pointPairs(botPairs.map(({omega}) => omega), scale, !leftSpin)
    const bot = botPairs.map(({alpha, omega}) => ({
        alpha: tensegrity.createJoint(alpha),
        omega: tensegrity.createJoint(omega),
    }))
    const top = topPairs.map(({alpha, omega}) => ({
        alpha: tensegrity.createJoint(alpha),
        omega: tensegrity.createJoint(omega),
    }))
    tensegrity.instance.refreshFloatView()
    const ends = [...bot, ...top]
    ends.forEach(({alpha, omega}) => {
        const push = tensegrity.createInterval(alpha, omega, PUSH_B, scale)
        twist.pushes.push(push)
        alpha.push = omega.push = push
    })
    const faceJoints = leftSpin ?
        [
            [bot[0].alpha, bot[1].alpha, bot[2].alpha], // a
            [bot[2].alpha, bot[1].omega, top[1].alpha], // B
            [bot[0].alpha, bot[2].omega, top[2].alpha], // C
            [bot[1].alpha, bot[0].omega, top[0].alpha], // D
            [top[1].omega, top[0].alpha, bot[1].omega].reverse(), // b
            [top[0].omega, top[2].alpha, bot[0].omega].reverse(), // d
            [top[2].omega, top[1].alpha, bot[2].omega].reverse(), // c
            [top[0].omega, top[1].omega, top[2].omega].reverse(), // A
        ] : [
            [bot[0].alpha, bot[1].alpha, bot[2].alpha], // a
            [bot[2].alpha, bot[0].omega, top[2].alpha].reverse(), // D
            [bot[0].alpha, bot[1].omega, top[0].alpha].reverse(), // B
            [bot[1].alpha, bot[2].omega, top[1].alpha].reverse(), // C
            [top[1].omega, top[2].alpha, bot[2].omega], // b
            [top[2].omega, top[0].alpha, bot[0].omega], // c
            [top[0].omega, top[1].alpha, bot[1].omega], // d
            [top[0].omega, top[1].omega, top[2].omega].reverse(), // A
        ]
    const jointLocation = (joint: IJoint) => tensegrity.instance.jointLocation(joint)
    const midJoints = faceJoints.map(joints => tensegrity.createJoint(midpoint(joints.map(jointLocation))))
    tensegrity.instance.refreshFloatView()
    faceJoints.forEach((joints, index) => {
        const midJoint = midJoints[index]
        const pulls = joints.map(j => tensegrity.createInterval(j, midJoint, PULL_A, scale))
        twist.pulls.push(...pulls)
        const spin = leftSpin === ([0, 4, 5, 6].some(n => n === index)) ? Spin.Left : Spin.Right
        addFace(twist, joints, pulls, spin, scale, midJoint)
    })
    return twist
}

interface IPointPair {
    alpha: Vector3
    omega: Vector3
}

function pointPairs(base: Vector3[], scale: IPercent, leftSpin: boolean): IPointPair[] {
    const points: IPointPair[] = []
    const mid = midpoint(base)
    const midVector = () => new Vector3().copy(mid)
    const factor = factorFromPercent(scale)
    const up = pointsToNormal(base).multiplyScalar(-factor)
    for (let index = 0; index < base.length; index++) {
        const fromMid = (offset: number) => sub(base[(index + base.length + offset) % base.length], mid)
        const between = (idx1: number, idx2: number) => avg(fromMid(idx1), fromMid(idx2))
        const alpha = midVector().addScaledVector(between(0, 1), factor)
        const omega = midVector().add(up).addScaledVector(leftSpin ? between(1, 2) : between(-1, 0), factor)
        points.push({alpha, omega})
    }
    return points
}

function createBase(location: Vector3, pushesPerTwist: number): Vector3[] {
    const base: Vector3[] = []
    for (let index = 0; index < pushesPerTwist; index++) {
        const angle = index * Math.PI * 2 / pushesPerTwist
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        base.push(new Vector3(x, 0, y).add(location))
    }
    return base
}
