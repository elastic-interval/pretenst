import { Vector3 } from "three"

import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { IJoint, IPercent, IRole, percentOrHundred } from "../fabric/tensegrity-types"

const PUSH: IRole = {
    tag: "push",
    push: true,
    length: 8,
    stiffness: 1,
}

const PULL: IRole = {
    tag: "pull",
    push: false,
    length: 1,
    stiffness: 1,
}

export class KleinBuilder implements ITensegrityBuilder {
    private tensegrity: Tensegrity

    constructor(public readonly width: number, public readonly height: number, public readonly shift: number) {
        if (height % 2 === 0) {
            throw new Error("Even height not allowed")
        }
    }

    public operateOn(tensegrity: Tensegrity): void {
        this.tensegrity = tensegrity
    }

    public finished(): boolean {
        return this.tensegrity.joints.length > 0
    }

    public work(): void {
        for (let j = 0; j < this.width * this.height / 2; j++) {
            this.randomJoint()
        }
        this.tensegrity.instance.refreshFloatView()
        const createInterval = (alpha: IJoint, omega: IJoint, role: IRole, scale: IPercent) =>
            this.tensegrity.createInterval(alpha, omega, role, scale, 100)
        const createFace = (j0: IJoint, j1: IJoint, j2: IJoint) =>
            this.tensegrity.instance.fabric.create_face(j0.index, j1.index, j2.index)
        for (let y = 0; y < this.height; y++) {
            const scale = percentOrHundred()
            for (let x = 0; x < this.width; x++) {
                if ((x + y) % 2 === 0) {
                    const a = this.kleinJoint(x, y)
                    const b = this.kleinJoint(x - 1, y + 1)
                    const c = this.kleinJoint(x + 1, y + 1)
                    const d = this.kleinJoint(x, y + 2)
                    const e = this.kleinJoint(x - 1, y + 3)
                    const f = this.kleinJoint(x + 1, y + 3)
                    createInterval(a, b, PULL, scale)
                    createInterval(a, c, PULL, scale)
                    createInterval(a, d, PULL, scale)
                    createInterval(a, e, PUSH, scale)
                    createInterval(a, f, PUSH, scale)
                    createInterval(e, f, PUSH, scale)
                    createFace(a, b, d)
                    createFace(a, c, d)
                }
            }
        }
    }

    private randomJoint(): void {
        const location = new Vector3(100)
        while (location.lengthSq() > 1) {
            location.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
        }
        this.tensegrity.createJoint(location)
    }

    private kleinJoint(xx: number, yy: number): IJoint {
        const noflip = Math.floor(yy / this.height) % 2 === 0
        const x = (noflip ? xx : this.shift + this.width * 2 - 1 - xx) % this.width
        const y = yy % this.height
        const index = Math.floor((y * this.width + x) / 2)
        return this.tensegrity.joints[index]
    }
}

