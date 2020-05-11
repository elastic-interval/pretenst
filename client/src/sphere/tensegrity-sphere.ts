/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, IntervalRole, Stage } from "eig"
import { Vector3 } from "three"

import { isPushInterval } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { factorToPercent, IInterval, IJoint, IPercent, percentToFactor } from "../fabric/tensegrity-types"

import { SphereBuilder } from "./sphere-builder"

export class TensegritySphere {
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    private stage = Stage.Growing

    constructor(
        public readonly location: Vector3,
        public readonly roleDefaultLength: (intervalRole: IntervalRole) => number,
        public readonly instance: FabricInstance,
    ) {
        this.instance.clear()
    }

    public get fabric(): Fabric {
        return this.instance.fabric
    }

    public createJoint(location: Vector3): number {
        return this.fabric.create_joint(location.x, location.y, location.z)
    }

    public createInterval(
        alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent,
        stiffness: number, linearDensity: number, coundown: number,
    ): IInterval {
        const idealLength = alpha.location().distanceTo(omega.location())
        const scaleFactor = percentToFactor(scale)
        const defaultLength = this.roleDefaultLength(intervalRole)
        const restLength = scaleFactor * defaultLength
        const index = this.fabric.create_interval(
            alpha.index, omega.index, intervalRole,
            idealLength, restLength, stiffness, linearDensity, coundown)
        const interval: IInterval = {
            index,
            intervalRole,
            scale,
            alpha,
            omega,
            removed: false,
            isPush: isPushInterval(intervalRole),
            location: () => new Vector3().addVectors(alpha.location(), omega.location()).multiplyScalar(0.5),
        }
        this.intervals.push(interval)
        return interval
    }

    public changeIntervalScale(interval: IInterval, factor: number): void {
        interval.scale = factorToPercent(percentToFactor(interval.scale) * factor)
        this.fabric.multiply_rest_length(interval.index, factor, 100)
    }

    public iterate(): Stage | undefined {
        const stage = this.instance.iterate(this.stage)
        if (stage === undefined) {
            return undefined
        }
        switch (stage) {
            case Stage.Growing:
                new SphereBuilder(this).withDimensions(5, 3).build(7)
                this.stage = this.fabric.finish_growing()
                return this.stage
            case Stage.Shaping:
                console.log("adopt")
                this.fabric.adopt_lengths()
                this.stage = Stage.Slack
                break
            case Stage.Slack:
                console.log("slack")
                this.stage = Stage.Pretensing
                break
        }
        return stage
    }

}
