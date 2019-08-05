/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

import { Direction, IFabricInstanceExports } from "./fabric-exports"
import { Physics } from "./physics"
import {
    brickToString,
    connectBricks,
    connectorToString,
    createBrick,
    growBrick,
    IBrick,
    IBrickConnector,
    IFace,
    Triangle,
} from "./tensegrity-brick"

export class TensegrityFabric {
    private faces: IFace[] = []
    private facesGeometryStored: BufferGeometry | undefined
    private linesGeometryStored: BufferGeometry | undefined

    constructor(private exports: IFabricInstanceExports) {
    }

    public applyPhysics(physics: Physics): object {
        return physics.applyLocal(this.exports)
    }

    public createBrick(): IBrick {
        let brick = createBrick(this.exports)
        this.faces.push(...brick.faces)
        return brick
    }

    public growBrick(existingBrick: IBrick, triangle: Triangle): IBrick {
        let brick = growBrick(this.exports, existingBrick, triangle)
        this.faces.push(...brick.faces)
        return brick
    }

    public connectBricks(brickA: IBrick, triangleA: Triangle, brickB: IBrick, triangleB: Triangle): IBrickConnector {
        return connectBricks(this.exports, brickA, triangleA, brickB, triangleB)
    }

    public brickToString(brick: IBrick): string {
        return brickToString(this.exports, brick)
    }

    public connectorToString(connector: IBrickConnector): string {
        return connectorToString(this.exports, connector)
    }

    public findFace(triangleIndex: number): IFace | undefined {
        console.log("find face", triangleIndex)
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
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", new Float32BufferAttribute(this.exports.getFaceLocations(), 3))
        geometry.addAttribute("normal", new Float32BufferAttribute(this.exports.getFaceNormals(), 3))
        if (this.facesGeometryStored) {
            this.facesGeometryStored.dispose()
        }
        this.facesGeometryStored = geometry
        return geometry
    }

    public get linesGeometry(): BufferGeometry {
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", new Float32BufferAttribute(this.exports.getLineLocations(), 3))
        if (this.linesGeometryStored) {
            this.linesGeometryStored.dispose()
        }
        this.linesGeometryStored = geometry
        return geometry
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
        return this.exports.iterate(ticks)
    }

    public endGestation(): void {
        this.exports.endGestation()
        this.exports.freshGeometry()
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

}

