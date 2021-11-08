/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import { Quaternion, Vector3 } from "three"

import { IntervalRole } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { ITensegrityBuilder, Tensegrity } from "../fabric/tensegrity"
import { IInterval, IJoint, percentFromFactor } from "../fabric/tensegrity-types"

import { IVertex, SphereScaffold } from "./sphere-scaffold"

const TWIST_ANGLE = 0.52

interface IHub {
    vertex: IVertex
    spokes: ISpoke[]
}

interface ISpoke {
    centerHub: IHub
    centerJoint: IJoint
    outerHub: IHub
    outerJoint: IJoint
    push: IInterval
}

export class SphereBuilder implements ITensegrityBuilder {
    private tensegrity: Tensegrity
    private scaffold: SphereScaffold
    private hubs: IHub[]

    constructor(
        public readonly location: Vector3,
        public readonly frequency: number,
        public readonly radius: number,
        public readonly segmentSize: number,
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
        this.hubs.forEach(({vertex, spokes}) => {
            const centerHub = this.hubs[vertex.index]
            vertex.adjacent.forEach(adjacent => {
                const outerHub = this.hubs[adjacent.index]
                const existing = allSpokes[`${adjacent.index}-${vertex.index}`]
                if (existing) {
                    const {push} = existing
                    const centerJoint = push.omega
                    const outerJoint = push.alpha
                    spokes.push({push, centerHub, centerJoint, outerHub, outerJoint})
                } else {
                    const push = this.createPush(vertex, adjacent)
                    const centerJoint = push.alpha
                    const outerJoint = push.omega
                    const spoke: ISpoke = {push, centerHub, centerJoint, outerHub, outerJoint}
                    allSpokes[`${vertex.index}-${adjacent.index}`] = spoke
                    spokes.push(spoke)
                }
            })
        })
        this.instance.refreshFloatView()
        const segmentLength = this.segmentSize * this.averageIntervalLength
        const allPulls: Record<string, IInterval> = {}
        this.hubs.forEach(hub => hub.spokes.forEach(spoke => this.pullsForSpoke(hub, spoke, segmentLength, allPulls)))
        this.tensegrity.fabric.set_altitude(this.location.y)
        this.tensegrity.toDo = {
            age: 40000,
            todo: (t: Tensegrity) => {
                t.stage = Stage.Slack
                t.stage = Stage.Pretensing
            },
        }
    }

    private createPush(alpha: IVertex, omega: IVertex): IInterval {
        const midpoint = new Vector3().addVectors(alpha.location, omega.location).normalize()
        const quaternion = new Quaternion().setFromAxisAngle(midpoint, TWIST_ANGLE)
        const alphaLocation = new Vector3().copy(alpha.location).applyQuaternion(quaternion)
        const omegaLocation = new Vector3().copy(omega.location).applyQuaternion(quaternion)
        const length0 = alpha.location.distanceTo(omega.location)
        const scale = percentFromFactor(length0)
        const alphaJoint = this.tensegrity.createJoint(alphaLocation)
        const omegaJoint = this.tensegrity.createJoint(omegaLocation)
        this.instance.refreshFloatView()
        return this.tensegrity.createInterval(alphaJoint, omegaJoint, IntervalRole.PushC, scale)
    }

    private pullsForSpoke(hub: IHub, spoke: ISpoke, segmentLength: number, allPulls: Record<string, IInterval>): void {
        const createPull = (alpha: IJoint, omega: IJoint, idealLength: number) => {
            const pullName = omega.index > alpha.index ? `${alpha.index}-${omega.index}` : `${omega.index}-${alpha.index}`
            const existing = allPulls[pullName]
            if (existing) {
                return
            }
            allPulls[pullName] = this.tensegrity.createInterval(alpha, omega, IntervalRole.PullA, percentFromFactor(idealLength))
        }
        const next = nextSpoke(hub, spoke)
        createPull(spoke.centerJoint, next.centerJoint, segmentLength)
        const oppositeNext = nextSpoke(spoke.outerHub, spoke)
        const nearOppositeNext = oppositeNext.centerJoint
        const spokeLength = this.instance.intervalLength(spoke.push)
        createPull(next.centerJoint, nearOppositeNext, spokeLength - segmentLength * 2)
    }

    private get averageIntervalLength(): number {
        return this.intervals
            .reduce((sum, push) => sum + this.instance.jointDistance(push.alpha, push.omega), 0) / this.intervals.length
    }

    private get instance(): FabricInstance {
        return this.tensegrity.instance
    }

    private get intervals(): IInterval[] {
        return this.tensegrity.intervals
    }
}

function nextSpoke(hub: IHub, spoke: ISpoke): ISpoke {
    const index = hub.spokes.findIndex(({push}) => push.index === spoke.push.index)
    if (index < 0) {
        throw new Error("Cannot find current spoke when looking for next")
    }
    return hub.spokes[(index + 1) % hub.spokes.length]
}
