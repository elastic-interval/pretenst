import { Vector3 } from "three"

import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { IJoint, IRole, percentOrHundred } from "../fabric/tensegrity-types"

const PUSH: IRole = {
    tag: "push",
    push: true,
    length: 3,
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
    public readonly jointCount: number
    private tensegrity: Tensegrity

    constructor(segments: number) {
        this.jointCount = segments * 2 + 1
        this.radius = this.jointCount * PULL_LENGTH.length * 0.17
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
        for (let joint = 0; joint < this.jointCount; joint++) {
            const angle = joint / this.jointCount * Math.PI * 2
            this.tensegrity.createJoint(location(joint % 2 === 0, angle))
        }
        this.tensegrity.instance.refreshFloatView()
        const createInterval = (alpha: IJoint, omega: IJoint, role: IRole) =>
            this.tensegrity.createInterval(alpha, omega, role, percentOrHundred(), 1000)
        for (let jointIndex = 0; jointIndex < this.jointCount; jointIndex++) {
            const joint = (offset: number) => this.tensegrity.joints[(jointIndex * 2 + offset) % this.tensegrity.joints.length]
            createInterval(joint(0), joint(2), PULL_LENGTH)
            createInterval(joint(0), joint(1), PULL_WIDTH)
            createInterval(joint(0), joint(3), PUSH)
            this.tensegrity.instance.fabric.create_face(joint(0).index, joint(1).index, joint(2).index)
        }
    }
}
