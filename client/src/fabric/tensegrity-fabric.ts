/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

import { IntervalRole, Laterality } from "./fabric-engine"
import { FabricInstance } from "./fabric-kernel"
import { Physics } from "./physics"
import {
    brickToString,
    connectClosestFacePair,
    connectorToString,
    createBrickOnOrigin,
    executeGrowthTrees,
    optimizeFabric,
    parseConstructionCode,
} from "./tensegrity-brick"
import {
    IBrick,
    IConnector,
    IFace,
    IGrowth,
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
    public growth?: IGrowth

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

    constructor(readonly instance: FabricInstance, readonly physics: Physics, readonly name: string, altitude: number) {
        const growth = parseConstructionCode(name)
        growth.growing[0].brick = this.createBrick(altitude)
        this.growth = growth
    }


    public setGestating(countdown: number): void {
        this.instance.setGestating(countdown)
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
        console.log("selected interval", value)
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
        console.log("selected face", value)
        this._selectable = Selectable.NONE
        this._selectedFace = value
    }

    get growthFaces(): IFace[] {
        return this.faces.filter(f => f.canGrow)
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

    public createBrick(altitude: number): IBrick {
        const brick = createBrickOnOrigin(this, altitude)
        this.instance.clear()
        this.disposeOfGeometry()
        return brick
    }

    public removeFace(face: IFace, removeIntervals: boolean): void {
        this.instance.removeFace(face.index)
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
        this.instance.removeInterval(interval.index)
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
        return this.instance.createJoint(jointTag, Laterality.RightSide, location.x, location.y, location.z)
    }

    public createInterval(alpha: IJoint, omega: IJoint, intervalRole: IntervalRole): IInterval {
        const interval = <IInterval>{
            index: this.instance.createInterval(alpha.index, omega.index, intervalRole),
            removed: false,
            intervalRole,
            alpha, omega,
        }
        this.intervals.push(interval)
        return interval
    }

    public createFace(brick: IBrick, triangle: Triangle): IFace {
        const joints = TRIANGLE_ARRAY[triangle].barEnds.map(barEnd => brick.joints[barEnd])
        const cables = [0, 1, 2].map(offset => brick.cables[triangle * 3 + offset])
        const face = <IFace>{
            index: this.instance.createFace(joints[0].index, joints[1].index, joints[2].index),
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
        this.instance.recycle()
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
        return this.instance.getJointCount()
    }

    public get intervalCount(): number {
        return this.instance.getIntervalCount()
    }

    public get faceCount(): number {
        return this.instance.getFaceCount()
    }

    public get facesGeometry(): BufferGeometry {
        if (!this.facesGeometryStored) {
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
        this.disposeOfGeometry()
        const changeHappened = this.instance.iterate(ticks)
        if (!changeHappened) {
            return false
        }
        const growth = this.growth
        if (growth) {
            if (growth.growing.length > 0) {
                growth.growing = executeGrowthTrees(growth.growing)
                this.instance.centralize()
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
                            this.setGestating(3)
                            growth.optimizationStack.push("Connect")
                            break
                        case "Connect":
                            connectClosestFacePair(this)
                            break
                    }
                } else {
                    this.setGestating(1)
                    this.physics.applyLocal(this.instance)
                    this.growth = undefined
                }
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
}

