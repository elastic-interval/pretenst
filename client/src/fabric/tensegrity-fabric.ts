/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

import { IntervalRole, Laterality } from "./fabric-exports"
import { InstanceExports } from "./fabric-kernel"
import { brickToString, connectorToString, createBrickOnOrigin, optimizeFabric } from "./tensegrity-brick"
import {
    IBrick,
    IConnector,
    IFace,
    IInterval,
    IJoint,
    JointTag,
    Triangle,
    TRIANGLE_ARRAY,
} from "./tensegrity-brick-types"

export enum Selectable {
    NONE,
    JOINT,
    INTERVAL,
    FACE,
    GROW_FACE,
}

export class TensegrityFabric {
    public joints: IJoint[] = []
    public intervals: IInterval[] = []
    public faces: IFace[] = []
    public autoRotate = false

    private _selectable: Selectable = Selectable.NONE
    private _selectedJoint: IJoint | undefined
    private _selectedInterval: IInterval | undefined
    private _selectedFace: IFace | undefined
    private faceLocations = new Float32BufferAttribute([], 3)
    private faceNormals = new Float32BufferAttribute([], 3)
    private lineLocations = new Float32BufferAttribute([], 3)
    private lineColors = new Float32BufferAttribute([], 3)
    private facesGeometryStored: BufferGeometry | undefined
    private linesGeometryStored: BufferGeometry | undefined

    constructor(readonly exports: InstanceExports, readonly name: string) {
    }

    get selectable(): Selectable {
        return this._selectable
    }

    set selectable(value: Selectable) {
        if (value !== Selectable.NONE) {
            this.cancelSelection()
            this.autoRotate = false
        }
        this._selectable = value
    }

    get selectedJoint(): IJoint | undefined {
        return this._selectedJoint
    }

    set selectedJoint(value: IJoint | undefined) {
        console.log("selected joint", value)
        this.cancelSelection()
        this._selectable = Selectable.NONE
        this._selectedJoint = value
        if (value) {
            console.log("joint", value)
        }
    }

    get selectedInterval(): IInterval | undefined {
        return this._selectedInterval
    }

    set selectedInterval(value: IInterval | undefined) {
        this.cancelSelection()
        this._selectable = Selectable.NONE
        this._selectedInterval = value
        if (value) {
            console.log("interval", value)
        }
    }

    get selectedFace(): IFace | undefined {
        return this._selectedFace
    }

    set selectedFace(value: IFace | undefined) {
        this.cancelSelection()
        this._selectable = Selectable.NONE
        this._selectedFace = value
    }

    get selectionActive(): boolean {
        return this._selectable !== Selectable.NONE ||
            this._selectedFace !== undefined || this._selectedJoint !== undefined || this._selectedInterval !== undefined
    }

    public cancelSelection(): void {
        this._selectedJoint = undefined
        this._selectedInterval = undefined
        this._selectedFace = undefined
    }

    public createBrick(): IBrick {
        const brick = createBrickOnOrigin(this)
        this.exports.clear()
        this.disposeOfGeometry()
        return brick
    }

    public removeFace(face: IFace, removeIntervals: boolean): void {
        this.exports.removeFace(face.index)
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
        this.exports.removeInterval(interval.index)
        interval.removed = true
        this.intervals = this.intervals.filter(existing => existing.index !== interval.index)
        this.intervals.forEach(existing => {
            if (existing.index > interval.index) {
                existing.index--
            }
        })
        this.exports.clear()
        this.disposeOfGeometry()
    }

    public optimize(highCross: boolean): void {
        optimizeFabric(this, highCross)
    }

    public createJointIndex(jointTag: JointTag, location: Vector3): number {
        return this.exports.createJoint(jointTag, Laterality.RightSide, location.x, location.y, location.z)
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole, span: number): IInterval {
        const interval = <IInterval>{
            index: this.exports.createInterval(alpha.index, omega.index, span, intervalRole, true),
            removed: false,
            intervalRole,
            alpha, omega, span,
        }
        this.intervals.push(interval)
        return interval
    }

    public createFace(brick: IBrick, triangle: Triangle): IFace {
        const joints = TRIANGLE_ARRAY[triangle].barEnds.map(barEnd => brick.joints[barEnd])
        const cables = [0, 1, 2].map(offset => brick.cables[triangle * 3 + offset])
        const face = <IFace>{
            index: this.exports.createFace(joints[0].index, joints[1].index, joints[2].index),
            canGrow: true,
            brick,
            triangle,
            joints,
            cables,
        }
        this.faces.push(face)
        return face
    }

    public brickToString(brick: IBrick): string {
        return brickToString(this, brick)
    }

    public connectorToString(connector: IConnector): string {
        return connectorToString(this, connector)
    }

    public recycle(): void {
        this.disposeOfGeometry()
        this.exports.recycle()
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

    public get jointCount(): number {
        return this.exports.getJointCount()
    }

    public get intervalCount(): number {
        return this.exports.getIntervalCount()
    }

    public get faceCount(): number {
        return this.exports.getFaceCount()
    }

    public get facesGeometry(): BufferGeometry {
        if (!this.facesGeometryStored) {
            const geometry = new BufferGeometry()
            this.faceLocations = new Float32BufferAttribute(this.exports.getFaceLocations(), 3)
            this.faceNormals = new Float32BufferAttribute(this.exports.getFaceNormals(), 3)
            geometry.addAttribute("position", this.faceLocations)
            geometry.addAttribute("normal", this.faceNormals)
            this.facesGeometryStored = geometry
        }
        return this.facesGeometryStored
    }

    public get linesGeometry(): BufferGeometry {
        if (!this.linesGeometryStored) {
            const geometry = new BufferGeometry()
            this.lineLocations = new Float32BufferAttribute(this.exports.getLineLocations(), 3)
            this.lineColors = new Float32BufferAttribute(this.exports.getLineColors(), 3)
            geometry.addAttribute("position", this.lineLocations)
            geometry.addAttribute("color", this.lineColors)
            this.linesGeometryStored = geometry
        }
        return this.linesGeometryStored
    }

    public iterate(ticks: number): boolean {
        this.disposeOfGeometry()
        return this.exports.iterate(ticks)
    }

    public findInterval(joint1: IJoint, joint2: IJoint): IInterval | undefined {
        return this.intervals.find(interval => (
            (interval.alpha.index === joint1.index && interval.omega.index === joint2.index) ||
            (interval.alpha.index === joint2.index && interval.omega.index === joint1.index)
        ))
    }
}

