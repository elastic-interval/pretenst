/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, IntervalRole, Stage } from "eig"
import { Vector3 } from "three"

import { isPushInterval, stageName } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { factorToPercent, IInterval, IJoint, percentToFactor } from "../fabric/tensegrity-types"

import { SphereBuilder } from "./sphere-builder"

export interface IVertex {
    joint: IJoint
    interval: ISphereInterval[]
    adjacent: IVertex[]
}

interface ISphereInterval {
    index: number
    isPush: boolean
    intervalRole: IntervalRole
    alpha: IJoint
    omega: IJoint
    location: () => Vector3
}

export class TensegritySphere {

    public joints: IJoint[] = []
    public intervals: ISphereInterval[] = []
    public vertices: IVertex[] = []

    private stage = Stage.Growing

    constructor(
        public readonly frequency: number,
        public readonly radius: number,
        public readonly location: Vector3,
        public readonly instance: FabricInstance,
    ) {
        this.instance.clear()
    }

    public get fabric(): Fabric {
        return this.instance.fabric
    }

    public vertexAt(location: Vector3): IVertex {
        location.normalize().multiplyScalar(this.radius)
        const index = this.fabric.create_joint(location.x, location.y, location.z)
        const joint: IJoint = {
            index,
            oppositeIndex: -1,
            location: () => this.instance.jointLocation(index),
        }
        this.joints.push(joint) // TODO: have the thing create a real joint?
        const vertex: IVertex = {joint, adjacent: [], interval: []}
        this.vertices.push(vertex)
        this.instance.refreshFloatView()
        return vertex
    }

    public intervalBetween(vertexA: IVertex, vertexB: IVertex): ISphereInterval {
        const stiffness = 0.000001
        const linearDensity = Math.sqrt(stiffness)
        const interval = this.createInterval(vertexA.joint, vertexB.joint, IntervalRole.SpherePush, stiffness, linearDensity)
        vertexA.adjacent.push(vertexB)
        vertexA.interval.push(interval)
        vertexB.adjacent.push(vertexA)
        vertexB.interval.push(interval)
        return interval
    }

    public changeIntervalScale(interval: IInterval, factor: number): void {
        interval.scale = factorToPercent(percentToFactor(interval.scale) * factor)
        this.fabric.multiply_rest_length(interval.index, factor, 100)
    }

    public iterate(): void {
        const stage = this.instance.iterate(this.stage)
        if (stage === undefined) {
            return
        }
        console.log(stageName(stage))
        switch (stage) {
            case Stage.Growing:
                new SphereBuilder(this).build(this.location.y)
                this.stage = this.fabric.finish_growing()
                break
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
    }

    private createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, stiffness: number, linearDensity: number): ISphereInterval {
        const idealLength = alpha.location().distanceTo(omega.location())
        const index = this.fabric.create_interval(
            alpha.index, omega.index, intervalRole,
            idealLength, idealLength, stiffness, linearDensity, 0)
        const interval: ISphereInterval = {
            index,
            intervalRole,
            alpha,
            omega,
            isPush: isPushInterval(intervalRole),
            location: () => new Vector3().addVectors(alpha.location(), omega.location()).multiplyScalar(0.5),
        }
        this.intervals.push(interval)
        return interval
    }
}
