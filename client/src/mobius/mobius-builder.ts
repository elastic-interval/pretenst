import { Vector3 } from "three"

import { PULL_A, PUSH_C } from "../fabric/eig-util"
import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { percentFromFactor } from "../fabric/tensegrity-types"

const PUSH = PUSH_C
const PULL = PULL_A
const PUSH_SCALE = percentFromFactor(Math.sqrt(5))
const PULL_SCALE = percentFromFactor(1)

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
        const radius = this.segments / (Math.PI * 2)
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
            this.tensegrity.createInterval(joint(0), joint(1), PULL, PULL_SCALE)
            this.tensegrity.createInterval(joint(0), joint(2), PULL, PULL_SCALE)
            this.tensegrity.createInterval(joint(1), joint(3), PULL, PULL_SCALE)
        }
        for (let segment = 0; segment < this.segments - 2; segment++) {
            const joint = (offset: number) => this.tensegrity.joints[segment * 2 + offset]
            this.tensegrity.createInterval(joint(0), joint(5), PUSH, PUSH_SCALE)
            this.tensegrity.createInterval(joint(1), joint(4), PUSH, PUSH_SCALE)
        }
        const endJoint = (bottom: boolean, near: boolean, stepBack: boolean) => {
            const endIndex = near ? stepBack ? 2 : 0 : (this.segments - (stepBack ? 2 : 1)) * 2
            return this.tensegrity.joints[endIndex + (bottom ? 0 : 1)]
        }
        const botNear = endJoint(true, true, false)
        const topNear = endJoint(false, true, false)
        const botFar = endJoint(true, false, false)
        const topFar = endJoint(false, false, false)
        this.tensegrity.createInterval(botFar, topFar, PULL, PULL_SCALE)
        this.tensegrity.createInterval(botNear, topFar, PULL, PULL_SCALE)
        this.tensegrity.createInterval(botFar, topNear, PULL, PULL_SCALE)
        const botNearX = endJoint(true, true, true)
        const topNearX = endJoint(false, true, true)
        const botFarX = endJoint(true, false, true)
        const topFarX = endJoint(false, false, true)
        this.tensegrity.createInterval(botNear, botFarX, PUSH, PUSH_SCALE)
        this.tensegrity.createInterval(botFar, botNearX, PUSH, PUSH_SCALE)
        this.tensegrity.createInterval(topNearX, topFar, PUSH, PUSH_SCALE)
        this.tensegrity.createInterval(topFarX, topNear, PUSH, PUSH_SCALE)
    }
}
