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
        this.generateKlein()
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

    private generateKlein(): void {
        console.log("klein")
        const WIDTH = 16
        const LENGTH = 16
        const triple = (row: number, col: number) => {
            const here = col * WIDTH + row
            const upX = (col + 1) * WIDTH + (row + WIDTH - 1 + col % 2) % WIDTH
            const downX = (col + 1) * WIDTH + (row + col % 2) % WIDTH
            if (col < LENGTH - 1) {
                return [here, upX, downX]
            } else {
                return [here, (LENGTH + 1) * WIDTH - 1 - downX, (LENGTH + 1) * WIDTH - 1 - upX]
            }
        }
        const pairs: number[][] = []
        for (let col = 0; col < LENGTH; col++) {
            for (let row = 0; row < WIDTH; row++) {
                pairs.push(triple(row, col))
            }
        }
        console.log("triples", pairs.map(p => `(${p[0]}-${p[1]}, ${p[0]}-${p[2]})`))
    }
}
