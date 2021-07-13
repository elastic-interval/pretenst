/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage, WorldFeature } from "eig"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import {
    CONNECTOR_LENGTH,
    IntervalRole,
    isPushRole,
    roleDefaultLength,
    roleDefaultStiffness,
    SHORTEST_MM,
} from "./eig-util"
import { FabricInstance } from "./fabric-instance"
import { createBud, execute, FaceAction, IBud, IMarkAction, ITenscript, markDefStringsToActions } from "./tenscript"
import { TenscriptNode } from "./tenscript-node"
import { bowtiePairs, IPair, snelsonPairs } from "./tensegrity-logic"
import {
    averageScaleFactor,
    expectPush,
    FaceName,
    factorFromPercent,
    IFace,
    IInterval, IIntervalDetails,
    IJoint,
    intervalJoins,
    intervalKey,
    intervalToPair,
    IPercent,
    IRadialPull,
    percentFromFactor,
    percentOrHundred,
    rotateForBestRing,
    Spin,
} from "./tensegrity-types"
import { Twist } from "./twist"

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

export type Job = (tensegrity: Tensegrity) => void

export class Tensegrity {
    public name: string
    public stage$: BehaviorSubject<Stage>
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public loops: IInterval[][] = []
    public faces: IFace[] = []

    public connectors: IRadialPull[] = []
    public distancers: IRadialPull[] = []

    private jobs: Job[] = []
    private buds: IBud[]
    private markDefStrings: Record<number, string> = {}
    private postGrowthOp: PostGrowthOp
    private complete = false

    constructor(
        public readonly location: Vector3,
        public readonly instance: FabricInstance,
        public readonly countdown: number,
        public readonly tenscript: ITenscript,
        tree: TenscriptNode,
    ) {
        this.instance.clear()
        this.stage$ = new BehaviorSubject(this.fabric.get_stage())
        this.markDefStrings = tenscript.markDefStrings
        this.name = tenscript.name
        this.postGrowthOp = tenscript.postGrowthOp
        this.buds = [createBud(this, location, tenscript, tree)]
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
        const index = joint.index
        this.fabric.remove_joint(index)
        this.joints = this.joints.filter(j => j.index !== index)
        joint.index = -index // mark it
        this.joints.forEach(j => j.index = j.index > index ? j.index - 1 : j.index)
        this.instance.refreshFloatView()
    }

    public createRadialPull(alpha: IFace, omega: IFace, pullScale?: IPercent): IRadialPull {
        const instance = this.instance
        const alphaJoint = this.createJoint(instance.faceLocation(alpha))
        const omegaJoint = this.createJoint(instance.faceLocation(omega))
        instance.refreshFloatView()
        const axis = this.creatAxis(alphaJoint, omegaJoint, pullScale)
        const alphaRestLength = alpha.ends.reduce((sum, end) => sum + instance.jointDistance(alphaJoint, end), 0) / alpha.ends.length
        const omegaRestLength = omega.ends.reduce((sum, end) => sum + instance.jointDistance(omegaJoint, end), 0) / omega.ends.length
        const alphaRays = alpha.ends.map(end => this.createRay(alphaJoint, end, alphaRestLength))
        const omegaRays = omega.ends.map(end => this.createRay(omegaJoint, end, omegaRestLength))
        const radialPull: IRadialPull = {alpha, omega, axis, alphaRays, omegaRays}
        switch (axis.intervalRole) {
            case IntervalRole.Connector:
                this.connectors.push(radialPull)
                break
            case IntervalRole.Distancer:
                this.distancers.push(radialPull)
                break
        }
        return radialPull
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent, patience?: number): IInterval {
        const push = isPushRole(intervalRole)
        const targetLength = roleDefaultLength(intervalRole) * factorFromPercent(scale)
        const stiffness = roleDefaultStiffness(intervalRole)
        const currentLength = targetLength === 0 ? 0 : this.instance.jointDistance(alpha, omega)
        const patienceFactor = patience === undefined ? 1 : patience
        const countdown = this.countdown * Math.abs(targetLength - currentLength) * patienceFactor
        const attack = countdown <= 0 ? 0 : 1 / countdown
        const index = this.fabric.create_interval(alpha.index, omega.index, push, currentLength, targetLength, stiffness, attack)
        const interval: IInterval = {index, intervalRole, scale, alpha, omega, removed: false}
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

    public createFace(twist: Twist, ends: IJoint[], pulls: IInterval[], spin: Spin, scale: IPercent, joint?: IJoint): IFace {
        const f0 = ends[0]
        const f1 = ends[2]
        const f2 = ends[1]
        const index = this.fabric.create_face(f0.index, f2.index, f1.index)
        const pushes = [expectPush(f0), expectPush(f1), expectPush(f2)]
        const face: IFace = {twist, index, spin, scale, ends, pushes, pulls, markNumbers: [], joint}
        this.faces.push(face)
        return face
    }

    public removeFace(face: IFace): void {
        face.pulls.forEach(pull => this.removeInterval(pull))
        face.pulls = []
        if (face.joint) {
            this.removeJoint(face.joint)
        }
        this.fabric.remove_face(face.index)
        this.faces = this.faces.filter(existing => existing.index !== face.index)
        this.faces.forEach(existing => {
            if (existing.index > face.index) {
                existing.index--
            }
        })
        face.index = -1
    }

    public faceToTriangle(face: IFace): void {
        face.pulls.forEach(pull => this.removeInterval(pull))
        face.pulls = []
        if (face.joint) {
            this.removeJoint(face.joint)
        }
        for (let index = 0; index < face.ends.length; index++) {
            const endA = face.ends[index]
            const endB = face.ends[(index + 1) % face.ends.length]
            face.pulls.push(this.createInterval(endA, endB, IntervalRole.PullB, face.scale))
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
            .filter(({intervalRole}) => !isPushRole(intervalRole))
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
                    return bowtiePairs(this)
                case PairSelection.Snelson:
                    return snelsonPairs(this)
                default:
                    throw new Error()
            }
        }
        // selectPairs().forEach(pair=> console.log(pairKey(pair)))
        selectPairs().forEach(({alpha, omega, intervalRole, scale}) => {
            this.createInterval(alpha, omega, intervalRole, scale, 5)
        })
    }

