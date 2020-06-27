/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, IntervalRole, Stage, WorldFeature } from "eig"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { roleDefaultLength } from "../pretenst"
import { IFabricOutput, IOutputInterval, IOutputJoint } from "../storage/download"

import { BrickBuilder, scaleToFaceConnectorLength } from "./brick-builder"
import { intervalRoleName, isPushInterval } from "./eig-util"
import { FabricInstance } from "./fabric-instance"
import { ILifeTransition, Life } from "./life"
import { execute, IActiveTenscript, IMark, ITenscript, MarkAction } from "./tenscript"
import { Chirality, TensegrityBuilder } from "./tensegrity-builder"
import { scaleToInitialStiffness } from "./tensegrity-optimizer"
import {
    BRICK_FACE_DEF,
    FaceName,
    factorToPercent,
    gatherJointHoles,
    IBrick,
    IBrickFace,
    IFaceAnchor,
    IFaceInterval,
    IInterval,
    IJoint,
    IPercent,
    percentOrHundred,
    percentToFactor,
} from "./tensegrity-types"

const COUNDOWN_PER_LENGTH = 2

export class Tensegrity {
    public life$: BehaviorSubject<Life>
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public faceIntervals: IFaceInterval[] = []
    public faceAnchors: IFaceAnchor[] = []
    public faces: IBrickFace[] = []
    public bricks: IBrick[] = []
    public activeTenscript?: IActiveTenscript[]
    private transitionQueue: ILifeTransition[] = []

    constructor(
        public readonly location: Vector3,
        public readonly symmetrical: boolean,
        public readonly rotation: number,
        public readonly scale: IPercent,
        public readonly numericFeature: (worldFeature: WorldFeature) => number,
        public readonly instance: FabricInstance,
        public readonly tenscript: ITenscript,
    ) {
        this.instance.clear()
        this.life$ = new BehaviorSubject(new Life(numericFeature, this, Stage.Growing))
        // const brick = new BrickBuilder(this).createBrickAt(location, symmetrical, scale)
        // this.bricks = [brick]
        // this.activeTenscript = [{tree: this.tenscript.tree, brick, tensegrity: this}]
        this.bricks = []
        this.activeTenscript = []
        const tb = new TensegrityBuilder(this)
        const omniChirality = Chirality.Right
        const faceChirality = Chirality.Left
        const twist = tb.createOmniTwistAt(new Vector3(0, 0, 0), omniChirality, percentOrHundred())
        // console.log("joints", this.joints.map(j => `${j.index}: ${j.location().y}`))
        setTimeout(() => {
            // this.transition = {stage: Stage.Slack, adoptLengths: true}
            twist.faces.filter(({chirality})=> chirality === faceChirality).forEach(face => tb.createTwistOn(face, percentOrHundred()))
        }, 5000)
    }

    public get fabric(): Fabric {
        return this.instance.fabric
    }

    public lifeTransition(tx: ILifeTransition): void {
        const life = this.life$.getValue()
        if (tx.stage === life.stage) {
            return
        }
        this.life$.next(life.executeTransition(tx))
    }

    public createJoint(location: Vector3): number {
        return this.fabric.create_joint(location.x, location.y, location.z)
    }

    public createIJoint(location: Vector3): IJoint {
        const index = this.fabric.create_joint(location.x, location.y, location.z)
        const newJoint: IJoint = {index, location: () => this.instance.jointLocation(index)}
        this.joints.push(newJoint)
        return newJoint
    }

    public createFaceConnector(alpha: IBrickFace, omega: IBrickFace): IFaceInterval {
        return this.createFaceInterval(alpha, omega)
    }

    public createFaceDistancer(alpha: IBrickFace, omega: IBrickFace, pullScale: IPercent): IFaceInterval {
        return this.createFaceInterval(alpha, omega, pullScale)
    }

    public createFaceAnchor(alpha: IBrickFace, point: Vector3, scale: IPercent): IFaceAnchor {
        const intervalRole = IntervalRole.FaceAnchor
        const omegaJointIndex = this.createJoint(point)
        this.fabric.anchor_joint(omegaJointIndex)
        const omega: IJoint = {index: omegaJointIndex, location: () => this.instance.jointLocation(omegaJointIndex)}
        this.joints.push(omega)
        const idealLength = alpha.location().distanceTo(point)
        const stiffness = scaleToInitialStiffness(percentOrHundred())
        const linearDensity = 0
        const restLength = -point.y * percentToFactor(scale)
        const countdown = idealLength * this.numericFeature(WorldFeature.IntervalCountdown)
        const index = this.fabric.create_interval(
            alpha.index, omega.index, intervalRole,
            idealLength, restLength, stiffness, linearDensity, countdown,
        )
        const interval: IFaceAnchor = {index, alpha, omega, removed: false}
        this.faceAnchors.push(interval)
        return interval
    }

