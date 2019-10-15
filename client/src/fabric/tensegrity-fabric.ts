/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from "three"

import { FabricState, IFabricEngine, IntervalRole, Laterality } from "./fabric-engine"
import { FabricInstance, JOINT_RADIUS } from "./fabric-instance"
import { IFeature } from "./features"
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
    intervalSplitter, IPercent,
    JointTag, percentOrHundred,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "./tensegrity-brick-types"

export interface IFabricOutput {
    name: string
    joints: {
        index: string,
        x: string,
        y: string,
        z: string,
    }[]
    intervals: {
        joints: string,
        type: string,
        strain: number,
        elastic: number,
    }[]
}

export const CONSTRUCTION_PRETENST = 0.2
export const SPHERE_RADIUS = 0.35
export const SPHERE = new SphereGeometry(SPHERE_RADIUS, 8, 8)

export class TensegrityFabric {
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public splitIntervals?: IIntervalSplit
    public faces: IFace[] = []
    public growth?: IGrowth

    private pretenst: number
    private faceLocations = new Float32BufferAttribute([], 3)
    private faceNormals = new Float32BufferAttribute([], 3)
    private lineLocations = new Float32BufferAttribute([], 3)
    private lineColors = new Float32BufferAttribute([], 3)
    private facesGeometryStored: BufferGeometry | undefined
    private linesGeometryStored: BufferGeometry | undefined

    constructor(public readonly instance: FabricInstance, public readonly roleFeatures: IFeature[], public readonly name: string) {
    }

    public startConstruction(codeTree: ICodeTree, pretenst: number): void {
        this.pretenst = pretenst
        this.reset(CONSTRUCTION_PRETENST)
        const brick = this.createBrick()
        const executing: IActiveCode = {codeTree, brick}
        this.growth = {growing: [executing], optimizationStack: []}
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

    public createBrick(scale?: IPercent): IBrick {
        const brick = createBrickOnOrigin(this, percentOrHundred(scale))
        this.instance.clear()
        this.disposeOfGeometry()
        return brick
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
        this.instance.clear()
        this.disposeOfGeometry()
    }

    public optimize(highCross: boolean): void {
        optimizeFabric(this, highCross)
    }

    public createJointIndex(jointTag: JointTag, location: Vector3): number {
        return this.engine.createJoint(jointTag, Laterality.RightSide, location.x, location.y, location.z)
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, restLength: number): IInterval {
        const index = this.engine.createInterval(
            alpha.index, omega.index,
            intervalRole, restLength,
        )
        const interval = <IInterval>{
            index,
            intervalRole,
            alpha, omega,
            removed: false,
            isBar: intervalRole === IntervalRole.Bar,
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

    public reset(pretenst: number): void {
        this.joints = []
        this.intervals = []
        this.faces = []
        this.disposeOfGeometry()
        this.engine.initInstance(pretenst)
    }

    public disposeOfGeometry(): void {
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
            .filter(joint => this.instance.getJointLocation(joint.index).y < JOINT_RADIUS)
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
        this.disposeOfGeometry()
        if (busy) {
            return busy
        }
        const growth = this.growth
        if (!growth) {
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
                        engine.extendBusyCountdown(3)
                        break
                    case "H":
                        optimizeFabric(this, true)
                        engine.extendBusyCountdown(2)
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
                engine.setPretenst(this.pretenst)
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
        const numberToString = (n: number) => n.toFixed(5).replace(".", ",")
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
                const deltaLength = this.instance.getIntervalStrain(interval.index)
                const restLength = this.engine.getIntervalStateLength(interval.index, FabricState.Rest)
                return {
                    joints: `${interval.alpha.index + 1},${interval.omega.index + 1}`,
                    type: IntervalRole[interval.intervalRole],
                    strain: deltaLength / restLength,
                    elastic: this.engine.getElasticFactor(interval.index),
                }
            }),
        }
    }

    private get engine(): IFabricEngine {
        return this.instance.engine
    }
}
