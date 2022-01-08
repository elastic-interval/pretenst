import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"

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
    }
}
