/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole, Stage } from "eig"
import { BehaviorSubject } from "rxjs"
import { BufferGeometry, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from "three"

import { IFabricOutput, IOutputInterval } from "../storage/download"

import { isPush } from "./fabric-engine"
import { FabricInstance } from "./fabric-instance"
import { ITransitionPrefs, Life, stiffnessToLinearDensity } from "./life"
import { execute, IActiveTenscript, ITenscript } from "./tenscript"
import { scaleToFacePullLength, TensegrityBuilder } from "./tensegrity-builder"
import {
    factorToPercent,
    IBrick,
    IFace,
    IFacePull,
    IInterval,
    IJoint,
    IPercent,
    percentOrHundred,
    percentToFactor,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-types"

export const SPHERE = new SphereGeometry(1, 32, 8)

const COUNTDOWN_MAX = 65535

function facePullCountdown(distance: number): number {
    const countdown = distance * 4000
    return countdown > COUNTDOWN_MAX ? COUNTDOWN_MAX : countdown
}

function scaleToStiffness(scale: IPercent): number {
    return percentToFactor(scale) / 10000
}

export class TensegrityFabric {
    public life$: BehaviorSubject<Life>
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public facePulls: IFacePull[] = []
    public faces: IFace[] = []
    public bricks: IBrick[] = []
    public activeTenscript?: IActiveTenscript[]
    public facesToConnect: IFace[] | undefined
    public maxJointSpeed = 0
    public readonly builder: TensegrityBuilder

    private faceCount: number
    private faceLocations: Float32BufferAttribute
    private faceNormals: Float32BufferAttribute
    private _facesGeometry = new BufferGeometry()

    private intervalCount: number
    private lineLocations: Float32BufferAttribute
    private lineColors: Float32BufferAttribute
    private _linesGeometry = new BufferGeometry()

    constructor(
        public readonly roleDefaultLength: (intervalRole: IntervalRole) => number,
        public readonly numericFeature: (fabricFeature: FabricFeature) => number,
        public readonly instance: FabricInstance,
        public readonly tenscript: ITenscript,
    ) {
        this.life$ = new BehaviorSubject(new Life(numericFeature, this, Stage.Growing))
        this.builder = new TensegrityBuilder(this, numericFeature)
        const brick = this.builder.createBrickAt(new Vector3(), percentOrHundred())
        this.bricks = [brick]
        this.activeTenscript = [{tree: this.tenscript.tree, brick, fabric: this}]
    }

    public get life(): Life {
        return this.life$.getValue()
    }

    public toStage(stage: Stage, prefs?: ITransitionPrefs): void {
        if (stage === this.life.stage) {
            return
        }
        this.life$.next(this.life.withStage(stage, prefs))
    }

    public connectFaces(faces: IFace[]): void {
        this.facesToConnect = faces
    }

    public brickMidpoint({joints}: IBrick, midpoint?: Vector3): Vector3 {
        const accumulator = midpoint ? midpoint : new Vector3()
        return joints
            .reduce((sum, joint) => sum.add(this.instance.location(joint.index)), accumulator)
            .multiplyScalar(1.0 / joints.length)
    }

    public createJointIndex(location: Vector3): number {
        return this.instance.fabric.create_joint(location.x, location.y, location.z)
    }

    public createFacePull(alpha: IFace, omega: IFace): IFacePull {
        const instance = this.instance
        const distance = instance.faceMidpoint(alpha.index).distanceTo(instance.faceMidpoint(omega.index))
        const stiffness = scaleToStiffness(percentOrHundred())
        const linearDensity = stiffnessToLinearDensity(stiffness)
        const scaleFactor = (percentToFactor(alpha.brick.scale) + percentToFactor(omega.brick.scale)) / 2
        const restLength = scaleToFacePullLength(scaleFactor)
        const index = this.instance.fabric.create_interval(
            alpha.index, omega.index, IntervalRole.FacePull,
            restLength, stiffness, linearDensity, facePullCountdown(distance),
        )
        const facePull = {index, alpha, omega, distance, scaleFactor, removed: false}
        this.facePulls.push(facePull)
        this.instance.forgetDimensions()
        return facePull
    }

    public removeFacePull(facePull: IFacePull): void {
        this.facePulls = this.facePulls.filter(existing => existing.index !== facePull.index)
        this.instance.fabric.remove_interval(facePull.index)
        this.facePulls.forEach(existing => {
            if (existing.index > facePull.index) {
                existing.index--
            }
        })
        this.intervals.forEach(existing => {
            if (existing.index > facePull.index) {
                existing.index--
            }
        })
        facePull.removed = true
        this.instance.forgetDimensions()
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent, coundown: number): IInterval {
        const scaleFactor = percentToFactor(scale)
        const defaultLength = this.roleDefaultLength(intervalRole)
        const restLength = scaleFactor * defaultLength
        const stiffness = scaleToStiffness(scale)
        const linearDensity = stiffnessToLinearDensity(stiffness)
        const index = this.instance.fabric.create_interval(alpha.index, omega.index, intervalRole, restLength, stiffness, linearDensity, coundown)
        const interval: IInterval = {
            index,
            intervalRole,
            scale,
            alpha,
            omega,
            removed: false,
            isPush: isPush(intervalRole),
        }
        this.intervals.push(interval)
        return interval
    }

    public changeIntervalScale(interval: IInterval, factor: number): void {
        interval.scale = factorToPercent(percentToFactor(interval.scale) * factor)
        this.instance.fabric.multiply_rest_length(interval.index, factor, 100)
    }

    public changeIntervalRole(interval: IInterval, intervalRole: IntervalRole, scaleFactor: IPercent, countdown: number): void {
        interval.intervalRole = intervalRole
        this.instance.fabric.set_interval_role(interval.index, intervalRole)
        this.instance.fabric.change_rest_length(interval.index, percentToFactor(scaleFactor) * this.roleDefaultLength(intervalRole), countdown)
    }

    public removeInterval(interval: IInterval): void {
        this.intervals = this.intervals.filter(existing => existing.index !== interval.index)
        this.instance.fabric.remove_interval(interval.index)
        this.intervals.forEach(existing => {
            if (existing.index > interval.index) {
                existing.index--
            }
        })
        this.facePulls.forEach(existing => {
            if (existing.index > interval.index) {
                existing.index--
            }
        })
        interval.removed = true
        this.instance.forgetDimensions()
    }

    public createFace(brick: IBrick, triangle: Triangle): IFace {
        const {negative, pushEnds} = TRIANGLE_DEFINITIONS[triangle]
        const joints = pushEnds.map(end => brick.joints[end])
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
        const face: IFace = {
            index: this.instance.fabric.create_face(joints[0].index, joints[1].index, joints[2].index),
            canGrow: true, negative, removed: false,
            brick, triangle, joints, pushes, pulls,
        }
        this.faces.push(face)
        return face
    }

    public removeFace(face: IFace, removeIntervals: boolean): void {
        this.instance.fabric.remove_face(face.index)
        this.faces = this.faces.filter(existing => existing.index !== face.index)
        this.faces.forEach(existing => {
            if (existing.index > face.index) {
                existing.index--
            }
        })
        face.removed = true
        if (removeIntervals) {
            face.pulls.forEach(interval => this.removeInterval(interval))
        }
    }

    public needsUpdate(): void {
        const instance = this.instance
        this.faceLocations.array = instance.faceLocations
        this.faceLocations.needsUpdate = true
        this.faceNormals.array = instance.faceNormals
        this.faceNormals.needsUpdate = true
        this.lineLocations.array = instance.lineLocations
        this.lineLocations.needsUpdate = true
        this.lineColors.array = instance.lineColors
        this.lineColors.needsUpdate = true
        this._linesGeometry.computeBoundingSphere()
        this._facesGeometry.computeBoundingSphere()
    }

    public get submergedJoints(): IJoint[] {
        return this.joints.filter(joint => this.instance.location(joint.index).y < 0)
    }

    public get facesGeometry(): BufferGeometry {
        if (this.faceCount !== this.instance.fabric.get_face_count()) {
            this.refreshFaceGeometry()
        }
        return this._facesGeometry
    }

    public get linesGeometry(): BufferGeometry {
        if (this.intervalCount !== this.instance.fabric.get_interval_count()) {
            this.refreshLineGeometry()
        }
        return this._linesGeometry
    }

    public startTightening(facePulls: IFacePull[]): void {
        this.facePulls = facePulls
    }

    public iterate(): Stage {
        const lifePhase = this.instance.fabric.iterate(this.life$.getValue().stage, this.instance.world)
        if (lifePhase === Stage.Busy) {
            return lifePhase
        }
        const activeCode = this.activeTenscript
        if (activeCode) {
            if (activeCode.length > 0) {
                this.activeTenscript = execute(activeCode, this.builder.markFace)
                this.instance.fabric.centralize()
            }
            if (activeCode.length === 0) {
                this.activeTenscript = undefined
                if (lifePhase === Stage.Growing) {
                    const afterGrowing = this.instance.fabric.finish_growing()
                    this.facePulls = this.builder.initialFacePulls
                    return afterGrowing
                }
            }
        } else {
            const faces = this.facesToConnect
            if (faces) {
                this.facesToConnect = undefined
                this.builder.createFacePulls(faces)
            }
            this.facePulls = this.builder.checkFacePulls(this.facePulls, facePull => this.removeFacePull(facePull))
        }
        return lifePhase
    }

    public findInterval(joint1: IJoint, joint2: IJoint): IInterval | undefined {
        return this.intervals.find(interval => (
            (interval.alpha.index === joint1.index && interval.omega.index === joint2.index) ||
            (interval.alpha.index === joint2.index && interval.omega.index === joint1.index)
        ))
    }

    public orientInterval(interval: IInterval, radiusFactor: number, visualStrain: number): { scale: Vector3, rotation: Quaternion } {
        const Y_AXIS = new Vector3(0, 1, 0)
        const unit = this.instance.unitVector(interval.index)
        const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
        const alphaLocation = this.instance.location(interval.alpha.index)
        const omegaLocation = this.instance.location(interval.omega.index)
        const intervalLength = alphaLocation.distanceTo(omegaLocation)
        const strain = this.instance.strains[interval.index]
        const half = intervalLength / 2
        const scale = new Vector3(radiusFactor, half + half * (-strain) * visualStrain, radiusFactor)
        return {scale, rotation}
    }

    // public orientVectorPair(a: Vector3, b: Vector3, radiusFactor: number): { scale: Vector3, rotation: Quaternion } {
    //     const Y_AXIS = new Vector3(0, 1, 0)
    //     const unit = new Vector3().subVectors(b, a).normalize()
    //     const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
    //     const distance = a.distanceTo(b)
    //     const scale = new Vector3(radiusFactor, distance, radiusFactor)
    //     return {scale, rotation}
    // }

    public get output(): IFabricOutput {
        const numberToString = (n: number) => n.toFixed(5).replace(/[.]/, ",")
        const strains = this.instance.strains
        const stiffnesses = this.instance.stiffnesses
        const linearDensities = this.instance.linearDensities
        return {
            name: this.tenscript.name,
            joints: this.joints.map(joint => {
                const vector = this.instance.location(joint.index)
                return {
                    index: (joint.index + 1).toString(),
                    x: numberToString(vector.x),
                    y: numberToString(vector.z),
                    z: numberToString(vector.y),
                }
            }),
            intervals: this.intervals.map(interval => {
                const alpha = this.instance.location(interval.alpha.index)
                const omega = this.instance.location(interval.omega.index)
                const length = alpha.distanceTo(omega)
                const joints = `${interval.alpha.index + 1},${interval.omega.index + 1}`
                const strainString = numberToString(strains[interval.index])
                const type = interval.isPush ? "Push" : "Pull"
                const stiffness = stiffnesses[interval.index]
                const stiffnessString = numberToString(stiffness)
                const linearDensity = linearDensities[interval.index]
                const linearDensityString = numberToString(linearDensity)
                const role = IntervalRole[interval.intervalRole]
                return <IOutputInterval>{
                    joints,
                    type,
                    strainString,
                    stiffness,
                    stiffnessString,
                    linearDensity,
                    linearDensityString,
                    isPush: isPush(interval.intervalRole),
                    role,
                    length,
                }
            }).sort((a, b) => {
                if (a.isPush && !b.isPush) {
                    return -1
                }
                if (!a.isPush && b.isPush) {
                    return 1
                }
                return a.stiffness - b.stiffness
            }),
        }
    }

    private refreshLineGeometry(): void {
        this.instance.fabric.render_to(this.instance.view, this.instance.world)
        this.intervalCount = this.instance.fabric.get_interval_count()
        this.lineLocations = new Float32BufferAttribute(this.instance.lineLocations, 3)
        this.lineColors = new Float32BufferAttribute(this.instance.lineColors, 3)
        this._linesGeometry.addAttribute("position", this.lineLocations)
        this._linesGeometry.addAttribute("color", this.lineColors)
        this._linesGeometry.computeBoundingSphere()
    }

    private refreshFaceGeometry(): void {
        this.instance.fabric.render_to(this.instance.view, this.instance.world)
        this.faceCount = this.instance.fabric.get_face_count()
        this.faceLocations = new Float32BufferAttribute(this.instance.faceLocations, 3)
        this.faceNormals = new Float32BufferAttribute(this.instance.faceNormals, 3)
        this._facesGeometry.addAttribute("position", this.faceLocations)
        this._facesGeometry.addAttribute("normal", this.faceNormals)
        this._facesGeometry.computeBoundingSphere()
    }
}
