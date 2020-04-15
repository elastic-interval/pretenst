/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, FabricFeature, IntervalRole, Stage } from "eig"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { IFabricOutput, IOutputInterval, IOutputJoint } from "../storage/download"
import { IStoredState } from "../storage/stored-state"

import { intervalRoleName, isPushInterval } from "./eig-util"
import { FabricInstance } from "./fabric-instance"
import { ILifeTransition, Life } from "./life"
import { execute, IActiveTenscript, IMark, ITenscript, MarkAction } from "./tenscript"
import { scaleToFaceConnectorLength, TensegrityBuilder } from "./tensegrity-builder"
import {
    factorToPercent,
    gatherJointCables,
    IBrick,
    IFace,
    IFaceInterval,
    IInterval,
    IJoint,
    IPercent,
    percentOrHundred,
    percentToFactor,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-types"

function scaleToInitialStiffness(scale: IPercent): number {
    const scaleFactor = percentToFactor(scale)
    return Math.pow(scaleFactor, 0.5) * 0.00001
}

export class Tensegrity {
    public life$: BehaviorSubject<Life>
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public faceIntervals: IFaceInterval[] = []
    public faces: IFace[] = []
    public bricks: IBrick[] = []
    public activeTenscript?: IActiveTenscript[]
    private transitionQueue: ILifeTransition[] = []

    constructor(
        public readonly location: Vector3,
        public readonly symmetrical: boolean,
        public readonly rotation: number,
        public readonly roleDefaultLength: (intervalRole: IntervalRole) => number,
        public readonly numericFeature: (fabricFeature: FabricFeature) => number,
        public readonly instance: FabricInstance,
        public readonly tenscript: ITenscript,
    ) {
        this.instance.clear()
        this.life$ = new BehaviorSubject(new Life(numericFeature, this, Stage.Growing))
        const brick = new TensegrityBuilder(this).createBrickAt(location, symmetrical, percentOrHundred())
        this.bricks = [brick]
        this.activeTenscript = [{tree: this.tenscript.tree, brick, tensegrity: this}]
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

    public createLeftJoint(location: Vector3): number {
        return this.fabric.create_joint(location.x, location.y, location.z)
    }

    public createFaceConnector(alpha: IFace, omega: IFace): IFaceInterval {
        return this.createFaceInterval(alpha, omega)
    }

    public createFaceDistancer(alpha: IFace, omega: IFace, pullScale: IPercent): IFaceInterval {
        return this.createFaceInterval(alpha, omega, pullScale)
    }

    public removeFaceInterval(interval: IFaceInterval): void {
        this.faceIntervals = this.faceIntervals.filter(existing => existing.index !== interval.index)
        this.fabric.remove_interval(interval.index)
        this.faceIntervals.forEach(existing => {
            if (existing.index > interval.index) {
                existing.index--
            }
        })
        this.intervals.forEach(existing => {
            if (existing.index > interval.index) {
                existing.index--
            }
        })
        interval.removed = true
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent, coundown: number): IInterval {
        const idealLength = alpha.location().distanceTo(omega.location())
        const scaleFactor = percentToFactor(scale)
        const defaultLength = this.roleDefaultLength(intervalRole)
        const restLength = scaleFactor * defaultLength
        const stiffness = scaleToInitialStiffness(scale)
        const index = this.fabric.create_interval(
            alpha.index, omega.index, intervalRole,
            idealLength, restLength, stiffness, coundown)
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

    public changeIntervalRole(interval: IInterval, intervalRole: IntervalRole, scaleFactor: IPercent, countdown: number): void {
        interval.intervalRole = intervalRole
        this.fabric.set_interval_role(interval.index, intervalRole)
        this.fabric.change_rest_length(interval.index, percentToFactor(scaleFactor) * this.roleDefaultLength(intervalRole), countdown)
    }

    public removeInterval(interval: IInterval): void {
        this.intervals = this.intervals.filter(existing => existing.index !== interval.index)
        this.fabric.remove_interval(interval.index)
        this.intervals.forEach(existing => {
            if (existing.index > interval.index) {
                existing.index--
            }
        })
        this.faceIntervals.forEach(existing => {
            if (existing.index > interval.index) {
                existing.index--
            }
        })
        interval.removed = true
    }

    public createFace(brick: IBrick, triangle: Triangle): IFace {
        const {negative, pushEnds} = TRIANGLE_DEFINITIONS[triangle]
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
        const pulls = [0, 1, 2].map(offset => brick.pulls[triangle * 3 + offset])
        const joints = pushEnds.map(end => brick.joints[end])
        const index = this.fabric.create_face(joints[0].index, joints[1].index, joints[2].index)
        const face: IFace = {
            index, negative, removed: false,
            brick, triangle, joints, pushes, pulls,
            location: () =>
                joints.reduce((sum, joint) => sum.add(joint.location()), new Vector3())
                    .multiplyScalar(1.0 / 3.0),
        }
        this.faces.push(face)
        return face
    }

    public removeFace(face: IFace, removeIntervals: boolean): void {
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

    public get submergedJoints(): IJoint[] {
        return this.joints.filter(joint => joint.location().y < 0)
    }

    public startTightening(intervals: IFaceInterval[]): void {
        this.faceIntervals = intervals
    }

    public set transition(tx: ILifeTransition) {
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
        const builder = () => new TensegrityBuilder(this)
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

    public getFabricOutput(storedState: IStoredState): IFabricOutput {
        const idealLengths = this.instance.floatView.idealLengths
        const strains = this.instance.floatView.strains
        const stiffnesses = this.instance.floatView.stiffnesses
        const linearDensities = this.instance.floatView.linearDensities
        return {
            name: this.tenscript.name,
            joints: this.joints.map(joint => {
                const vector = joint.location()
                return <IOutputJoint>{
                    index: joint.index,
                    x: vector.x, y: vector.z, z: vector.y,
                    jointCables: gatherJointCables(joint, this.intervals),
                }
            }),
            intervals: this.intervals.map(interval => {
                const radiusFeature = storedState.featureValues[interval.isPush ? FabricFeature.PushRadius : FabricFeature.PullRadius]
                const radius = radiusFeature.numeric * linearDensities[interval.index]
                const jointRadius = radius * storedState.featureValues[FabricFeature.JointRadius].numeric
                const currentLength = interval.alpha.location().distanceTo(interval.omega.location())
                const length = currentLength + (interval.isPush ? -jointRadius * 2 : jointRadius * 2)
                return <IOutputInterval>{
                    index: interval.index,
                    joints: [interval.alpha.index, interval.omega.index],
                    type: interval.isPush ? "Push" : "Pull",
                    strain: strains[interval.index],
                    stiffness: stiffnesses[interval.index],
                    linearDensity: linearDensities[interval.index],
                    role: intervalRoleName(interval.intervalRole),
                    idealLength: idealLengths[interval.index],
                    isPush: interval.isPush,
                    length, radius, jointRadius,
                }
            }),
        }
    }

    private createFaceInterval(alpha: IFace, omega: IFace, pullScale?: IPercent): IFaceInterval {
        const connector = !pullScale
        const intervalRole = connector ? IntervalRole.FaceConnector : IntervalRole.FaceDistancer
        const idealLength = alpha.location().distanceTo(omega.location())
        const stiffness = scaleToInitialStiffness(percentOrHundred())
        const scaleFactor = (percentToFactor(alpha.brick.scale) + percentToFactor(omega.brick.scale)) / 2
        const restLength = !pullScale ? scaleToFaceConnectorLength(scaleFactor) : percentToFactor(pullScale) * idealLength
        const countdown = idealLength * this.numericFeature(FabricFeature.IntervalCountdown)
        const index = this.fabric.create_interval(
            alpha.index, omega.index, intervalRole,
            idealLength, restLength, stiffness, countdown,
        )
        const interval: IFaceInterval = {index, alpha, omega, connector, scaleFactor, removed: false}
        this.faceIntervals.push(interval)
        return interval
    }
}

function faceStrategies(faces: IFace[], marks: Record<number, IMark>, builder: TensegrityBuilder): FaceStrategy[] {
    const collated: Record<number, IFace[]> = {}
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
    constructor(private faces: IFace[], private mark: IMark, private builder: TensegrityBuilder) {
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
        }
    }
}


