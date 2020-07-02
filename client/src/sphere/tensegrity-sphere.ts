/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, IntervalRole, Stage, WorldFeature } from "eig"
import { Quaternion, Vector3 } from "three"

import { intervalRoleName, sub } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { IJoint } from "../fabric/tensegrity-types"
import { JOINT_RADIUS, PULL_RADIUS, PUSH_RADIUS } from "../pretenst"
import { IFabricOutput, IOutputInterval, IOutputJoint } from "../storage/download"

import { SphereBuilder } from "./sphere-builder"

export interface IHub {
    index: number
    location: Vector3
    spokes: ISpoke[]
}

export interface ISpoke {
    push: IPush
    reverse: boolean
}

export function spokeLength({push}: ISpoke): number {
    return push.omegaHub.location.distanceTo(push.alphaHub.location)
}

export function nearJoint({push, reverse}: ISpoke): IJoint {
    return reverse ? push.omega : push.alpha
}

export function farJoint({push, reverse}: ISpoke): IJoint {
    return reverse ? push.alpha : push.omega
}

export function nearHub({push, reverse}: ISpoke): IHub {
    return reverse ? push.omegaHub : push.alphaHub
}

export function farHub({push, reverse}: ISpoke): IHub {
    return reverse ? push.alphaHub : push.omegaHub
}

export interface IPush {
    index: number
    alphaHub: IHub
    omegaHub: IHub
    alpha: IJoint
    omega: IJoint
}

interface IPull {
    index: number
    alpha: IJoint
    omega: IJoint
}

export class TensegritySphere {

    public joints: IJoint[] = []
    public pushes: IPush[] = []
    public pulls: IPull[] = []
    public hubs: IHub[] = []

    private stage = Stage.Growing

    constructor(
        public readonly location: Vector3,
        public readonly radius: number,
        public readonly frequency: number,
        public readonly twist: number,
        public readonly numericFeature: (worldFeature: WorldFeature) => number,
        public readonly instance: FabricInstance,
    ) {
        this.instance.clear()
    }

    public get fabric(): Fabric {
        return this.instance.fabric
    }

    public hubAt(location: Vector3): IHub {
        location.normalize().multiplyScalar(this.radius)
        const index = this.hubs.length
        const vertex: IHub = {index, location, spokes: []}
        this.hubs.push(vertex)
        return vertex
    }

    public pushBetween(alphaHub: IHub, omegaHub: IHub): IPush {
        const midpoint = new Vector3().addVectors(alphaHub.location, omegaHub.location).normalize()
        const quaternion = new Quaternion().setFromAxisAngle(midpoint, this.twist)
        const alphaLocation = new Vector3().copy(alphaHub.location).applyQuaternion(quaternion)
        const omegaLocation = new Vector3().copy(omegaHub.location).applyQuaternion(quaternion)
        const stiffness = 0.00001
        const linearDensity = Math.sqrt(stiffness)
        const idealLength = alphaHub.location.distanceTo(omegaHub.location)
        const alpha = this.createJoint(alphaLocation)
        const omega = this.createJoint(omegaLocation)
        const index = this.fabric.create_interval(
            alpha.index, omega.index, IntervalRole.SpherePush,
            idealLength, idealLength, stiffness, linearDensity, 0)
        const push: IPush = {index, alpha, omega, alphaHub, omegaHub}
        this.pushes.push(push)
        alphaHub.spokes.push({reverse: false, push})
        omegaHub.spokes.push({reverse: true, push})
        return push
    }

    public pullsForSpoke(hub: IHub, spoke: ISpoke, segmentLength: number): IPull[] {
        const pulls: IPull[] = []
        const pull = (alpha: IJoint, omega: IJoint, restLength: number) => {
            if (this.pullExists(alpha, omega)) {
                return
            }
            const stiffness = 0.000001
            const linearDensity = Math.sqrt(stiffness)
            const idealLength = alpha.location().distanceTo(omega.location())
            const index = this.fabric.create_interval(
                alpha.index, omega.index, IntervalRole.SpherePull,
                idealLength, restLength, stiffness, linearDensity, 1200)
            const interval: IPull = {index, alpha, omega}
            pulls.push(interval)
            this.pulls.push(interval)
        }
        const nextSpoke = this.nextSpoke(hub, spoke, false)
        const nextNear = nearJoint(nextSpoke)
        const oppositeNext = this.nextSpoke(farHub(spoke), spoke, false)
        pull(nearJoint(spoke), nextNear, segmentLength)
        pull(nextNear, nearJoint(oppositeNext), spokeLength(spoke) - segmentLength * 2)
        return pulls
    }

