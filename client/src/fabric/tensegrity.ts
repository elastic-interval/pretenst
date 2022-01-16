/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage } from "eig"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { CONNECTOR_LENGTH, ROOT3 } from "./eig-util"
import { FabricInstance } from "./fabric-instance"
import { bowtiePairs, snelsonPairs } from "./tensegrity-logic"
import {
    averageScaleFactor,
    FaceName,
    factorFromPercent,
    IInterval,
    IIntervalDetails,
    IJoint,
    intervalKey,
    intervalToPair,
    IPair,
    IPercent,
    IRadialPull,
    IRole,
    ITwist,
    ITwistFace,
    percentFromFactor,
    percentOrHundred,
    rotateForBestRing,
    Spin,
} from "./tensegrity-types"
import { createTwist, faceFromTwist, removeFace } from "./twist-logic"

export enum FaceAction {
    Subtree,
    Join,
    ShapingDistance,
    PretenstDistance,
    None,
}

export enum PostGrowthOp {
    NoOp,
    Faces,
    Snelson,
    Bowtie,
    BowtieFaces,
}

export enum PairSelection {
    Bowtie,
    Snelson,
}

const PULL_A: IRole = {
    tag: "(a)",
    push: false,
    length: 1,
    stiffness: 1,
}

const PULL_CONNECTOR: IRole = {
    tag: "connector",
    push: false,
    length: 1,
    stiffness: 1,
}

export type ToDo = (tensegrity: Tensegrity) => void

export const AGE_POST_GROWTH = -1

const PULL_B = {
    tag: "(b)",
    push: false,
    length: ROOT3,
    stiffness: 1,
}

const PULL_PRETENST_DISTANCER = {
    tag: "pretenst-distancer",
    push: false,
    length: 1,
    stiffness: 1,
}

const PULL_SHAPING_DISTANCER = {
    tag: "shaping-distancer",
    push: false,
    length: 1,
    stiffness: 1,
}

const PULL_RADIAL = {
    tag: "radial",
    push: false,
    length: 1,
    stiffness: 1,
}

export interface IJob {
    todo: ToDo,
    age?: number
}

export interface ITensegrityBuilder {
    operateOn: (tensegrity: Tensegrity) => void
    finished: () => boolean
    work: () => void
}

export class Tensegrity {
    public name: string
    public stage$: BehaviorSubject<Stage>
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public loops: IInterval[][] = []
    public twists: ITwist[] = []

    public connectors: IRadialPull[] = []
    public distancers: IRadialPull[] = []
    public pretenstAge = -1
    public scale = 1

    private jobs: IJob[] = []

    constructor(
        public readonly instance: FabricInstance,
        public readonly countdown: number,
        private builder: ITensegrityBuilder,
    ) {
        this.instance.clear()
        this.stage$ = new BehaviorSubject(this.fabric.get_stage())
        this.builder.operateOn(this)
    }

    public get fabric(): Fabric {
        return this.instance.fabric
    }

    public createJoint(location: Vector3): IJoint {
        const index = this.fabric.create_joint(location.x, location.y, location.z)
        const newJoint: IJoint = {index}
        this.joints.push(newJoint)
        return newJoint
    }

    public removeJoint(joint: IJoint): void {
        if (joint.index < 0) {
            return
        }
        const index = joint.index
        this.fabric.remove_joint(index)
        this.joints = this.joints.filter(j => j.index !== index)
        joint.index = -index - 1 // mark it
        this.joints.forEach(j => j.index = j.index > index ? j.index - 1 : j.index)
        this.instance.refreshFloatView()
    }

    public createRadialPull(alpha: ITwistFace, omega: ITwistFace, role: IRole, pullScale?: IPercent): IRadialPull {
        const instance = this.instance
        const alphaJoint = this.createJoint(instance.faceLocation(alpha))
        const omegaJoint = this.createJoint(instance.faceLocation(omega))
        instance.refreshFloatView()
        const axis = this.creatAxis(alphaJoint, omegaJoint, role, pullScale)
        const alphaRestLength = alpha.ends.reduce((sum, end) => sum + instance.jointDistance(alphaJoint, end), 0) / alpha.ends.length
        const omegaRestLength = omega.ends.reduce((sum, end) => sum + instance.jointDistance(omegaJoint, end), 0) / omega.ends.length
        const alphaRays = alpha.ends.map(end => this.createRay(alphaJoint, end, alphaRestLength))
        const omegaRays = omega.ends.map(end => this.createRay(omegaJoint, end, omegaRestLength))
        const radialPull: IRadialPull = {alpha, omega, axis, alphaRays, omegaRays}
        switch (axis.role.tag) {
            case "connector":
                this.connectors.push(radialPull)
                break
            case "shaping-distancer":
                this.distancers.push(radialPull)
                break
            case "pretenst-distancer":
                break
        }
        return radialPull
    }

