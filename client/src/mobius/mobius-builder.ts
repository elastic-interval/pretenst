import { Vector3 } from "three"

import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { IJoint, IRole, percentOrHundred } from "../fabric/tensegrity-types"

const PUSH: IRole = {
    tag: "push",
    push: true,
    length: 5,
    stiffness: 1,
}

const PULL_WIDTH: IRole = {
    tag: "pull-width",
    push: false,
    length: 1,
    stiffness: 1,
}

const PULL_LENGTH: IRole = {
    tag: "pull-length",
    push: false,
    length: 0.4,
    stiffness: 1,
}

export class MobiusBuilder implements ITensegrityBuilder {
    public readonly radius: number
    private tensegrity: Tensegrity

    constructor(public readonly jointCount: number) {
        this.radius = this.jointCount * PULL_LENGTH.length * 0.34
    }

    public operateOn(tensegrity: Tensegrity): void {
        this.tensegrity = tensegrity
    }

    public finished(): boolean {
        return this.tensegrity.joints.length > 0
    }

    public work(): void {
        const location = (bottom: boolean, angle: number) => {
            const major = new Vector3(Math.cos(angle) * this.radius, 0, Math.sin(angle) * this.radius)
            const outwards = new Vector3().copy(major).normalize()
            const up = new Vector3(0, 1, 0)
            const ray = new Vector3().addVectors(outwards.multiplyScalar(Math.sin(angle / 2)), up.multiplyScalar(Math.cos(angle / 2)))
            const minor = ray.multiplyScalar((bottom ? -0.5 : 0.5))
            return major.add(minor)
        }
        for (let segment = 0; segment < this.jointCount; segment++) {
            const angle = segment / this.jointCount * Math.PI * 2
            this.tensegrity.createJoint(location(true, angle))
            this.tensegrity.createJoint(location(false, angle))
        }
        this.tensegrity.instance.refreshFloatView()
        const createInterval = (alpha: IJoint, omega: IJoint, role: IRole)=>
            this.tensegrity.createInterval(alpha, omega, role, percentOrHundred(), 1000)
        for (let segment = 0; segment < this.jointCount - 1; segment++) {
            const joint = (offset: number) => this.tensegrity.joints[segment * 2 + offset]
            createInterval(joint(0), joint(1), PULL_WIDTH)
            createInterval(joint(0), joint(2), PULL_LENGTH)
            createInterval(joint(1), joint(3), PULL_LENGTH)
        }
        for (let segment = 0; segment < this.jointCount - 2; segment++) {
            const joint = (offset: number) => this.tensegrity.joints[segment * 2 + offset]
            createInterval(joint(0), joint(5), PUSH)
            createInterval(joint(1), joint(4), PUSH)
        }
        const endJoint = (bottom: boolean, near: boolean, stepBack: boolean) => {
            const endIndex = near ? stepBack ? 2 : 0 : (this.jointCount - (stepBack ? 2 : 1)) * 2
            return this.tensegrity.joints[endIndex + (bottom ? 0 : 1)]
        }
        const botNear = endJoint(true, true, false)
        const topNear = endJoint(false, true, false)
        const botFar = endJoint(true, false, false)
        const topFar = endJoint(false, false, false)
        createInterval(botFar, topFar, PULL_WIDTH)
        createInterval(botFar, topNear, PULL_LENGTH)
        createInterval(botNear, topFar, PULL_LENGTH)
        const botNearX = endJoint(true, true, true)
        const topNearX = endJoint(false, true, true)
        const botFarX = endJoint(true, false, true)
        const topFarX = endJoint(false, false, true)
        createInterval(botNear, botFarX, PUSH)
        createInterval(botFar, botNearX, PUSH)
        createInterval(topNearX, topFar, PUSH)
        createInterval(topFarX, topNear, PUSH)
    }
}
