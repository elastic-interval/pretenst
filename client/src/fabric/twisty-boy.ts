import { Vector3 } from "three"

import { avg, IntervalRole, midpoint, normal, sub } from "./eig-util"
import { Tensegrity } from "./tensegrity"
import { FaceName, IFace, IInterval, IJoint, jointLocation, percentFromFactor, Spin } from "./tensegrity-types"

export function createTwistOn(tensegrity: Tensegrity, baseFace: IFace, spin: Spin, radius: number): TwistyBoy {
    return new TwistyBoy(tensegrity, spin, radius, baseFace.ends.map(jointLocation))
}

export class TwistyBoy {

    public readonly faces: IFace[] = []
    public readonly pushes: IInterval[] = []
    public readonly pulls: IInterval[] = []

    constructor(
        private tensegrity: Tensegrity,
        public readonly spin: Spin,
        public readonly radius: number,
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

    private createSingle(base: Vector3[], leftSpin: boolean): void {
        const scale = percentFromFactor(this.radius) // TODO
        const pairs = pointPairs(base, this.radius, leftSpin)
        const ends = pairs.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createJoint(alpha),
            omega: this.tensegrity.createJoint(omega),
        }))
        const alphaJoint = this.tensegrity.createJoint(midpoint(pairs.map(({alpha}) => alpha)))
        const omegaJoint = this.tensegrity.createJoint(midpoint(pairs.map(({omega}) => omega)))
        this.tensegrity.instance.refreshFloatView()
        ends.forEach(({alpha, omega}) => {
            const push = this.tensegrity.createInterval(alpha, omega, IntervalRole.RootPush, scale)
            this.pushes.push(push)
            alpha.push = omega.push = push
        })
        const makeFace = (joints: IJoint[], midJoint: IJoint) => {
            this.pulls.push(...joints.map(j => this.tensegrity.createInterval(j, midJoint, IntervalRole.Ring, scale)))
            this.faces.push(this.tensegrity.createFace(joints, false, this.spin, scale, alphaJoint))
        }
        makeFace(ends.map(({alpha}) => alpha), alphaJoint)
        makeFace(ends.map(({omega}) => omega).reverse(), omegaJoint)
        ends.forEach(({alpha}, index) => {
            const omega = ends[(ends.length + index + (leftSpin ? -1 : 1)) % ends.length].omega
            this.pulls.push(this.tensegrity.createInterval(alpha, omega, IntervalRole.Twist, scale))
        })
    }

    private createDouble(base: Vector3[], leftSpin: boolean): void {
        const scale = percentFromFactor(this.radius) // TODO
        const botPairs = pointPairs(base, this.radius, leftSpin)
        const topPairs = pointPairs(botPairs.map(({omega}) => omega), this.radius, !leftSpin)
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
            const push = this.tensegrity.createInterval(alpha, omega, IntervalRole.PhiPush, scale)
            this.pushes.push(push)
            alpha.push = omega.push = push
        })
        const faceJoints = leftSpin ?
            [
                [bot[0].alpha, bot[1].alpha, bot[2].alpha], // a
                [bot[0].alpha, bot[2].omega, top[0].alpha], // B
                [bot[1].alpha, bot[0].omega, top[1].alpha], // C
                [bot[2].alpha, bot[1].omega, top[2].alpha], // D
                [top[0].omega, top[2].alpha, bot[2].omega].reverse(), // b
                [top[1].omega, top[0].alpha, bot[0].omega].reverse(), // c
                [top[2].omega, top[1].alpha, bot[1].omega].reverse(), // d
                [top[0].omega, top[1].omega, top[2].omega].reverse(), // A
            ] : [
                [bot[0].alpha, bot[1].alpha, bot[2].alpha], // a
                [bot[0].alpha, bot[1].omega, top[0].alpha].reverse(), // B
                [bot[1].alpha, bot[2].omega, top[1].alpha].reverse(), // C
                [bot[2].alpha, bot[0].omega, top[2].alpha].reverse(), // D
                [top[0].omega, top[1].alpha, bot[2].omega], // b
                [top[1].omega, top[2].alpha, bot[0].omega], // c
                [top[2].omega, top[0].alpha, bot[1].omega], // d
                [top[0].omega, top[1].omega, top[2].omega].reverse(), // A
            ]
        const midJoints = faceJoints.map(joints => this.tensegrity.createJoint(midpoint(joints.map(jointLocation))))
        this.tensegrity.instance.refreshFloatView()
        faceJoints.forEach((joints, index) => {
            const midJoint = midJoints[index]
            this.pulls.push(...joints.map(j => this.tensegrity.createInterval(j, midJoint, IntervalRole.Ring, scale)))
            this.faces.push(this.tensegrity.createFace(joints, true, this.spin, scale, midJoint))
        })
    }
}

interface IPointPair {
    alpha: Vector3
    omega: Vector3
}

function pointPairs(base: Vector3[], radius: number, leftSpin: boolean): IPointPair[] {
    const points: IPointPair[] = []
    const mid = midpoint(base)
    const midVector = () => new Vector3().copy(mid)
    const up = normal(base).multiplyScalar(radius)
    for (let index = 0; index < base.length; index++) {
        const fromMid = (offset: number) => sub(base[(index + base.length + offset) % base.length], mid)
        const between = (idx1: number, idx2: number) => avg(fromMid(idx1), fromMid(idx2))
        const alpha = midVector().addScaledVector(between(0, 1), radius)
        const omega = midVector().add(up).addScaledVector(leftSpin ? between(1, 2) : between(-1, 0), radius)
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
