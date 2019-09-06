/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute } from "three"

import { InstanceExports } from "./fabric-kernel"
import { Physics } from "./physics"
import {
    brickToString,
    connectBricks,
    connectorToString,
    createBrickOnOrigin,
    createBrickOnTriangle,
    IBrick,
    IBrickConnector,
    IFace,
    IInterval,
    Joint,
    Triangle,
} from "./tensegrity-brick"

export enum Selectable {
    NONE,
    JOINT,
    FACE,
    INTERVAL,
    BAR,
    CABLE,
}

export class TensegrityFabric {
    public intervals: IInterval[] = []
    public faces: IFace[] = []

    private _selectable: Selectable = Selectable.NONE
    private _selectedJoint: Joint | undefined
    private _selectedInterval: IInterval | undefined
    private _selectedFace: IFace | undefined
    private faceLocations = new Float32BufferAttribute([], 3)
    private faceNormals = new Float32BufferAttribute([], 3)
    private lineLocations = new Float32BufferAttribute([], 3)
    private lineColors = new Float32BufferAttribute([], 3)
    private facesGeometryStored: BufferGeometry | undefined
    private linesGeometryStored: BufferGeometry | undefined

    constructor(readonly exports: InstanceExports) {
    }

    get selectable(): Selectable {
        return this._selectable
    }

    set selectable(value: Selectable) {
        this.cancelSelection()
        this._selectable = value
    }

    get selectedJoint(): number | undefined {
        return this._selectedJoint
    }

    set selectedJoint(value: number | undefined) {
        this.cancelSelection()
        this._selectedJoint = value
    }

    get selectedInterval(): IInterval | undefined {
        return this._selectedInterval
    }

    set selectedInterval(value: IInterval | undefined) {
        this.cancelSelection()
        this._selectedInterval = value
    }

    get selectedFace(): IFace | undefined {
        return this._selectedFace
    }

    set selectedFace(value: IFace | undefined) {
        this.cancelSelection()
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
        this._selectable = Selectable.NONE
    }

    public applyPhysics(physics: Physics): object {
        return physics.applyLocal(this.exports)
    }

    public createBrick(): IBrick {
        let brick = createBrickOnOrigin(this)
        this.exports.discardGeometry()
        this.disposeOfGeometry()
        this.faces.push(...brick.faces)
        this.intervals.push(...brick.bars, ...brick.cables)
        return brick
    }

    public growBrick(brick: IBrick, triangle: Triangle): IBrick {
        const newBrick = createBrickOnTriangle(this, brick, triangle)
        this.exports.discardGeometry()
        this.disposeOfGeometry()
        this.faces.push(...newBrick.faces)
        this.intervals.push(...newBrick.bars, ...newBrick.cables)
        return newBrick
    }

    public connectBricks(brickA: IBrick, triangleA: Triangle, brickB: IBrick, triangleB: Triangle): IBrickConnector {
        const connector = connectBricks(this, brickA, triangleA, brickB, triangleB)
        this.exports.discardGeometry()
        this.disposeOfGeometry()
        this.intervals.push(...connector.cables)
        connector.facesToRemove.forEach(face => this.removeFace(face, true))
        return connector
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
        this.exports.discardGeometry()
        this.disposeOfGeometry()
    }

    public brickToString(brick: IBrick): string {
        return brickToString(this, brick)
    }

    public connectorToString(connector: IBrickConnector): string {
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
}

