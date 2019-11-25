/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from "three"

import { FabricFeature, IFabricEngine, IntervalRole, Laterality } from "./fabric-engine"
import { FloatFeature } from "./fabric-features"
import { FabricInstance } from "./fabric-instance"
import { IFeatureValue, LifePhase, roleDefaultLength } from "./fabric-state"
import { execute, IActiveTenscript, ITenscript } from "./tenscript"
import {
    emptySplit,
    IBrick,
    IFace,
    IFacePull,
    IInterval,
    IIntervalSplit,
    IJoint,
    intervalSplitter,
    IPercent,
    JointTag,
    percentOrHundred,
    percentToFactor,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-brick-types"
import { CONNECT_DISTANCE, TensegrityBuilder } from "./tensegrity-builder"

interface IOutputInterval {
    joints: string,
    type: string,
    strainString: string,
    stiffness: number,
    stiffnessString: string,
    linearDensity: number,
    linearDensityString: string,
    isPush: boolean,
    role: string,
    length: number,
}

export interface IFabricOutput {
    name: string
    joints: {
        index: string,
        x: string,
        y: string,
        z: string,
    }[]
    intervals: IOutputInterval[]
}

export const SPHERE = new SphereGeometry(1, 16, 8)
export const CYLINDER = new CylinderGeometry(1, 1, 1, 20)

function scaleToStiffness(scale: IPercent): number {
    return percentToFactor(scale) / 10000
}

function stiffnessToLinearDensity(stiffness: number): number {
    return Math.sqrt(stiffness)
}

function pretensingAdjustments(
    strains: Float32Array,
    existingStiffnesses: Float32Array,
    intervals: IInterval[],
    pushStrainFactor: number,
    pretenseIntensity: number,
): {
    stiffnesses: Float32Array,
    linearDensities: Float32Array,
} {
    const getAverageStrain = (toAverage: IInterval[]) => {
        const totalStrain = toAverage.reduce((sum, interval) => sum + strains[interval.index], 0)
        return totalStrain / toAverage.length
    }
    const pushes = intervals.filter(interval => interval.isPush)
    const averagePushStrain = getAverageStrain(pushes)
    const pulls = intervals.filter(interval => !interval.isPush)
    const averagePullStrain = getAverageStrain(pulls)
    const averageAbsoluteStrain = (-pushStrainFactor * averagePushStrain + averagePullStrain) / 2
    const changes = intervals.map(interval => {
        const absoluteStrain = strains[interval.index] * (interval.isPush ? -pushStrainFactor : 1)
        const normalizedStrain = absoluteStrain - averageAbsoluteStrain
        const strainFactor = normalizedStrain / averageAbsoluteStrain
        return 1 + strainFactor * pretenseIntensity
    })
    const stiffness = existingStiffnesses.map((value, index) => value * changes[index])
    const linearDensities = stiffness.map(stiffnessToLinearDensity)
    return {stiffnesses: stiffness, linearDensities}
}

export class TensegrityFabric {
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public facePulls: IFacePull[] = []
    public splitIntervals?: IIntervalSplit
    public faces: IFace[] = []
    public bricks: IBrick[] = []
    public activeTenscript?: IActiveTenscript[]
    public readonly builder: TensegrityBuilder

    private faceCount: number
    private faceLocations: Float32BufferAttribute
    private faceNormals: Float32BufferAttribute
    private _facesGeometry = new BufferGeometry()

    private intervalCount: number
    private lineLocations: Float32BufferAttribute
    private lineColors: Float32BufferAttribute
    private _linesGeometry = new BufferGeometry()

    private nextLifePhase: LifePhase = LifePhase.Growing

    constructor(
        public readonly instance: FabricInstance,
        public readonly slackInstance: FabricInstance,
        public readonly floatFeatures: FloatFeature[],
        public readonly featureValues: Record<FabricFeature, IFeatureValue>,
        public readonly tenscript: ITenscript,
    ) {
        this.builder = new TensegrityBuilder(this)
        floatFeatures.forEach(feature => this.instance.applyFeature(feature))
        const brick = this.builder.createBrickAt(new Vector3(), percentOrHundred()) // todo: maybe raise
        this.activeTenscript = [{tree: this.tenscript.tree, brick, fabric: this}]
        this.bricks = [brick]
        this.refreshLineGeometry()
        this.refreshFaceGeometry()
    }

    public toSlack(): void {
        this.nextLifePhase = this.instance.engine.iterate(0, LifePhase.Slack)
        this.instance.engine.cloneInstance(this.instance.index, this.slackInstance.index)
    }

    public fromSlackToPretensing(): void {
        this.nextLifePhase = LifePhase.Pretensing
    }

    public fromSlackToShaping(): void {
        this.nextLifePhase = LifePhase.Shaping
    }

    public fromStrainsToStiffnesses(pushStrainFactor: number, pretensingIntensity: number): void {
        const instance = this.instance
        const {stiffnesses, linearDensities} = pretensingAdjustments(
            instance.strains,
            instance.stiffnesses,
            this.intervals,
            pushStrainFactor,
            pretensingIntensity,
        )
        instance.engine.cloneInstance(this.slackInstance.index, instance.index)
        this.nextLifePhase = LifePhase.Slack
        stiffnesses.forEach((value, index) => instance.stiffnesses[index] = value)
        linearDensities.forEach((value, index) => instance.linearDensities[index] = value)
        this.floatFeatures.forEach(feature => instance.applyFeature(feature))
    }

    public selectIntervals(selectionFilter: (interval: IInterval) => boolean): number {
        if (this.activeTenscript) {
            return 0
        }
        this.splitIntervals = this.intervals.reduce(intervalSplitter(selectionFilter), emptySplit())
        return this.splitIntervals.selected.length
    }

    public clearSelection(): void {
        this.splitIntervals = undefined
    }

    public forEachSelected(operation: (interval: IInterval) => void): number {
        const splitIntervals = this.splitIntervals
        if (!splitIntervals) {
            return 0
        }
        splitIntervals.selected.forEach(operation)
        return splitIntervals.selected.length
    }

    public get growthFaces(): IFace[] {
        return this.faces.filter(face => face.canGrow)
    }

    public removeFace(face: IFace, removeIntervals: boolean): void {
        this.engine.removeFace(face.index)
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

    public removeInterval(interval: IInterval): void {
        this.engine.removeInterval(interval.index)
        interval.removed = true
        this.intervals = this.intervals.filter(existing => existing.index !== interval.index)
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
        this.instance.forgetDimensions()
    }

    public removeFacePull(facePull: IFacePull): void {
        this.engine.removeInterval(facePull.index)
        this.facePulls = this.facePulls.filter(existing => existing.index !== facePull.index)
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

    public brickMidpoint({joints}: IBrick, midpoint?: Vector3): Vector3 {
        const accumulator = midpoint ? midpoint : new Vector3()
        return joints
            .reduce((sum, joint) => sum.add(this.instance.location(joint.index)), accumulator)
            .multiplyScalar(1.0 / joints.length)
    }

    public createJointIndex(jointTag: JointTag, location: Vector3): number {
        return this.engine.createJoint(jointTag, Laterality.RightSide, location.x, location.y, location.z)
    }

    public createFacePull(alpha: IFace, omega: IFace, countdown: number): IFacePull {
        const instance = this.instance
        const distance = instance.faceMidpoint(alpha.index).distanceTo(instance.faceMidpoint(omega.index))
        const stiffness = scaleToStiffness(percentOrHundred()) * 100
        const linearDensity = stiffnessToLinearDensity(stiffness)
        const scaleFactor = (percentToFactor(alpha.brick.scale) + percentToFactor(omega.brick.scale)) / 2
        const index = this.engine.createInterval(alpha.index, omega.index, IntervalRole.FacePull, CONNECT_DISTANCE, stiffness, linearDensity, countdown)
        const facePull = {index, alpha, omega, distance, scaleFactor, removed: false}
        this.facePulls.push(facePull)
        this.instance.forgetDimensions()
        return facePull
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent, coundown: number): IInterval {
        const scaleFactor = percentToFactor(scale)
        const defaultLength = roleDefaultLength(this.featureValues, intervalRole)
        const restLength = scaleFactor * defaultLength
        const isPush = intervalRole === IntervalRole.Push
        const stiffness = scaleToStiffness(scale)
        const linearDensity = stiffnessToLinearDensity(stiffness)
        const index = this.engine.createInterval(alpha.index, omega.index, intervalRole, restLength, stiffness, linearDensity, coundown)
        const interval: IInterval = {
            index,
            intervalRole,
            scale,
            alpha, omega,
            removed: false,
            isPush,
        }
        this.intervals.push(interval)
        return interval
    }

    public createFace(brick: IBrick, triangle: Triangle): IFace {
        const joints = TRIANGLE_DEFINITIONS[triangle].pushEnds.map(end => brick.joints[end])
        const pushes = TRIANGLE_DEFINITIONS[triangle].pushEnds.map(end => {
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
            index: this.engine.createFace(joints[0].index, joints[1].index, joints[2].index),
            canGrow: true, removed: false,
            brick, triangle, joints, pushes, pulls,
        }
        this.faces.push(face)
        return face
    }

    public release(): void {
        this.instance.release()
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
    }

    public get submergedJoints(): IJoint[] {
        return this.joints.filter(joint => this.instance.location(joint.index).y < 0)
    }

    public get facesGeometry(): BufferGeometry {
        if (this.faceCount !== this.instance.engine.getFaceCount()) {
            this.refreshFaceGeometry()
        }
        return this._facesGeometry
    }

    public get linesGeometry(): BufferGeometry {
        if (this.intervalCount !== this.instance.engine.getIntervalCount()) {
            this.refreshLineGeometry()
        }
        return this._linesGeometry
    }

    public startTightening(facePulls: IFacePull[]): void {
        this.facePulls = facePulls
    }

    public iterate(ticks: number): LifePhase {
        const engine = this.engine
        const lifePhase = engine.iterate(ticks, this.nextLifePhase)
        if (lifePhase === LifePhase.Busy) {
            return lifePhase
        }
        const activeCode = this.activeTenscript
        if (activeCode) {
            if (activeCode.length > 0) {
                this.activeTenscript = execute(activeCode, this.builder.markFace)
                engine.centralize()
            }
            if (activeCode.length === 0) {
                this.activeTenscript = undefined
                if (lifePhase === LifePhase.Growing) {
                    const afterGrowing = engine.finishGrowing()
                    this.facePulls = this.builder.initialFacePulls
                    return afterGrowing
                }
            }
        } else {
            const newFacePulls = this.builder.checkFacePulls(this.facePulls)
            engine.iterate(0, this.nextLifePhase)
            if (newFacePulls) {
                this.facePulls = newFacePulls
                if (newFacePulls.length === 0) {
                    this.builder.turnUpright()
                }
            }
        }
        return lifePhase
    }

    public findInterval(joint1: IJoint, joint2: IJoint): IInterval | undefined {
        return this.intervals.find(interval => (
            (interval.alpha.index === joint1.index && interval.omega.index === joint2.index) ||
            (interval.alpha.index === joint2.index && interval.omega.index === joint1.index)
        ))
    }

    public orientInterval(interval: IInterval, radiusFactor: number): { scale: Vector3, rotation: Quaternion } {
        const Y_AXIS = new Vector3(0, 1, 0)
        const unit = this.instance.unitVector(interval.index)
        const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
        const alphaLocation = this.instance.location(interval.alpha.index)
        const omegaLocation = this.instance.location(interval.omega.index)
        const intervalLength = alphaLocation.distanceTo(omegaLocation)
        const scale = new Vector3(radiusFactor, intervalLength / 2, radiusFactor)
        return {scale, rotation}
    }

    public orientVectorPair(a: Vector3, b: Vector3, radiusFactor: number): { scale: Vector3, rotation: Quaternion } {
        const Y_AXIS = new Vector3(0, 1, 0)
        const unit = new Vector3().subVectors(b, a).normalize()
        const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
        const distance = a.distanceTo(b)
        const scale = new Vector3(radiusFactor, distance, radiusFactor)
        return {scale, rotation}
    }

    public get output(): IFabricOutput {
        const numberToString = (n: number) => n.toFixed(5).replace(/[.]/, ",")
        const strains = this.instance.strains
        const stiffnesses = this.instance.stiffnesses
        const linearDensities = this.instance.linearDensities
        return {
            name: this.tenscript.code,
            joints: this.joints.map(joint => {
                const vector = this.slackInstance.location(joint.index)
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
                const isPush = interval.isPush
                return <IOutputInterval>{
                    joints,
                    type,
                    strainString,
                    stiffness,
                    stiffnessString,
                    linearDensity,
                    linearDensityString,
                    isPush,
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
        this.iterate(0)
        this.intervalCount = this.instance.engine.getIntervalCount()
        this.lineLocations = new Float32BufferAttribute(this.instance.lineLocations, 3)
        this.lineColors = new Float32BufferAttribute(this.instance.lineColors, 3)
        this._linesGeometry.addAttribute("position", this.lineLocations)
        this._linesGeometry.addAttribute("color", this.lineColors)
    }

    private refreshFaceGeometry(): void {
        this.iterate(0)
        this.faceCount = this.instance.engine.getFaceCount()
        this.faceLocations = new Float32BufferAttribute(this.instance.faceLocations, 3)
        this.faceNormals = new Float32BufferAttribute(this.instance.faceNormals, 3)
        this._facesGeometry.addAttribute("position", this.faceLocations)
        this._facesGeometry.addAttribute("normal", this.faceNormals)
    }

    private get engine(): IFabricEngine {
        return this.instance.engine
    }
}