    public removeSlackPulls(): void {
        const slack = this.intervals
            .filter(({intervalRole}) => intervalRole === IntervalRole.PullAA)
            .filter(pullC => this.instance.floatView.strains[pullC.index] === 0)
        slack.forEach(interval => this.removeInterval(interval))
    }

    public createTwist(spin: Spin, scale: IPercent, baseKnown?: Vector3[]): Twist {
        return new Twist(this, spin, scale, baseKnown)
    }

    public createTwistOn(baseFace: IFace, spin: Spin, scale: IPercent): Twist {
        const jointLocation = (joint: IJoint) => this.instance.jointLocation(joint)
        const twist = this.createTwist(spin, scale, baseFace.ends.map(jointLocation).reverse())
        this.createLoop(baseFace, twist.face(FaceName.a))
        return twist
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

    public do(job: Job): void {
        this.jobs.push(job)
    }

    public iterate(): boolean {
        const busy = this.instance.iterate()
        if (busy) {
            return busy
        }
        const job = this.jobs.shift()
        if (job) {
            job(this)
            return true
        }
        if (this.stage === Stage.Growing) {
            if (this.buds.length > 0) {
                this.buds = execute(this.buds)
                if (this.buds.length === 0) { // last one executed
                    faceStrategies(this, this.faces, this.markDefStrings).forEach(strategy => strategy.execute(false))
                }
                return false
            } else if (this.connectors.length > 0) {
                this.connectors = this.checkConnectors()
                return false
            }
            this.stage = Stage.Shaping
            switch (this.postGrowthOp) {
                case PostGrowthOp.NoOp:
                    break
                case PostGrowthOp.Faces:
                    this.triangleFaces()
                    break
                case PostGrowthOp.Snelson:
                    this.createPulls(PairSelection.Snelson)
                    this.triangleFaces()
                    break
                case PostGrowthOp.Bowtie:
                    this.createPulls(PairSelection.Bowtie)
                    break
                case PostGrowthOp.BowtieFaces:
                    this.createPulls(PairSelection.Bowtie)
                    this.triangleFaces()
                    break
            }
        } else if (this.stage === Stage.Pretenst) {
            if (!this.complete) {
                this.complete = true
                faceStrategies(this, this.faces, this.markDefStrings).forEach(strategy => strategy.execute(true))
            }
        }
        return false
    }

    public strainToStiffness(): void {
        const instance = this.instance
        const floatView = instance.floatView
        const pulls = this.intervals.filter(interval => {
            if (isPushRole(interval.intervalRole)) {
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

    public findInterval(a: IJoint, b: IJoint): IInterval | undefined {
        return this.intervals.find(intervalJoins(a, b))
    }

    public createRadialPulls(faces: IFace[], action: FaceAction, actionScale?: IPercent): void {
        const locationFromFace = (face: IFace) => this.instance.faceLocation(face)
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
                return this.createRadialPull(closestFace, face)
            })
        }
        switch (action) {
            case FaceAction.Distance:
                const pullScale = actionScale ? actionScale : percentFromFactor(0.75)
                if (!pullScale) {
                    throw new Error("Missing pull scale")
                }
                faces.forEach((faceA, indexA) => {
                    faces.forEach((faceB, indexB) => {
                        if (indexA <= indexB) {
                            return
                        }
                        this.createRadialPull(faceA, faceB, pullScale)
                    })
                })
                break
            case FaceAction.Join:
                switch (faces.length) {
                    case 2:
                        if (faces[0].spin === faces[1].spin) {
                            centerBrickFaceIntervals()
                        } else {
                            this.createRadialPull(faces[0], faces[1])
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
        const connectFaces = (alpha: IFace, omega: IFace) => {
            rotateForBestRing(this.instance, alpha, omega)
            this.createLoop(alpha, omega)
        }
        return this.connectors.filter(({axis, alpha, omega, alphaRays, omegaRays}) => {
            if (axis.intervalRole === IntervalRole.Connector) {
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

    public faceToOrigin(face: IFace): void {
        this.instance.apply(this.instance.faceToOriginMatrix(face))
        this.instance.fabric.set_altitude(1)
        this.instance.refreshFloatView()
    }

    public getIntervalDetails(interval: IInterval): IIntervalDetails {
        const instance = this.instance
        const {floatView} = instance
        const pushOverPull = instance.world.get_float_value(WorldFeature.PushOverPull)
        const pretenstFactor = instance.world.get_float_value(WorldFeature.PretenstFactor)
        const stiffness = floatView.stiffnesses[interval.index] * (isPushRole(interval.intervalRole) ? pushOverPull : 1.0)
        const strain = floatView.strains[interval.index]
        const minLength = floatView.idealLengths.reduce((x, current) => Math.min(current, x), 1000000)
        const scaling = SHORTEST_MM / minLength
        const length = instance.intervalLength(interval) * scaling
        const idealLength = floatView.idealLengths[interval.index] * (isPushRole(interval.intervalRole) ? 1 + pretenstFactor : 1.0) * scaling
        const linearDensity = floatView.linearDensities[interval.index]
        const height = instance.intervalLocation(interval).y * scaling
        return {stiffness, strain, length, idealLength, linearDensity, height}
    }

    private createLoop(faceA: IFace, faceB: IFace): void {
        const reverseA = [...faceA.ends].reverse()
        const forwardB = faceB.ends
        const scale = percentFromFactor((factorFromPercent(faceA.scale) + factorFromPercent(faceB.scale)) / 2)
        const loop: IInterval[] = []
        for (let index = 0; index < reverseA.length; index++) {
            const a0 = reverseA[index]
            const a1 = reverseA[(index + 1) % reverseA.length]
            const b = forwardB[index]
            loop.push(this.createInterval(a0, b, IntervalRole.PullA, scale))
            loop.push(this.createInterval(b, a1, IntervalRole.PullA, scale))
        }
        this.removeFace(faceB)
        this.removeFace(faceA)
        this.loops.push(loop)
    }

    // =========================

    private creatAxis(alpha: IJoint, omega: IJoint, pullScale?: IPercent): IInterval {
        const idealLength = this.instance.jointDistance(alpha, omega)
        const intervalRole = pullScale ? IntervalRole.Distancer : IntervalRole.Connector
        const restLength = pullScale ? factorFromPercent(pullScale) * idealLength : CONNECTOR_LENGTH / 2
        const stiffness = 1
        const scale = percentOrHundred()
        const countdown = this.countdown * Math.abs(restLength - idealLength)
        const attack = 1 / countdown
        const index = this.fabric.create_interval(alpha.index, omega.index, false, idealLength, restLength, stiffness, attack)
        const interval: IInterval = {index, alpha, omega, intervalRole, scale, removed: false}
        this.intervals.push(interval)
        return interval
    }

    private createRay(alpha: IJoint, omega: IJoint, restLength: number): IInterval {
        const idealLength = this.instance.jointDistance(alpha, omega)
        const intervalRole = IntervalRole.Radial
        const stiffness = 1
        const scale = percentFromFactor(restLength)
        const countdown = this.countdown * Math.abs(restLength - idealLength)
        const attack = 1 / countdown
        const index = this.fabric.create_interval(alpha.index, omega.index, false, idealLength, restLength, stiffness, attack)
        const interval: IInterval = {index, alpha, omega, intervalRole, scale, removed: false}
        this.intervals.push(interval)
        return interval
    }
}

function faceStrategies(tensegrity: Tensegrity, faces: IFace[], markStrings?: Record<number, string>): FaceStrategy[] {
    const marks = markDefStringsToActions(markStrings)
    const collated: Record<number, IFace[]> = {}
    faces.forEach(face => {
        face.markNumbers.forEach(mark => {
            const found = collated[mark._]
            if (found) {
                found.push(face)
            } else {
                collated[mark._] = [face]
            }
        })
    })
    return Object.entries(collated).map(([key]) => {
        const possibleMark = marks[key] || marks[-1]
        const mark = possibleMark ? possibleMark : FaceAction.None
        return new FaceStrategy(tensegrity, collated[key], mark)
    })
}

class FaceStrategy {
    constructor(private tensegrity: Tensegrity, private faces: IFace[], private markAction: IMarkAction) {
    }

    public execute(after: boolean): void {
        if (after) {
            switch (this.markAction.action) {
                case FaceAction.Base:
                    this.tensegrity.faceToOrigin(this.faces[0])
                    break
            }
        } else {
            switch (this.markAction.action) {
                case FaceAction.Join:
                    this.tensegrity.createRadialPulls(this.faces, this.markAction.action, this.markAction.scale)
                    break
                case FaceAction.Distance:
                    this.tensegrity.createRadialPulls(this.faces, this.markAction.action, this.markAction.scale)
                    break
            }
        }
    }
}