    public iterate(): void {
        const stage = this.instance.iterate(this.stage)
        if (stage === undefined) {
            return
        }
        switch (stage) {
            case Stage.Growing:
                new SphereBuilder(this).build()
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

    public get fabricOutput(): IFabricOutput {
        this.instance.refreshFloatView()
        const idealLengths = this.instance.floatView.idealLengths
        const strains = this.instance.floatView.strains
        const stiffnesses = this.instance.floatView.stiffnesses
        const linearDensities = this.instance.floatView.linearDensities
        return {
            name: "sphere",
            joints: this.joints.map(joint => {
                const vector = joint.location()
                const anchor = this.instance.fabric.is_anchor_joint(joint.index)
                return <IOutputJoint>{
                    index: joint.index,
                    x: vector.x, y: vector.z, z: vector.y,
                    anchor,
                }
            }),
            intervals: [
                ...this.pushes.map(interval => {
                    const radius = PUSH_RADIUS / this.frequency
                    const jointRadius = radius * JOINT_RADIUS / PUSH_RADIUS
                    const currentLength = interval.alpha.location().distanceTo(interval.omega.location())
                    const length = currentLength - jointRadius * 2
                    const alphaIndex = interval.alpha.index
                    const omegaIndex = interval.omega.index
                    if (alphaIndex >= this.joints.length || omegaIndex >= this.joints.length) {
                        throw new Error(`Joint not found ${alphaIndex},${omegaIndex}:${this.joints.length}`)
                    }
                    return <IOutputInterval>{
                        index: interval.index,
                        joints: [alphaIndex, omegaIndex],
                        type: "Push",
                        strain: strains[interval.index],
                        stiffness: stiffnesses[interval.index],
                        linearDensity: linearDensities[interval.index],
                        role: intervalRoleName(IntervalRole.SpherePush),
                        idealLength: idealLengths[interval.index],
                        isPush: true,
                        length, radius, jointRadius,
                    }
                }),
                ...this.pulls.map(interval => {
                    const radius = PULL_RADIUS / this.frequency
                    const jointRadius = JOINT_RADIUS
                    const currentLength = interval.alpha.location().distanceTo(interval.omega.location())
                    const length = currentLength + jointRadius * 2
                    const alphaIndex = interval.alpha.index
                    const omegaIndex = interval.omega.index
                    if (alphaIndex >= this.joints.length || omegaIndex >= this.joints.length) {
                        throw new Error(`Joint not found ${alphaIndex},${omegaIndex}:${this.joints.length}`)
                    }
                    return <IOutputInterval>{
                        index: interval.index,
                        joints: [alphaIndex, omegaIndex],
                        type: "Pull",
                        strain: strains[interval.index],
                        stiffness: stiffnesses[interval.index],
                        linearDensity: linearDensities[interval.index],
                        role: intervalRoleName(IntervalRole.SpherePush),
                        idealLength: idealLengths[interval.index],
                        isPush: false,
                        length, radius, jointRadius,
                    }
                }),
            ],
        }
    }

    private createJoint(location: Vector3): IJoint {
        const index = this.fabric.create_joint(location.x, location.y, location.z)
        const joint: IJoint = {index, location: () => this.instance.jointLocation(index)}
        this.joints.push(joint) // TODO: have the thing create a real joint?
        this.instance.refreshFloatView()
        return joint
    }

    private nextSpoke(hub: IHub, {push}: ISpoke, reverse: boolean): ISpoke {
        const currentSpoke = hub.spokes.find(spoke => spoke.push.index === push.index)
        if (!currentSpoke) {
            throw new Error("Cannot find current spoke when looking for next")
        }
        const currentFarHub = farHub(currentSpoke)
        const currentLocation = currentFarHub.location
        const toCurrent = sub(currentLocation, hub.location)
        const cross = new Vector3().crossVectors(hub.location, toCurrent).normalize()
        if (this.twist < 0 !== reverse) {
            cross.multiplyScalar(-1)
        }
        const otherSpokes = hub.spokes.filter((spoke: ISpoke) => spoke.push.index !== currentSpoke.push.index)
        if (hub.spokes.length !== otherSpokes.length + 1) {
            throw new Error("Did not delete")
        }
        const sameSideSpokes = otherSpokes.filter((spoke: ISpoke) => sub(farHub(spoke).location, hub.location).dot(cross) > 0)
        const farToClose = sameSideSpokes.sort((a: ISpoke, b: ISpoke) => {
            const distanceA = farHub(a).location.distanceToSquared(currentLocation)
            const distanceB = farHub(b).location.distanceToSquared(currentLocation)
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
