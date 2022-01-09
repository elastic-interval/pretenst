/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import { Quaternion, Vector3 } from "three"

import { IntervalRole, ROLES } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { IInterval, IJoint, percentFromFactor } from "../fabric/tensegrity-types"

import { IVertex, SphereScaffold } from "./sphere-scaffold"

const PULL_A = ROLES[IntervalRole.PullA]
const PUSH_C = ROLES[IntervalRole.PushC]
const TWIST_ANGLE = 0.52

interface IHub {
    vertex: IVertex
    spokes: ISpoke[]
}

interface ISpoke {
    hubs: IHub[]
    joints: IJoint[]
    push: IInterval[]
}

export class SphereBuilder implements ITensegrityBuilder {
    private readonly scaffold: SphereScaffold
    private readonly hubs: IHub[]
    private tensegrity: Tensegrity

    constructor(
        public readonly location: Vector3,
        public readonly frequency: number,
        public readonly radius: number,
        public readonly useCurves: boolean,
    ) {
        this.scaffold = new SphereScaffold(frequency, radius)
        this.hubs = this.scaffold.vertices.map(vertex => ({vertex, spokes: []} as IHub))
    }

    public operateOn(tensegrity: Tensegrity): void {
        this.tensegrity = tensegrity
    }

    public finished(): boolean {
        return this.tensegrity.joints.length > 0
    }

    public work(): void {
        const allSpokes: Record<string, ISpoke> = {}
        // create pushes and populate spokes
        this.hubs.forEach(({vertex, spokes}) =>
            vertex.adjacent.forEach(adjacent => {
                const existing = allSpokes[`${adjacent.index}-${vertex.index}`]
                const hubs = [this.hubs[vertex.index], this.hubs[adjacent.index]]
                if (existing) {
                    const {push} = existing
                    const joints = this.useCurves ? [push[1].omega, push[0].omega, push[1].alpha, push[0].alpha] : [push[0].omega, push[0].alpha]
                    spokes.push({push, hubs, joints})
                } else {
                    const push = this.useCurves ? this.createCurve(vertex, adjacent) : this.createPush(vertex, adjacent)
                    const joints = this.useCurves ? [push[0].alpha, push[1].alpha, push[0].omega, push[1].omega] : [push[0].alpha, push[0].omega]
                    const spoke: ISpoke = {push, hubs, joints}
                    allSpokes[`${vertex.index}-${adjacent.index}`] = spoke
                    spokes.push(spoke)
                }
            }))
        this.instance.refreshFloatView()
        const segmentLength = this.averageIntervalLength / 3
        const allPulls: Record<string, IInterval> = {}
        this.hubs.forEach(hub => hub.spokes.forEach(spoke => this.pullsForSpoke(hub, spoke, segmentLength, allPulls)))
        this.tensegrity.toDo = {
            age: 20000,
            todo: (t: Tensegrity) => {
                t.stage = Stage.Slack
                t.fabric.set_altitude(this.location.y)
                t.stage = Stage.Pretensing
            },
        }
    }

    private createPush(alpha: IVertex, omega: IVertex): IInterval[] {
        const midpoint = new Vector3().addVectors(alpha.location, omega.location).normalize()
        const quaternion = new Quaternion().setFromAxisAngle(midpoint, TWIST_ANGLE)
        const alphaLocation = new Vector3().copy(alpha.location).applyQuaternion(quaternion)
        const omegaLocation = new Vector3().copy(omega.location).applyQuaternion(quaternion)
        const length0 = alpha.location.distanceTo(omega.location)
        const scale = percentFromFactor(length0)
        const alphaJoint = this.tensegrity.createJoint(alphaLocation)
        const omegaJoint = this.tensegrity.createJoint(omegaLocation)
        this.instance.refreshFloatView()
        return [this.tensegrity.createInterval(alphaJoint, omegaJoint, PUSH_C, scale)]
    }

    private createCurve(alphaVertex: IVertex, omegaVertex: IVertex): IInterval[] {
        const midpoint = new Vector3().addVectors(alphaVertex.location, omegaVertex.location).normalize()
        const quaternion = new Quaternion().setFromAxisAngle(midpoint, TWIST_ANGLE)
        const alphaLocation = new Vector3().copy(alphaVertex.location).applyQuaternion(quaternion)
        const omegaLocation = new Vector3().copy(omegaVertex.location).applyQuaternion(quaternion)
        const alphaJoint = this.tensegrity.createJoint(alphaLocation)
        const midAlphaJoint = this.tensegrity.createJoint(new Vector3().lerpVectors(alphaLocation, omegaLocation, 1 / 3))
        const midOmegaJoint = this.tensegrity.createJoint(new Vector3().lerpVectors(alphaLocation, omegaLocation, 2 / 3))
        const omegaJoint = this.tensegrity.createJoint(omegaLocation)
        this.instance.refreshFloatView()
        const pushScale = percentFromFactor(alphaVertex.location.distanceTo(omegaVertex.location) * 2 / 3)
        const alpha = this.tensegrity.createInterval(alphaJoint, midOmegaJoint, PUSH_C, pushScale)
        const omega = this.tensegrity.createInterval(midAlphaJoint, omegaJoint, PUSH_C, pushScale)
        const pullScale = percentFromFactor(alphaVertex.location.distanceTo(omegaVertex.location) / 6)
        this.tensegrity.createInterval(alphaJoint, midAlphaJoint, PULL_A, pullScale)
        this.tensegrity.createInterval(midAlphaJoint, midOmegaJoint, PULL_A, pullScale)
        this.tensegrity.createInterval(midOmegaJoint, omegaJoint, PULL_A, pullScale)
        return [alpha, omega]
    }


    private pullsForSpoke(hub: IHub, spoke: ISpoke, segmentLength: number, allPulls: Record<string, IInterval>): void {
        const createPull = (alpha: IJoint, omega: IJoint, idealLength: number) => {
            const pullName = omega.index > alpha.index ? `${alpha.index}-${omega.index}` : `${omega.index}-${alpha.index}`
            if (allPulls[pullName]) {
                return
            }
            allPulls[pullName] = this.tensegrity.createInterval(alpha, omega, PULL_A, percentFromFactor(idealLength))
        }
        if (this.useCurves) {
            createPull(spoke.joints[0], nextSpoke(hub, spoke).joints[1], segmentLength / 5)
        } else {
            const next = nextSpoke(hub, spoke)
            createPull(spoke.joints[0], next.joints[0], segmentLength)
            const nearOppositeNext = nextSpoke(spoke.hubs[1], spoke).joints[0]
            const spokeLength = this.instance.intervalLength(spoke.push[0])
            createPull(next.joints[0], nearOppositeNext, spokeLength - segmentLength * 2)
        }
    }

    private get averageIntervalLength(): number {
        const length = (interval: IInterval) => this.instance.intervalLength(interval)
        return this.intervals.reduce((sum, push) => sum + length(push), 0) / this.intervals.length
    }

    private get instance(): FabricInstance {
        return this.tensegrity.instance
    }

    private get intervals(): IInterval[] {
        return this.tensegrity.intervals
    }
}

function nextSpoke(hub: IHub, spoke: ISpoke): ISpoke {
    const index = hub.spokes.findIndex(({push}) => push[0].index === spoke.push[0].index)
    if (index < 0) {
        throw new Error("Cannot find current spoke when looking for next")
    }
    return hub.spokes[(index + 1) % hub.spokes.length]
}
