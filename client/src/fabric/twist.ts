import { Vector3 } from "three"

import { avg, midpoint, PHI, pointsToNormal, ROOT3, ROOT6, sub } from "./eig-util"
import { Tensegrity } from "./tensegrity"
import {
    areAdjacent,
    FaceName,
    factorFromPercent,
    IFace,
    IInterval,
    IJoint,
    IPercent,
    IRole,
    Spin,
} from "./tensegrity-types"

const PULL_A: IRole = {
    tag: "(a)",
    push: false,
    length: 1,
    stiffness: 1,
}

const PULL_B: IRole = {
    tag: "(b)",
    push: false,
    length: ROOT3,
    stiffness: 1,
}

const PUSH_B: IRole = {
    tag: "[B]",
    push: true,
    length: PHI * ROOT3,
    stiffness: 1,
}

const PUSH_A: IRole = {
    tag: "[A]",
    push: true,
    length: ROOT6,
    stiffness: 1,
}

export class Twist {

    public readonly faces: IFace[] = []
    public readonly pushes: IInterval[] = []
    public readonly pulls: IInterval[] = []

    constructor(
        public readonly tensegrity: Tensegrity,
        public readonly spin: Spin,
        public readonly scale: IPercent,
        baseKnown?: Vector3[],
    ) {
        const base = !baseKnown ? createBase(new Vector3(), 3) :
            baseKnown.length === 3 ? baseKnown : createBase(baseKnown[0], 3)
        switch (this.spin) {
            case Spin.Left:
                this.createSingle(base, true)
                break
            case Spin.Right:
                this.createSingle(base, false)
                break
            case Spin.LeftRight:
                this.createDouble(base, true)
                break
            case Spin.RightLeft:
                this.createDouble(base, false)
                break
            default:
                throw new Error("Spin?")
        }
    }

    public face(faceName: FaceName): IFace {
        switch (this.faces.length) {
            case 2:
                switch (faceName) {
                    case FaceName.a:
                        return this.faces[0]
                    case FaceName.A:
                        return this.faces[1]
                }
                break
            case 8:
                switch (faceName) {
                    case FaceName.a:
                        return this.faces[0]
                    case FaceName.B:
                        return this.faces[2]
                    case FaceName.C:
                        return this.faces[1]
                    case FaceName.D:
                        return this.faces[3]
                    case FaceName.b:
                        return this.faces[4]
                    case FaceName.c:
                        return this.faces[5]
                    case FaceName.d:
                        return this.faces[6]
                    case FaceName.A:
                        return this.faces[7]
                }
                break
        }
        throw new Error(`Face ${FaceName[faceName]} not found in twist with ${this.faces.length} faces`)
    }

    public get adjacentPulls(): IInterval[] {
        return this.tensegrity.intervals
            .filter(({role}) => !role.push)
            .reduce((detailsSoFar, interval) => {
                const adjacent = this.pushes.find(push => areAdjacent(push, interval))
                if (adjacent) {
                    detailsSoFar.push(interval)
                }
                return detailsSoFar
            }, [] as IInterval[])
    }

    private createSingle(base: Vector3[], leftSpin: boolean): void {
        const pairs = pointPairs(base, this.scale, leftSpin)
        const ends = pairs.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createJoint(alpha),
            omega: this.tensegrity.createJoint(omega),
        }))
        const alphaJoint = this.tensegrity.createJoint(midpoint(pairs.map(({alpha}) => alpha)))
        const omegaJoint = this.tensegrity.createJoint(midpoint(pairs.map(({omega}) => omega)))
        this.tensegrity.instance.refreshFloatView()
        ends.forEach(({alpha, omega}) => {
            const push = this.tensegrity.createInterval(alpha, omega, PUSH_A, this.scale)
            this.pushes.push(push)
            alpha.push = omega.push = push
        })
        const makeFace = (joints: IJoint[], midJoint: IJoint) => {
            const pulls = joints.map(j => this.tensegrity.createInterval(j, midJoint, PULL_A, this.scale))
            this.pulls.push(...pulls)
            this.faces.push(this.tensegrity.createFace(this, joints, pulls, this.spin, this.scale, midJoint))
        }
        makeFace(ends.map(({alpha}) => alpha), alphaJoint)
        makeFace(ends.map(({omega}) => omega).reverse(), omegaJoint)
        ends.forEach(({alpha}, index) => {
            const omega = ends[(ends.length + index + (leftSpin ? -1 : 1)) % ends.length].omega
            this.pulls.push(this.tensegrity.createInterval(alpha, omega, PULL_B, this.scale))
        })
    }

    private createDouble(base: Vector3[], leftSpin: boolean): void {
        const botPairs = pointPairs(base, this.scale, leftSpin)
        const topPairs = pointPairs(botPairs.map(({omega}) => omega), this.scale, !leftSpin)
        const bot = botPairs.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createJoint(alpha),
            omega: this.tensegrity.createJoint(omega),
        }))
        const top = topPairs.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createJoint(alpha),
            omega: this.tensegrity.createJoint(omega),
        }))
        this.tensegrity.instance.refreshFloatView()
        const ends = [...bot, ...top]
        ends.forEach(({alpha, omega}) => {
            const push = this.tensegrity.createInterval(alpha, omega, PUSH_B, this.scale)
            this.pushes.push(push)
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
        const jointLocation = (joint: IJoint) => this.tensegrity.instance.jointLocation(joint)
        const midJoints = faceJoints.map(joints => this.tensegrity.createJoint(midpoint(joints.map(jointLocation))))
        this.tensegrity.instance.refreshFloatView()
        faceJoints.forEach((joints, index) => {
            const midJoint = midJoints[index]
            const pulls = joints.map(j => this.tensegrity.createInterval(j, midJoint, PULL_A, this.scale))
            this.pulls.push(...pulls)
            const spin = leftSpin === ([0, 4, 5, 6].some(n => n === index)) ? Spin.Left : Spin.Right
            this.faces.push(this.tensegrity.createFace(this, joints, pulls, spin, this.scale, midJoint))
        })
    }
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
