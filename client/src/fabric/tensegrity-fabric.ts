/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"
import { BufferGeometry, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from "three"

import { IFabricEngine, IntervalRole, Laterality } from "./fabric-engine"
import { FloatFeature, roleDefaultLength } from "./fabric-features"
import { FabricInstance } from "./fabric-instance"
import { LifePhase } from "./fabric-state"
import { executeActiveCode, IActiveCode, ICode, IGrowth } from "./tenscript"
import { connectClosestFacePair, createBrickOnOrigin, optimizeFabric } from "./tensegrity-brick"
import {
    emptySplit,
    IBrick,
    IFace,
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

interface IOutputInterval {
    joints: string,
    type: string,
    strainString: string,
    elasticity: number,
    elasticityString: string,
    linearDensity: number,
    linearDensityString: string,
    isPush: boolean,
    role: string,
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

export const SPHERE_RADIUS = 0.35
export const SPHERE = new SphereGeometry(SPHERE_RADIUS, 8, 8)

function scaleToElasticity(scale: IPercent): number {
    return percentToFactor(scale) / 100000
}

function scaleToLinearDensity(scale: IPercent): number {
    return percentToFactor(scale) / 1000
}

export class TensegrityFabric {
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public splitIntervals?: IIntervalSplit
    public faces: IFace[] = []
    public growth?: IGrowth

    private faceCount: number
    private faceLocations: Float32BufferAttribute
    private faceNormals: Float32BufferAttribute
    private _facesGeometry = new BufferGeometry()

    private intervalCount: number
    private lineLocations: Float32BufferAttribute
    private lineColors: Float32BufferAttribute
    private _linesGeometry = new BufferGeometry()

    private slackCloned = false

    constructor(
        public readonly instance: FabricInstance,
        public readonly slackInstance: FabricInstance,
        public readonly features: FloatFeature[],
        public readonly code: ICode,
        private lifePhase$: BehaviorSubject<LifePhase>,
    ) {
        this.lifePhase$.next(instance.growing())
        features.forEach(feature => this.instance.applyFeature(feature))
        const brick = createBrickOnOrigin(this, percentOrHundred())
        const executing: IActiveCode = {codeTree: this.code.codeTree, brick}
        this.growth = {growing: [executing], optimizationStack: []}
        this.refreshLineGeometry()
        this.refreshFaceGeometry()
    }

    public toSlack(): void {
        if (this.slackCloned) {
            this.instance.cloneFrom(this.slackInstance)
        } else {
            this.slackCloned = true
            this.instance.cloneTo(this.slackInstance)
        }
        this.lifePhase$.next(this.instance.slack())
    }

    public toPretensing(): void {
        this.lifePhase$.next(this.instance.pretensing())
    }

    public selectIntervals(selectionFilter: (interval: IInterval) => boolean): number {
        if (this.growth) {
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

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent): IInterval {
        const scaleFactor = percentToFactor(scale)
        const defaultLength = roleDefaultLength(intervalRole)
        const restLength = scaleFactor * defaultLength
        const isPush = intervalRole === IntervalRole.Push
        const elasticity = scaleToElasticity(scale)
        const linearDensity = scaleToLinearDensity(scale)
        const index = this.engine.createInterval(alpha.index, omega.index, intervalRole, restLength, elasticity, linearDensity)
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
            canGrow: true,
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

    public iterate(ticks: number): boolean {
        const engine = this.engine
        const busy = engine.iterate(ticks)
        if (busy) {
            return busy
        }
        const growth = this.growth
        if (!growth) {
            if (this.lifePhase$.getValue() === LifePhase.Pretensing) {
                this.lifePhase$.next(this.instance.pretenst())
            }
            return false
        }
        if (growth.growing.length > 0) {
            growth.growing = executeActiveCode(growth.growing)
            engine.centralize()
        }
        if (growth.growing.length === 0) {
            if (growth.optimizationStack.length > 0) {
                const optimization = growth.optimizationStack.pop()
                switch (optimization) {
                    case "L":
                        optimizeFabric(this)
                        break
                    case "X":
                        growth.optimizationStack.push("Connect")
                        break
                    case "Connect":
                        connectClosestFacePair(this)
                        break
                }
            } else {
                this.growth = undefined
                this.lifePhase$.next(this.instance.shaping())
            }
        }
        return true
    }

    public findInterval(joint1: IJoint, joint2: IJoint): IInterval | undefined {
        return this.intervals.find(interval => (
            (interval.alpha.index === joint1.index && interval.omega.index === joint2.index) ||
            (interval.alpha.index === joint2.index && interval.omega.index === joint1.index)
        ))
    }

    public orientInterval(interval: IInterval, girth: number): { scale: Vector3, rotation: Quaternion } {
        const Y_AXIS = new Vector3(0, 1, 0)
        const unit = this.instance.unitVector(interval.index)
        const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
        const alphaLocation = this.instance.location(interval.alpha.index)
        const omegaLocation = this.instance.location(interval.omega.index)
        const intervalLength = alphaLocation.distanceTo(omegaLocation)
        const scale = new Vector3(SPHERE_RADIUS * girth, intervalLength / SPHERE_RADIUS / 2, SPHERE_RADIUS * girth)
        return {scale, rotation}
    }

    public get output(): IFabricOutput {
        const numberToString = (n: number) => n.toFixed(5).replace(/[.]/, ",")
        const strains = this.instance.strains
        const elasticities = this.instance.elasticities
        const linearDensities = this.instance.linearDensities
        return {
            name: this.code.codeString,
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
                const joints = `${interval.alpha.index + 1},${interval.omega.index + 1}`
                const strainString = numberToString(strains[interval.index])
                const type = interval.isPush ? "Push" : "Pull"
                const elasticity = elasticities[interval.index]
                const elasticityString = numberToString(elasticity)
                const linearDensity = linearDensities[interval.index]
                const linearDensityString = numberToString(linearDensity)
                const role = IntervalRole[interval.intervalRole]
                const isPush = interval.isPush
                return <IOutputInterval>{
                    joints,
                    type,
                    strainString,
                    elasticity,
                    elasticityString,
                    linearDensity,
                    linearDensityString,
                    isPush,
                    role,
                }
            }).sort((a, b) => {
                if (a.isPush && !b.isPush) {
                    return -1
                }
                if (!a.isPush && b.isPush) {
                    return 1
                }
                return a.elasticity - b.elasticity
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