    public createInterval(alpha: IJoint, omega: IJoint, role: IRole, scale: IPercent, patience?: number): IInterval {
        const targetLength = role.length * factorFromPercent(scale)
        const currentLength = targetLength === 0 ? 0 : this.instance.jointDistance(alpha, omega)
        const patienceFactor = patience === undefined ? 1 : patience
        const countdown = this.countdown * Math.abs(targetLength - currentLength) * patienceFactor
        const attack = countdown <= 0 ? 0 : 1 / countdown
        const index = this.fabric.create_interval(alpha.index, omega.index, role.push, currentLength, targetLength, role.stiffness, attack)
        const interval: IInterval = {index, role, scale, alpha, omega, removed: false}
        this.intervals.push(interval)
        return interval
    }

    public changeIntervalScale(interval: IInterval, factor: number): void {
        interval.scale = percentFromFactor(factorFromPercent(interval.scale) * factor)
        this.fabric.multiply_rest_length(interval.index, factor, 100)
    }

    public removeInterval(interval: IInterval): void {
        const index = interval.index
        this.intervals = this.intervals.filter(existing => existing.index !== index)
        this.fabric.remove_interval(index)
        this.intervals.forEach(existing => {
            if (existing.index > index) {
                existing.index--
            }
        })
        interval.removed = true
    }


    public faceToTriangle(face: ITwistFace): void {
        face.pulls.forEach(pull => this.removeInterval(pull))
        face.pulls = []
        if (face.joint) {
            this.removeJoint(face.joint)
        }
        for (let index = 0; index < face.ends.length; index++) {
            const endA = face.ends[index]
            const endB = face.ends[(index + 1) % face.ends.length]
            face.pulls.push(this.createInterval(endA, endB, PULL_B, face.scale))
        }
    }

    public triangleFaces(): void {
        this.faces.forEach(face => this.faceToTriangle(face))
    }

    public withPulls(work: (pairMap: Record<string, IPair>) => void): void {
        const addPull = (end: IJoint, pull: IInterval) => {
            if (end.pulls) {
                end.pulls.push(pull)
            } else {
                end.pulls = [pull]
            }
        }
        this.intervals
            .filter(({role}) => !role.push)
            .forEach(pull => {
                addPull(pull.alpha, pull)
                addPull(pull.omega, pull)
            })
        const pairMap: Record<string, IPair> = {}
        this.intervals.forEach(interval => pairMap[intervalKey(interval)] = intervalToPair(interval))
        work(pairMap)
        this.joints.forEach(joint => joint.pulls = undefined)
    }

    public createPulls(pairSelection: PairSelection): void {
        const selectPairs = () => {
            switch (pairSelection) {
                case PairSelection.Bowtie:
                    return bowtiePairs(this, PULL_A, PULL_B)
                case PairSelection.Snelson:
                    return snelsonPairs(this, PULL_A, PULL_B)
                default:
                    throw new Error()
            }
        }
        // selectPairs().forEach(pair=> console.log(pairKey(pair)))
        selectPairs().forEach(({alpha, omega, role, scale}) => {
            this.createInterval(alpha, omega, role, scale, 5)
        })
    }

    public removeSlackPulls(): void {
        const slack = this.intervals
            .filter(({role}) => role.tag === "(aa)")
            .filter(pullC => this.instance.floatView.strains[pullC.index] === 0)
        slack.forEach(interval => this.removeInterval(interval))
    }

    public createTwist(spin: Spin, scale: IPercent, baseKnown?: Vector3[]): ITwist {
        const twist = createTwist(this, spin, scale, baseKnown)
        this.twists.push(twist)
        return twist
    }