    public removeFaceInterval(interval: IFaceInterval): void {
        this.faceIntervals = this.faceIntervals.filter(existing => existing.index !== interval.index)
        this.eliminateInterval(interval.index)
        interval.removed = true
    }

    public removeFaceAnchor(interval: IFaceAnchor): void {
        this.faceAnchors = this.faceAnchors.filter(existing => existing.index !== interval.index)
        interval.alpha.joints.forEach(joint => this.fabric.anchor_joint(joint.index))
        this.eliminateInterval(interval.index)
        interval.removed = true
    }

    public createInterval(
        alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent,
        stiffness: number, linearDensity: number, coundown: number,
    ): IInterval {
        const idealLength = alpha.location().distanceTo(omega.location())
        const scaleFactor = percentToFactor(scale)
        const defaultLength = roleDefaultLength(intervalRole)
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
            strainNuance: () => this.instance.floatView.strainNuances[index],
        }
        this.intervals.push(interval)
        return interval
    }

    public changeIntervalScale(interval: IInterval, factor: number): void {
        interval.scale = factorToPercent(percentToFactor(interval.scale) * factor)
        this.fabric.multiply_rest_length(interval.index, factor, 100)
    }

    public changeIntervalRole(interval: IInterval, intervalRole: IntervalRole, scaleFactor: IPercent, countdown: number): void {
        interval.intervalRole = intervalRole
        this.fabric.set_interval_role(interval.index, intervalRole)
        this.fabric.change_rest_length(interval.index, percentToFactor(scaleFactor) * roleDefaultLength(intervalRole), countdown)
    }

    public removeInterval(interval: IInterval): void {
        this.intervals = this.intervals.filter(existing => existing.index !== interval.index)
        this.eliminateInterval(interval.index)
        interval.removed = true
    }

    public createFace(brick: IBrick, faceName: FaceName): IBrickFace {
        const {negative, pushEnds} = BRICK_FACE_DEF[faceName]
        const pushes = pushEnds.map(end => {
            const foundPush = brick.pushes.find(push => {
                const endJoint = brick.joints[end]
                return endJoint.index === push.alpha.index || endJoint.index === push.omega.index
            })
            if (foundPush === undefined) {
                throw new Error()
            }
            return foundPush
        })
        const pulls = [0, 1, 2].map(offset => brick.pulls[faceName * 3 + offset])
        const joints = pushEnds.map(end => brick.joints[end])
        const index = this.fabric.create_face(joints[0].index, joints[1].index, joints[2].index)
        const face: IBrickFace = {
            index, negative, removed: false,
            brick, faceName, joints, pushes, pulls,
            location: () =>
                joints.reduce((sum, joint) => sum.add(joint.location()), new Vector3())
                    .multiplyScalar(1.0 / 3.0),
        }
        this.faces.push(face)
        return face
    }

    public removeFace(face: IBrickFace, removeIntervals: boolean): void {
        this.fabric.remove_face(face.index)
        this.faces = this.faces.filter(existing => existing.index !== face.index)
        this.faces.forEach(existing => {
            if (existing.index > face.index) {
                existing.index--
            }
        })
        this.faceIntervals.forEach(existing => {
            if (existing.alpha.index > face.index) {
                existing.alpha.index--
            }
            if (existing.omega.index > face.index) {
                existing.omega.index--
            }
        })
        face.removed = true
        if (removeIntervals) {
            face.pulls.forEach(interval => this.removeInterval(interval))
        }
    }

    public get anchorJoints(): IJoint[] {
        return this.joints.filter(joint => this.fabric.is_anchor_joint(joint.index))
    }

    public startTightening(intervals: IFaceInterval[]): void {
        this.faceIntervals = intervals
    }

    public set transition(tx: ILifeTransition) {
        if (tx.stage === undefined) {
            throw new Error("Undefined stage!")
        }
        this.transitionQueue.push(tx)
    }

    public iterate(): Stage | undefined {
        const tx = this.transitionQueue.shift()
        if (tx) {
            this.lifeTransition(tx)
        }
        const stage = this.instance.iterate(this.life$.getValue().stage)
        if (stage === undefined) {
            return undefined
        }
        const activeCode = this.activeTenscript
        const builder = () => new BrickBuilder(this)
        if (activeCode) {
            if (activeCode.length > 0) {
                this.activeTenscript = execute(activeCode, this.tenscript.marks)
            }
            if (activeCode.length === 0) {
                this.activeTenscript = undefined
                faceStrategies(this.faces, this.tenscript.marks, builder()).forEach(strategy => strategy.execute())
                if (stage === Stage.Growing) {
                    return this.fabric.finish_growing()
                }
            }
            return Stage.Growing
        }
        if (this.faceIntervals.length > 0) {
            this.faceIntervals = builder().checkFaceIntervals(this.faceIntervals, interval => this.removeFaceInterval(interval))
        }
        return stage
    }

    public findInterval(joint1: IJoint, joint2: IJoint): IInterval | undefined {
        return this.intervals.find(interval => (
            (interval.alpha.index === joint1.index && interval.omega.index === joint2.index) ||
            (interval.alpha.index === joint2.index && interval.omega.index === joint1.index)
        ))
    }

    public getFabricOutput(pushRadius: number, pullRadius: number, jointRadius: number): IFabricOutput {
        this.instance.refreshFloatView()
        const idealLengths = this.instance.floatView.idealLengths
        const strains = this.instance.floatView.strains
        const stiffnesses = this.instance.floatView.stiffnesses
        const linearDensities = this.instance.floatView.linearDensities
        return {
            name: this.tenscript.name,
            joints: this.joints.map(joint => {
                const vector = joint.location()
                const anchor = this.instance.fabric.is_anchor_joint(joint.index)
                const holes = gatherJointHoles(joint, this.intervals)
                return <IOutputJoint>{
                    index: joint.index,
                    radius: jointRadius,
                    x: vector.x, y: vector.z, z: vector.y,
                    anchor, holes,
                }
            }),
            intervals: this.intervals.map(interval => {
                const radius = interval.isPush ? pushRadius : pullRadius
                const currentLength = interval.alpha.location().distanceTo(interval.omega.location())
                const alphaIndex = interval.alpha.index
                const omegaIndex = interval.omega.index
                if (alphaIndex >= this.joints.length || omegaIndex >= this.joints.length) {
                    throw new Error(`Joint not found ${intervalRoleName(interval.intervalRole)}:${alphaIndex},${omegaIndex}:${this.joints.length}`)
                }
                return <IOutputInterval>{
                    index: interval.index,
                    joints: [alphaIndex, omegaIndex],
                    type: interval.isPush ? "Push" : "Pull",
                    strain: strains[interval.index],
                    stiffness: stiffnesses[interval.index],
                    linearDensity: linearDensities[interval.index],
                    role: intervalRoleName(interval.intervalRole),
                    idealLength: idealLengths[interval.index],
                    isPush: interval.isPush,
                    length: currentLength - jointRadius * 2,
                    radius,
                }
            }),
        }
    }

    private createFaceInterval(alpha: IBrickFace, omega: IBrickFace, pullScale?: IPercent): IFaceInterval {
        const connector = !pullScale
        const intervalRole = connector ? IntervalRole.FaceConnector : IntervalRole.FaceDistancer
        const idealLength = alpha.location().distanceTo(omega.location())
        const stiffness = scaleToInitialStiffness(percentOrHundred())
        const scaleFactor = (percentToFactor(alpha.brick.scale) + percentToFactor(omega.brick.scale)) / 2
        const restLength = !pullScale ? scaleToFaceConnectorLength(scaleFactor) : percentToFactor(pullScale) * idealLength
        const linearDensity = 0
        const countdown = COUNDOWN_PER_LENGTH * idealLength * this.numericFeature(WorldFeature.IntervalCountdown)
        const index = this.fabric.create_interval(
            alpha.index, omega.index, intervalRole,
            idealLength, restLength, stiffness, linearDensity, countdown,
        )
        const interval: IFaceInterval = {index, alpha, omega, connector, scaleFactor, removed: false}
        this.faceIntervals.push(interval)
        return interval
    }

    private eliminateInterval(index: number): void {
        this.fabric.remove_interval(index)
        this.faceIntervals.forEach(existing => {
            if (existing.index > index) {
                existing.index--
            }
        })
        this.faceAnchors.forEach(existing => {
            if (existing.index > index) {
                existing.index--
            }
        })
        this.intervals.forEach(existing => {
            if (existing.index > index) {
                existing.index--
            }
        })
    }
}

