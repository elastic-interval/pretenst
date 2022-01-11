import { Vector3 } from "three"

import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { IRole, percentOrHundred } from "../fabric/tensegrity-types"

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
const SCALE = percentOrHundred()

export class MobiusBuilder implements ITensegrityBuilder {
    private tensegrity: Tensegrity

    constructor(public readonly segments: number) {
    }

    public operateOn(tensegrity: Tensegrity): void {
        this.tensegrity = tensegrity
    }

    public finished(): boolean {
        return this.tensegrity.joints.length > 0
    }

    public work(): void {
        const radius = this.segments * PULL_LENGTH.length * 0.34
        const location = (bottom: boolean, angle: number) =>
            new Vector3(Math.sin(angle) * radius, bottom ? -0.5 : 0.5, Math.cos(angle) * radius)
        for (let segment = 0; segment < this.segments; segment++) {
            const angle = segment / this.segments * Math.PI * 2
            this.tensegrity.createJoint(location(true, angle))
            this.tensegrity.createJoint(location(false, angle))
        }
        this.tensegrity.instance.refreshFloatView()
        for (let segment = 0; segment < this.segments - 1; segment++) {
            const joint = (offset: number) => this.tensegrity.joints[segment * 2 + offset]
            this.tensegrity.createInterval(joint(0), joint(1), PULL_WIDTH, SCALE)
            this.tensegrity.createInterval(joint(0), joint(2), PULL_LENGTH, SCALE)
            this.tensegrity.createInterval(joint(1), joint(3), PULL_LENGTH, SCALE)
        }
        for (let segment = 0; segment < this.segments - 2; segment++) {
            const joint = (offset: number) => this.tensegrity.joints[segment * 2 + offset]
            this.tensegrity.createInterval(joint(0), joint(5), PUSH, SCALE)
            this.tensegrity.createInterval(joint(1), joint(4), PUSH, SCALE)
        }
        const endJoint = (bottom: boolean, near: boolean, stepBack: boolean) => {
            const endIndex = near ? stepBack ? 2 : 0 : (this.segments - (stepBack ? 2 : 1)) * 2
            return this.tensegrity.joints[endIndex + (bottom ? 0 : 1)]
        }
        const botNear = endJoint(true, true, false)
        const topNear = endJoint(false, true, false)
        const botFar = endJoint(true, false, false)
        const topFar = endJoint(false, false, false)
        this.tensegrity.createInterval(botFar, topFar, PULL_WIDTH, SCALE)
        this.tensegrity.createInterval(botFar, topNear, PULL_LENGTH, SCALE)
        this.tensegrity.createInterval(botNear, topFar, PULL_LENGTH, SCALE)
        const botNearX = endJoint(true, true, true)
        const topNearX = endJoint(false, true, true)
        const botFarX = endJoint(true, false, true)
        const topFarX = endJoint(false, false, true)
        this.tensegrity.createInterval(botNear, botFarX, PUSH, SCALE)
        this.tensegrity.createInterval(botFar, botNearX, PUSH, SCALE)
        this.tensegrity.createInterval(topNearX, topFar, PUSH, SCALE)
        this.tensegrity.createInterval(topFarX, topNear, PUSH, SCALE)
    }
}
