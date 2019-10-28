/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from "three"

import { FabricFeature, IFabricEngine, IntervalRole, Laterality } from "./fabric-engine"
import { fabricFeatureValue, FloatFeature, roleDefaultLength } from "./fabric-features"
import { FabricInstance } from "./fabric-instance"
import { LifePhase } from "./life-phase"
import { connectClosestFacePair, createBrickOnOrigin, executeActiveCode, optimizeFabric } from "./tensegrity-brick"
import {
    emptySplit,
    IActiveCode,
    IBrick,
    ICodeTree,
    IFace,
    IGrowth,
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
    elastic: number,
    elasticString: string,
    isBar: boolean,
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
const PRETENSING_STEPS = 100

function scaleToElasticFactor(scale: IPercent): number {
    return percentToFactor(scale) / 100000
}

export class TensegrityFabric {
    public lifePhase: LifePhase
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public splitIntervals?: IIntervalSplit
    public faces: IFace[] = []
    public growth?: IGrowth
    public pretensingStep = 0

    private faceLocations = new Float32BufferAttribute([], 3)
    private faceNormals = new Float32BufferAttribute([], 3)
    private lineLocations = new Float32BufferAttribute([], 3)
    private lineColors = new Float32BufferAttribute([], 3)
    private facesGeometryStored: BufferGeometry | undefined
    private linesGeometryStored: BufferGeometry | undefined
    private pretensingStartAge = 0

    constructor(
        codeTree: ICodeTree,
        public readonly instance: FabricInstance,
        public readonly name: string,
        public readonly features: FloatFeature[],
    ) {
        this.lifePhase = this.instance.growing()
        features.forEach(feature => this.instance.applyFeature(feature))
        const brick = createBrickOnOrigin(this, percentOrHundred())
        const executing: IActiveCode = {codeTree, brick}
        this.growth = {growing: [executing], optimizationStack: []}
    }

    public slack(): LifePhase {
        return this.lifePhase = this.instance.slack()
    }

    public brickMidpoint({joints}: IBrick, midpoint?: Vector3): Vector3 {
        const accumulator = midpoint ? midpoint : new Vector3()
        return joints
            .reduce((sum, joint) => sum.add(this.instance.getJointLocation(joint.index)), accumulator)
            .multiplyScalar(1.0 / joints.length)
    }

    public pretensing(): LifePhase {
        this.pretensingStep = 0
        this.pretensingStartAge = this.instance.engine.getAge()
        return this.lifePhase = this.instance.pretensing()
    }

    public gravitizing(): LifePhase {
        this.pretensingStep = 0
        this.pretensingStartAge = this.instance.engine.getAge()
        return this.lifePhase = this.instance.gravitizing()
    }

    public pretenst(): LifePhase {
        return this.lifePhase = this.instance.pretenst()
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
            face.cables.forEach(interval => this.removeInterval(interval))
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

    public optimize(highCross: boolean): void {
        optimizeFabric(this, highCross)
    }

    public createJointIndex(jointTag: JointTag, location: Vector3): number {
        return this.engine.createJoint(jointTag, Laterality.RightSide, location.x, location.y, location.z)
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, scale: IPercent): IInterval {
        const scaleFactor = percentToFactor(scale)
        const defaultLength = roleDefaultLength(intervalRole)
        const restLength = scaleFactor * defaultLength
        const isBar = intervalRole === IntervalRole.Bar
        const pushOverPull = fabricFeatureValue(FabricFeature.PushOverPull)
        const fabricElasticFactor = isBar ? pushOverPull / 2 : 2 / pushOverPull
        const elasticFactor = scaleToElasticFactor(scale) * fabricElasticFactor
        const index = this.engine.createInterval(alpha.index, omega.index, intervalRole, restLength, elasticFactor)
        const interval: IInterval = {
            index,
            intervalRole,
            scale,
            alpha, omega,
            removed: false,
            isBar,
        }
        this.intervals.push(interval)
        return interval
    }

    public createFace(brick: IBrick, triangle: Triangle): IFace {
        const joints = TRIANGLE_DEFINITIONS[triangle].barEnds.map(barEnd => brick.joints[barEnd])
        const bars = TRIANGLE_DEFINITIONS[triangle].barEnds.map(barEnd => {
            const foundBar = brick.bars.find(bar => {
                const endJoint = brick.joints[barEnd]
                return endJoint.index === bar.alpha.index || endJoint.index === bar.omega.index
            })
            if (foundBar === undefined) {
                throw new Error()
            }
            return foundBar
        })
        const cables = [0, 1, 2].map(offset => brick.cables[triangle * 3 + offset])
        const face: IFace = {
            index: this.engine.createFace(joints[0].index, joints[1].index, joints[2].index),
            canGrow: true,
            brick,
            triangle,
            joints,
            bars,
            cables,
        }
        this.faces.push(face)
        return face
    }

    public release(): void {
        this.instance.release()
    }

    public forgetGeometry(): void {
        if (this.facesGeometryStored) {
            this.facesGeometryStored.dispose()
            this.facesGeometryStored = undefined
        }
        if (this.linesGeometryStored) {
            this.linesGeometryStored.dispose()
            this.linesGeometryStored = undefined
        }
    }

    public get submergedJoints(): IJoint[] {
        return this.joints
            .filter(joint => this.instance.getJointLocation(joint.index).y < 0)
    }

    public get facesGeometry(): BufferGeometry {
        if (!this.facesGeometryStored) {
            this.engine.iterate(0)
            const geometry = new BufferGeometry()
            this.faceLocations = new Float32BufferAttribute(this.instance.getFaceLocations(), 3)
            this.faceNormals = new Float32BufferAttribute(this.instance.getFaceNormals(), 3)
            geometry.addAttribute("position", this.faceLocations)
            geometry.addAttribute("normal", this.faceNormals)
            this.facesGeometryStored = geometry
        }
        return this.facesGeometryStored
    }

    public get linesGeometry(): BufferGeometry {
        if (!this.linesGeometryStored) {
            this.engine.iterate(0)
            const geometry = new BufferGeometry()
            this.lineLocations = new Float32BufferAttribute(this.instance.getLineLocations(), 3)
            this.lineColors = new Float32BufferAttribute(this.instance.getLineColors(), 3)
            geometry.addAttribute("position", this.lineLocations)
            geometry.addAttribute("color", this.lineColors)
            this.linesGeometryStored = geometry
        }
        return this.linesGeometryStored
    }

    public iterate(ticks: number): boolean {
        const engine = this.engine
        const busy = engine.iterate(ticks)
        this.forgetGeometry()
        if (busy) {
            if (this.timeForPretensing()) {
                this.takePretensingStep()
            }
            return busy
        }
        const growth = this.growth
        if (!growth) {
            if (this.lifePhase === LifePhase.Pretensing) {
                this.lifePhase = this.gravitizing()
            } else if (this.lifePhase === LifePhase.Gravitizing) {
                this.lifePhase = this.pretenst()
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
                        optimizeFabric(this, false)
                        break
                    case "H":
                        optimizeFabric(this, true)
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
                this.lifePhase = this.instance.shaping()
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
        const unit = this.instance.getIntervalUnit(interval.index)
        const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
        const alphaLocation = this.instance.getJointLocation(interval.alpha.index)
        const omegaLocation = this.instance.getJointLocation(interval.omega.index)
        const intervalLength = alphaLocation.distanceTo(omegaLocation)
        const scale = new Vector3(SPHERE_RADIUS * girth, intervalLength / SPHERE_RADIUS / 2, SPHERE_RADIUS * girth)
        return {scale, rotation}
    }

    public get output(): IFabricOutput {
        const numberToString = (n: number) => n.toFixed(5).replace(/[.]/, ",")
        const strains = this.instance.strains
        const elastics = this.instance.elastics
        return {
            name: this.name,
            joints: this.joints.map(joint => {
                const vector = this.instance.getJointLocation(joint.index)
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
                const type = interval.isBar ? "Bar" : "Cable"
                const elastic = elastics[interval.index]
                const elasticString = numberToString(elastic)
                const role = IntervalRole[interval.intervalRole]
                const isBar = interval.isBar
                const outputInterval: IOutputInterval = {
                    joints,
                    type,
                    strainString,
                    elastic,
                    elasticString,
                    isBar,
                    role,
                }
                return outputInterval
            }).sort((a, b) => {
                if (a.isBar && !b.isBar) {
                    return -1
                }
                if (!a.isBar && b.isBar) {
                    return 1
                }
                return a.elastic - b.elastic
            }),
        }
    }

    private timeForPretensing(): boolean {
        if (this.lifePhase !== LifePhase.Pretensing && this.lifePhase !== LifePhase.Gravitizing) {
            return false
        }
        const engine = this.instance.engine
        const pretensingCycles = engine.getAge() - this.pretensingStartAge
        const countdownMax = this.instance.getFeatureValue(FabricFeature.PretensingTicks)
        const complete = pretensingCycles / countdownMax
        const currentStep = Math.floor(complete * PRETENSING_STEPS)
        if (currentStep === this.pretensingStep) {
            return false
        }
        this.pretensingStep = currentStep
        return true
    }

    private takePretensingStep(): void {
        const strains = this.instance.strains
        const elastics = this.instance.elastics
        const intensity = this.instance.getFeatureValue(FabricFeature.PretensingIntensity)
        let barCount = 0
        let cableCount = 0
        let totalBarAdjustment = 0
        let totalCableAdjustment = 0
        this.intervals.forEach(interval => {
            const strain = strains[interval.index]
            const adjustment = strain * intensity
            if (interval.isBar) {
                totalBarAdjustment += adjustment
                barCount++
            } else {
                totalCableAdjustment += adjustment
                cableCount++
            }
        })
        // todo: maybe use median instead of average
        const averageBarAdjustment = totalBarAdjustment / barCount
        const averageCableAdjustment = totalCableAdjustment / cableCount
        this.intervals.forEach(interval => {
            const strain = strains[interval.index]
            const adjustment = strain * intensity - (interval.isBar ? averageBarAdjustment : averageCableAdjustment)
            if (interval.isBar) {
                elastics[interval.index] *= 1 - adjustment
            } else {
                elastics[interval.index] *= 1 + adjustment
            }
        })
    }

    private get engine(): IFabricEngine {
        return this.instance.engine
    }
}
