/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import { Quaternion, Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"
import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { IInterval, IJoint, IRole, percentFromFactor } from "../fabric/tensegrity-types"

import { IVertex, SphereScaffold } from "./sphere-scaffold"

const PUSH: IRole = {
    tag: "push",
    push: true,
    length: 1,
    stiffness: 1,
}

const PULL: IRole = {
    tag: "pull",
    push: false,
    length: 1,
    stiffness: 1,
}

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
                    const joints = [push[0].omega, push[0].alpha]
                    spokes.push({push, hubs, joints})
                } else {
                    const push = this.createPush(vertex, adjacent)
                    const joints = [push[0].alpha, push[0].omega]
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
        return [this.tensegrity.createInterval(alphaJoint, omegaJoint, PUSH, scale)]
    }

    private pullsForSpoke(hub: IHub, spoke: ISpoke, segmentLength: number, allPulls: Record<string, IInterval>): void {
        const createPull = (alpha: IJoint, omega: IJoint, idealLength: number) => {
            const pullName = omega.index > alpha.index ? `${alpha.index}-${omega.index}` : `${omega.index}-${alpha.index}`
            if (allPulls[pullName]) {
                return
            }
            allPulls[pullName] = this.tensegrity.createInterval(alpha, omega, PULL, percentFromFactor(idealLength))
        }
        const next = nextSpoke(hub, spoke)
        createPull(spoke.joints[0], next.joints[0], segmentLength)
        const nearOppositeNext = nextSpoke(spoke.hubs[1], spoke).joints[0]
        const spokeLength = this.instance.intervalLength(spoke.push[0])
        createPull(next.joints[0], nearOppositeNext, spokeLength - segmentLength * 2)
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