    public createTwistOn(baseFace: ITwistFace, spin: Spin, scale: IPercent): ITwist {
        const jointLocation = (joint: IJoint) => this.instance.jointLocation(joint)
        const twist = this.createTwist(spin, scale, baseFace.ends.map(jointLocation).reverse())
        this.createLoop(baseFace, faceFromTwist(FaceName.a, twist))
        return twist
    }

    public findTwist(push: IInterval): ITwist {
        const found = this.twists.find(({pushes}) => pushes.find(({index}) => index === push.index))
        if (!found) {
            throw new Error("Cannot find twist")
        }
        return found
    }

    public get faces(): ITwistFace[] {
        return this.twists.reduce((f, {faces}) => f.concat(faces), [] as ITwistFace[]).filter(({removed}) => !removed)
    }

    public get stage(): Stage {
        return this.stage$.getValue()
    }

    public set stage(stage: Stage) {
        this.instance.stage = stage
        if (stage === Stage.Slack) {
            this.distancers.forEach(radialPull => {
                const {axis, alphaRays, omegaRays} = radialPull
                const intervals = [axis, ...alphaRays, ...omegaRays]
                intervals.forEach(ray => this.removeInterval(ray))
            })
            this.distancers = []
            this.instance.snapshot()
        }
        this.stage$.next(stage)
    }

    public set toDo(job: IJob) {
        this.jobs.push(job)
    }

    public iterate(): boolean {
        const busy = this.instance.iterate()
        if (busy) {
            return busy
        }
        const jobsBefore = this.jobs.length
        if (jobsBefore) {
            const ageNow = this.instance.fabric.age
            this.jobs = this.jobs.filter(({todo, age}) => {
                if (age !== undefined && (age < 0 || age > ageNow)) {
                    return true // keep
                }
                todo(this)
                return false
            })
            if (this.jobs.length < jobsBefore) {
                return true
            }
        }
        switch (this.stage) {
            case Stage.Growing:
                if (!this.builder.finished()) {
                    this.builder.work()
                    return false
                } else if (this.connectors.length > 0) {
                    this.connectors = this.checkConnectors()
                    return false
                }
                this.stage = Stage.Shaping
                this.jobs = this.jobs.filter(({todo, age}) => {
                    if (age === AGE_POST_GROWTH) {
                        todo(this)
                        return false
                    }
                    return true
                })
                break
            case Stage.Shaping:
                break
            case Stage.Slack:
                break
            case Stage.Pretensing:
                this.stage = Stage.Pretenst
                break
            case Stage.Pretenst:
                if (this.pretenstAge < 0) {
                    this.pretenstAge = this.fabric.age
                }
        }
        return false
    }

    public strainToStiffness(): void {
        const instance = this.instance
        const floatView = instance.floatView
        const pulls = this.intervals.filter(interval => {
            if (interval.role.push) {
                return false
            }
            return instance.jointLocation(interval.alpha).y >= 0 || instance.jointLocation(interval.omega).y >= 0
        })
        const strains = floatView.strains
        const averagePullStrain = pulls.reduce((sum, interval) => sum + strains[interval.index], 0) / pulls.length
        const stiffnesses = new Float32Array(floatView.stiffnesses)
        pulls.forEach(pull => {
            const pullStrain = strains[pull.index]
            const normalizedStrain = pullStrain - averagePullStrain
            const strainFactor = normalizedStrain / averagePullStrain
            stiffnesses[pull.index] *= 1 + strainFactor
        })
        instance.restoreSnapshot()
        this.fabric.copy_stiffnesses(stiffnesses)
    }

