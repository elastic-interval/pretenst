/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

import { Direction, IFabricInstanceExports, IntervalRole, Laterality } from "./fabric-exports"
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

export class TensegrityFabric {
    private faces: IFace[] = []
    private intervals: IInterval[] = []
    private faceLocations = new Float32BufferAttribute([], 3)
    private faceNormals = new Float32BufferAttribute([], 3)
    private lineLocations = new Float32BufferAttribute([], 3)
    private lineColors = new Float32BufferAttribute([], 3)
    private facesGeometryStored: BufferGeometry | undefined
    private linesGeometryStored: BufferGeometry | undefined

    constructor(readonly exports: IFabricInstanceExports) {
    }

    public applyPhysics(physics: Physics): object {
        return physics.applyLocal(this.exports)
    }

    public createBrick(): IBrick {
        let brick = createBrickOnOrigin(this)
        this.exports.discardGeometry()
        this.disposeOfGeometry()
        this.faces.push(...brick.faces)
        this.intervals.push(...brick.cables)
        return brick
    }

    public growBrick(brick: IBrick, triangle: Triangle): IBrick {
        const newBrick = createBrickOnTriangle(this, brick, triangle)
        this.exports.discardGeometry()
        this.disposeOfGeometry()
        this.faces.push(...newBrick.faces)
        this.intervals.push(...newBrick.cables)
        return newBrick
    }

    public connectBricks(brickA: IBrick, triangleA: Triangle, brickB: IBrick, triangleB: Triangle): IBrickConnector {
        let connector = connectBricks(this, brickA, triangleA, brickB, triangleB)
        this.exports.discardGeometry()
        this.disposeOfGeometry()
        this.intervals.push(...connector.ringCables, ...connector.crossCables)
        return connector
    }

    public removeFace(face: IFace): void {
        this.exports.removeFace(face.index)
        this.faces = this.faces.filter(existing => existing.index !== face.index)
        this.faces.forEach(existing => {
            if (existing.index > face.index) {
                existing.index--
            }
        })
        face.cables.forEach(interval => {
            this.removeInterval(interval)
        })
    }

    public removeInterval(interval: IInterval): void {
        this.exports.removeInterval(interval.index)
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

    public findFace(triangleIndex: number): IFace | undefined {
        return this.faces[triangleIndex]
    }

    public get isResting(): boolean {
        return this.currentDirection === Direction.REST && this.nextDirection === Direction.REST
    }

    public recycle(): void {
        this.disposeOfGeometry()
        this.exports.recycle()
    }

    public get index(): number {
        return this.exports.index
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

    public get vectors(): Float32Array {
        return this.exports.getVectors()
    }

    public get midpoint(): Vector3 {
        return this.exports.getMidpoint()
    }

    public get forward(): Vector3 {
        return this.exports.getForward()
    }

    public get right(): Vector3 {
        return this.exports.getRight()
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

    public get currentDirection(): Direction {
        return this.exports.getCurrentDirection()
    }

    public get nextDirection(): Direction {
        return this.exports.getNextDirection()
    }

    public set nextDirection(direction: Direction) {
        this.exports.setNextDirection(direction)
    }

    public iterate(ticks: number): boolean {
        this.disposeOfGeometry()
        return this.exports.iterate(ticks)
    }

    public endGestation(): void {
        this.exports.endGestation()
        this.exports.discardGeometry()
    }

    public get age(): number {
        return this.exports.getAge()
    }

    public get isGestating(): boolean {
        return this.exports.isGestating()
    }

    public centralize(): void {
        this.exports.centralize()
    }

    public setAltitude(altitude: number): number {
        return this.exports.setAltitude(altitude)
    }

    // ===

    public getJointLocation(joint: Joint): Vector3 {
        return this.exports.getJointLocation(joint)
    }

    public createJoint(jointTag: number, laterality: Laterality, x: number, y: number, z: number): number {
        return this.exports.createJoint(jointTag, laterality, x, y, z)
    }

    public createInterval(alphaIndex: number, omegaIndex: number, idealSpan: number, intervalRole: IntervalRole, growing: boolean): number {
        return this.exports.createInterval(alphaIndex, omegaIndex, idealSpan, intervalRole, growing)
    }

    public createFace(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.exports.createFace(joint0Index, joint1Index, joint2Index)
    }
}

