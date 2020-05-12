/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, IntervalRole, Stage } from "eig"
import { Quaternion, Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"
import { IJoint } from "../fabric/tensegrity-types"

import { SphereBuilder } from "./sphere-builder"

export interface IVertex {
    index: number
    location: Vector3
    adjacent: IAdjacent[]
}

export interface IAdjacent {
    push: ISpherePush
    reverse: boolean
    vertex: IVertex
}

function adjacentClose({push, reverse}: IAdjacent): IJoint {
    return reverse ? push.omega : push.alpha
}

function adjacentFar({push, reverse}: IAdjacent): IJoint {
    return reverse ? push.alpha : push.omega
}

export interface ISpherePush {
    index: number
    alphaVertex: IVertex
    omegaVertex: IVertex
    alpha: IJoint
    omega: IJoint
}

export interface ISpherePull {
    index: number
    alpha: IJoint
    omega: IJoint
}

export class TensegritySphere {

    public joints: IJoint[] = []
    public pushes: ISpherePush[] = []
    public pulls: ISpherePull[] = []
    public vertices: IVertex[] = []

    private stage = Stage.Growing

    constructor(
        public readonly location: Vector3,
        public readonly radius: number,
        public readonly frequency: number,
        public readonly twist: number,
        public readonly instance: FabricInstance,
    ) {
        this.instance.clear()
    }

    public get fabric(): Fabric {
        return this.instance.fabric
    }

    public vertexAt(location: Vector3): IVertex {
        location.normalize().multiplyScalar(this.radius)
        const index = this.vertices.length
        const vertex: IVertex = {index, location, adjacent: []}
        this.vertices.push(vertex)
        return vertex
    }

    public pushBetween(alphaVertex: IVertex, omegaVertex: IVertex): ISpherePush {
        const midpoint = new Vector3().addVectors(alphaVertex.location, omegaVertex.location).normalize()
        const quaternion = new Quaternion().setFromAxisAngle(midpoint, this.twist)
        const alphaLocation = new Vector3().copy(alphaVertex.location).applyQuaternion(quaternion)
        const omegaLocation = new Vector3().copy(omegaVertex.location).applyQuaternion(quaternion)
        const stiffness = 0.00001
        const linearDensity = Math.sqrt(stiffness)
        const idealLength = alphaVertex.location.distanceTo(omegaVertex.location)
        const alpha = this.createJoint(alphaLocation)
        const omega = this.createJoint(omegaLocation)
        const index = this.fabric.create_interval(
            alpha.index, omega.index, IntervalRole.SpherePush,
            idealLength, idealLength, stiffness, linearDensity, 0)
        const push: ISpherePush = {index, alpha, omega, alphaVertex, omegaVertex}
        this.pushes.push(push)
        alphaVertex.adjacent.push({vertex: omegaVertex, reverse: false, push})
        omegaVertex.adjacent.push({vertex: alphaVertex, reverse: true, push})
        return push
    }

    public pullsForAdjacent(center: IVertex, adjacent: IAdjacent): ISpherePull[] {
        const pushLength = adjacent.push.alphaVertex.location.distanceTo(adjacent.push.omegaVertex.location)
        const proportion = 0.3
        const shortPull = pushLength * proportion
        const longPull = pushLength * (1 - proportion)
        const pulls: ISpherePull[] = []
        const pull = (alpha: IJoint, omega: IJoint, short: boolean) => {
            if (this.pullExists(alpha, omega)) {
                return
            }
            const stiffness = 0.000001
            const linearDensity = Math.sqrt(stiffness)
            const restLength = short ? shortPull : longPull
            const idealLength = alpha.location().distanceTo(omega.location())
            const index = this.fabric.create_interval(
                alpha.index, omega.index, IntervalRole.SpherePull,
                idealLength, restLength, stiffness, linearDensity, 100)
            const interval: ISpherePull = {index, alpha, omega}
            pulls.push(interval)
            this.pulls.push(interval)
        }
        const nextAdjacent = this.nextAdjacent(center, adjacent)
        const nextClose = adjacentClose(nextAdjacent)
        const currentClose = adjacentClose(adjacent)
        const currentFar = adjacentFar(adjacent)
        pull(currentClose, nextClose, true)
        pull(currentFar, nextClose, false)
        return pulls
    }

    public iterate(): void {
        const stage = this.instance.iterate(this.stage)
        if (stage === undefined) {
            return
        }
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

    private createJoint(location: Vector3): IJoint {
        const index = this.fabric.create_joint(location.x, location.y, location.z)
        const joint: IJoint = {
            index,
            oppositeIndex: -1,
            location: () => this.instance.jointLocation(index),
        }
        this.joints.push(joint) // TODO: have the thing create a real joint?
        this.instance.refreshFloatView()
        return joint
    }

    private nextAdjacent(center: IVertex, current: IAdjacent): IAdjacent {
        const centerLocation = center.location
        const currentLocation = current.vertex.location
        const toCurrent = new Vector3().subVectors(currentLocation, centerLocation)
        const cross = new Vector3().crossVectors(centerLocation, toCurrent).normalize()
        if (this.twist < 0) {
            cross.multiplyScalar(-1)
        }
        const farToClose = center.adjacent
            .filter(({vertex}) => {
                if (vertex.index === current.vertex.index) {
                    return false
                }
                const toVertex = new Vector3().subVectors(vertex.location, centerLocation).normalize()
                return toVertex.dot(cross) > 0
            })
            .sort((a, b) => {
                const distanceA = a.vertex.location.distanceToSquared(currentLocation)
                const distanceB = b.vertex.location.distanceToSquared(currentLocation)
                return distanceB - distanceA
            })
        const closest = farToClose.pop()
        if (!closest) {
            throw new Error("Couldn't find closest!")
        }
        return closest
    }

    private pullExists(alpha: IJoint, omega: IJoint): boolean {
        return !!this.pulls.find(p =>
            p.alpha.index === alpha.index && p.omega.index === omega.index ||
            p.alpha.index === omega.index && p.omega.index === alpha.index)
    }
}