    public createRadialPulls(faces: ITwistFace[], action: FaceAction, actionScale?: IPercent): void {
        const locationFromFace = (face: ITwistFace) => this.instance.faceLocation(face)
        const centerBrickFaceIntervals = () => {
            const omniTwist = this.createTwist(Spin.LeftRight, percentFromFactor(averageScaleFactor(faces)), [this.instance.averageFaceLocation(faces)])
            this.instance.refreshFloatView()
            return faces.map(face => {
                const opposing = omniTwist.faces.filter(({spin, pulls}) => pulls.length > 0 && spin !== face.spin)
                const faceLocation = locationFromFace(face)
                const closestFace = opposing.reduce((a, b) => {
                    const aa = locationFromFace(a).distanceTo(faceLocation)
                    const bb = locationFromFace(b).distanceTo(faceLocation)
                    return aa < bb ? a : b
                })
                return this.createRadialPull(closestFace, face, PULL_CONNECTOR)
            })
        }
        const pullScale = actionScale ? actionScale : percentFromFactor(0.75)
        switch (action) {
            case FaceAction.ShapingDistance:
            case FaceAction.PretenstDistance:
                if (!pullScale) {
                    throw new Error("Missing pull scale")
                }
                faces.forEach((faceA, indexA) => {
                    faces.forEach((faceB, indexB) => {
                        if (indexA <= indexB) {
                            return
                        }
                        const role = action === FaceAction.ShapingDistance ? PULL_SHAPING_DISTANCER : PULL_PRETENST_DISTANCER
                        this.createRadialPull(faceA, faceB, role, pullScale)
                    })
                })
                break
            case FaceAction.Join:
                switch (faces.length) {
                    case 2:
                        if (faces[0].spin === faces[1].spin) {
                            centerBrickFaceIntervals()
                        } else {
                            this.createRadialPull(faces[0], faces[1], PULL_CONNECTOR)
                        }
                        break
                    case 3:
                        centerBrickFaceIntervals()
                        break
                }
                break
        }
    }

    public checkConnectors(): IRadialPull[] {
        if (this.connectors.length === 0) {
            return this.connectors
        }
        const connectFaces = (alpha: ITwistFace, omega: ITwistFace) => {
            rotateForBestRing(this.instance, alpha, omega)
            this.createLoop(alpha, omega)
        }
        return this.connectors.filter(({axis, alpha, omega, alphaRays, omegaRays}) => {
            if (axis.role.tag === "connector") {
                const distance = this.instance.jointDistance(axis.alpha, axis.omega)
                if (distance <= CONNECTOR_LENGTH) {
                    connectFaces(alpha, omega)
                    this.removeInterval(axis)
                    alphaRays.forEach(i => this.removeInterval(i))
                    omegaRays.forEach(i => this.removeInterval(i))
                    return false
                }
            }
            return true
        })
    }

    public getIntervalDetails(interval: IInterval): IIntervalDetails {
        const instance = this.instance
        const {floatView} = instance
        const strain = floatView.strains[interval.index]
        const length = instance.intervalLength(interval) * this.scale
        const height = instance.intervalLocation(interval).y * this.scale
        return {interval, strain, length, height}
    }

    private createLoop(faceA: ITwistFace, faceB: ITwistFace): void {
        const reverseA = [...faceA.ends].reverse()
        const forwardB = faceB.ends
        const scale = percentFromFactor((factorFromPercent(faceA.scale) + factorFromPercent(faceB.scale)) / 2)
        const loop: IInterval[] = []
        for (let index = 0; index < reverseA.length; index++) {
            const a0 = reverseA[index]
            const a1 = reverseA[(index + 1) % reverseA.length]
            const b = forwardB[index]
            loop.push(this.createInterval(a0, b, PULL_A, scale))
            loop.push(this.createInterval(b, a1, PULL_A, scale))
        }
        removeFace(faceB, this)
        removeFace(faceA, this)
        this.loops.push(loop)
    }

    // =========================

    private creatAxis(alpha: IJoint, omega: IJoint, role: IRole, pullScale?: IPercent): IInterval {
        const idealLength = this.instance.jointDistance(alpha, omega)
        const restLength = pullScale ? factorFromPercent(pullScale) * idealLength : CONNECTOR_LENGTH / 2
        const stiffness = 1
        const scale = percentOrHundred()
        const countdown = this.countdown * Math.abs(restLength - idealLength)
        const attack = 1 / countdown
        const index = this.fabric.create_interval(alpha.index, omega.index, false, idealLength, restLength, stiffness, attack)
        const interval: IInterval = {index, alpha, omega, role, scale, removed: false}
        this.intervals.push(interval)
        return interval
    }

    private createRay(alpha: IJoint, omega: IJoint, restLength: number): IInterval {
        const idealLength = this.instance.jointDistance(alpha, omega)
        const role = PULL_RADIAL
        const stiffness = 1
        const scale = percentFromFactor(restLength)
        const countdown = this.countdown * Math.abs(restLength - idealLength)
        const attack = 1 / countdown
        const index = this.fabric.create_interval(alpha.index, omega.index, false, idealLength, restLength, stiffness, attack)
        const interval: IInterval = {index, alpha, omega, role, scale, removed: false}
        this.intervals.push(interval)
        return interval
    }
}