function faceStrategies(faces: IBrickFace[], marks: Record<number, IMark>, builder: BrickBuilder): FaceStrategy[] {
    const collated: Record<number, IBrickFace[]> = {}
    faces.forEach(face => {
        if (face.mark === undefined) {
            return
        }
        const found = collated[face.mark._]
        if (found) {
            found.push(face)
        } else {
            collated[face.mark._] = [face]
        }
    })
    return Object.entries(collated).map(([key, value]) => {
        const possibleMark = marks[key]
        const mark = possibleMark ? possibleMark :
            value.length === 1 ?
                <IMark>{action: MarkAction.BaseFace} :
                <IMark>{action: MarkAction.JoinFaces}
        return new FaceStrategy(collated[key], mark, builder)
    })
}

class FaceStrategy {
    constructor(private faces: IBrickFace[], private mark: IMark, private builder: BrickBuilder) {
    }

    public execute(): void {
        switch (this.mark.action) {
            case MarkAction.Subtree:
                break
            case MarkAction.BaseFace:
                this.builder.faceToOrigin(this.faces[0])
                break
            case MarkAction.JoinFaces:
            case MarkAction.FaceDistance:
                this.builder.createFaceIntervals(this.faces, this.mark)
                break
            case MarkAction.Anchor:
                this.builder.createFaceAnchor(this.faces[0], this.mark)
                break
        }
    }
}


