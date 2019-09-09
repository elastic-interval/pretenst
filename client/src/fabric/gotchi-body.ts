/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Geometry, Matrix4, Vector3 } from "three"

import { Direction, IntervalRole, Laterality, SEED_CORNERS, SEED_RADIUS } from "./fabric-exports"
import { InstanceExports } from "./fabric-kernel"
import { FaceSnapshot, IJointSnapshot } from "./face-snapshot"

const ARROW_LENGTH = 9
const ARROW_WIDTH = 0.6
const ARROW_TIP_LENGTH_FACTOR = 1.3
const ARROW_TIP_WIDTH_FACTOR = 1.5

export const HUNG_ALTITUDE = 10
export const ITERATIONS_PER_TICK = 60

export const INTERVALS_RESERVED = 1
export const SPOT_TO_HANGER = new Vector3(0, HUNG_ALTITUDE, 0)

export class GotchiBody {
    private pointerGeometryStored: Geometry | undefined
    private facesGeometryStored: BufferGeometry | undefined

    constructor(private exports: InstanceExports) {
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
        if (this.pointerGeometryStored) {
            this.pointerGeometryStored.dispose()
            this.pointerGeometryStored = undefined
        }
    }

    public get vectors(): Float32Array {
        return this.exports.getVectors()
    }

    public get midpoint(): Vector3 {
        return this.exports.getMidpoint()
    }

    public get seed(): Vector3 {
        return this.exports.getSeed()
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

    public pointerGeometryFor(direction: Direction): Geometry {
        const geometry = new Geometry()
        const v = () => new Vector3().add(this.seed)
        const arrowFromL = v()
        const arrowFromR = v()
        const arrowToL = v()
        const arrowToR = v()
        const arrowToLx = v()
        const arrowToRx = v()
        const arrowTip = v()
        switch (direction) {
            case Direction.FORWARD:
                arrowToL.addScaledVector(this.right, -ARROW_WIDTH).addScaledVector(this.forward, ARROW_LENGTH)
                arrowToLx.addScaledVector(this.right, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.forward, ARROW_LENGTH)
                arrowFromL.addScaledVector(this.right, -ARROW_WIDTH)
                arrowToR.addScaledVector(this.right, ARROW_WIDTH).addScaledVector(this.forward, ARROW_LENGTH)
                arrowToRx.addScaledVector(this.right, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.forward, ARROW_LENGTH)
                arrowFromR.addScaledVector(this.right, ARROW_WIDTH)
                arrowTip.addScaledVector(this.forward, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
                break
            case Direction.LEFT:
                arrowToL.addScaledVector(this.forward, -ARROW_WIDTH).addScaledVector(this.right, -ARROW_LENGTH)
                arrowToLx.addScaledVector(this.forward, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, -ARROW_LENGTH)
                arrowFromL.addScaledVector(this.forward, -ARROW_WIDTH)
                arrowToR.addScaledVector(this.forward, ARROW_WIDTH).addScaledVector(this.right, -ARROW_LENGTH)
                arrowToRx.addScaledVector(this.forward, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, -ARROW_LENGTH)
                arrowFromR.addScaledVector(this.forward, ARROW_WIDTH)
                arrowTip.addScaledVector(this.right, -ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
                break
            case Direction.RIGHT:
                arrowToL.addScaledVector(this.forward, ARROW_WIDTH).addScaledVector(this.right, ARROW_LENGTH)
                arrowToLx.addScaledVector(this.forward, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, ARROW_LENGTH)
                arrowFromL.addScaledVector(this.forward, ARROW_WIDTH)
                arrowToR.addScaledVector(this.forward, -ARROW_WIDTH).addScaledVector(this.right, ARROW_LENGTH)
                arrowToRx.addScaledVector(this.forward, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, ARROW_LENGTH)
                arrowFromR.addScaledVector(this.forward, -ARROW_WIDTH)
                arrowTip.addScaledVector(this.right, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
                break
            case Direction.REVERSE:
                arrowToL.addScaledVector(this.right, -ARROW_WIDTH).addScaledVector(this.forward, -ARROW_LENGTH)
                arrowToLx.addScaledVector(this.right, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.forward, -ARROW_LENGTH)
                arrowFromL.addScaledVector(this.right, -ARROW_WIDTH)
                arrowToR.addScaledVector(this.right, ARROW_WIDTH).addScaledVector(this.forward, -ARROW_LENGTH)
                arrowToRx.addScaledVector(this.right, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.forward, -ARROW_LENGTH)
                arrowFromR.addScaledVector(this.right, ARROW_WIDTH)
                arrowTip.addScaledVector(this.forward, -ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
                break
        }
        geometry.vertices = [
            arrowFromL, arrowToL, arrowFromR, arrowToR,
            arrowToRx, arrowTip, arrowToLx, arrowTip,
            arrowToRx, arrowToR, arrowToLx, arrowToL,
        ]
        if (this.pointerGeometryStored) {
            this.pointerGeometryStored.dispose()
        }
        this.pointerGeometryStored = geometry
        return geometry
    }

    public createSeed(x: number, z: number, rotation: number): GotchiBody {
        this.exports.reset()
        // prepare
        const locations: Vector3[] = []
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const angle = walk * Math.PI * 2 / SEED_CORNERS
            locations.push(new Vector3(SEED_RADIUS * Math.sin(angle), SEED_RADIUS * Math.cos(angle), 0))
        }
        const leftLoc = new Vector3(0, 0, -SEED_RADIUS)
        const rightLoc = new Vector3(0, 0, SEED_RADIUS)
        locations.push(leftLoc, rightLoc)
        const rotationMatrix = new Matrix4().makeRotationY(Math.PI / 3 * rotation)
        const translationMatrix = new Matrix4().makeTranslation(x, 0, z)
        const transformer = translationMatrix.multiply(rotationMatrix)
        locations.forEach(location => location.applyMatrix4(transformer))
        // build
        const hangerJoint = this.exports.createJoint(this.exports.nextJointTag(), Laterality.BILATERAL_MIDDLE, x, 0, z)
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const where = locations[walk]
            this.exports.createJoint(this.exports.nextJointTag(), Laterality.BILATERAL_MIDDLE, where.x, where.y, where.z)
        }
        const jointPairName = this.exports.nextJointTag()
        const left = this.exports.createJoint(jointPairName, Laterality.BILATERAL_LEFT, leftLoc.x, leftLoc.y, leftLoc.z)
        const right = this.exports.createJoint(jointPairName, Laterality.BILATERAL_RIGHT, rightLoc.x, rightLoc.y, rightLoc.z)
        this.muscle(hangerJoint, left, -1)
        this.muscle(hangerJoint, right, -1)
        this.muscle(left, right, -1)
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.muscle(walk + 1, (walk + 1) % SEED_CORNERS + 1, -1)
            this.muscle(walk + 1, left, -1)
            this.muscle(walk + 1, right, -1)
        }
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.face(left, walk + 1, (walk + 1) % SEED_CORNERS + 1)
            this.face(right, (walk + 1) % SEED_CORNERS + 1, walk + 1)
        }
        this.setAltitude(HUNG_ALTITUDE - SEED_RADIUS)
        this.iterate(0) // output the face geometry, set direction vector, but don't experience time
        return this
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
        this.exports.clear()
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

    public unfold(faceIndex: number, jointNumber: number): FaceSnapshot [] {
        const newJointCount = this.jointCount + 2
        if (newJointCount >= this.exports.getDimensions().jointCountMax) {
            return []
        }
        const apexTag = this.exports.nextJointTag()
        let oppositeFaceIndex = this.exports.findOppositeFaceIndex(faceIndex)
        const freshFaces = this.unfoldFace(this.getFaceSnapshot(faceIndex), jointNumber, apexTag)
        if (oppositeFaceIndex < this.exports.getDimensions().faceCountMax) {
            if (oppositeFaceIndex > faceIndex) {
                oppositeFaceIndex-- // since faceIndex was deleted
            }
            const oppositeFace = this.getFaceSnapshot(oppositeFaceIndex)
            return this.unfoldFace(oppositeFace, jointNumber, apexTag)
        } else {
            return freshFaces
        }
    }

    public getFaceSnapshot(faceIndex: number): FaceSnapshot {
        return new FaceSnapshot(this, this.exports, faceIndex)
    }

    public setIntervalHighLow(intervalIndex: number, direction: Direction, highLow: number): void {
        if (intervalIndex < INTERVALS_RESERVED || intervalIndex >= this.intervalCount) {
            throw new Error(`Bad interval index index ${intervalIndex}`)
        }
        this.exports.setIntervalHighLow(intervalIndex, direction, highLow)
        const oppositeIntervalIndex = this.exports.findOppositeIntervalIndex(intervalIndex)
        if (oppositeIntervalIndex < this.intervalCount) {
            switch (direction) {
                case Direction.FORWARD:
                case Direction.REVERSE:
                    this.exports.setIntervalHighLow(oppositeIntervalIndex, direction, highLow)
                    break
                case Direction.RIGHT:
                case Direction.LEFT:
                    const low = Math.floor(highLow / 16)
                    const high = highLow % 16
                    const lowHigh = low + high * 16
                    this.exports.setIntervalHighLow(oppositeIntervalIndex, direction, lowHigh)
                    break
            }
        }
    }

    // ==========================================================

    private face(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.exports.createFace(joint0Index, joint1Index, joint2Index)
    }

    private muscle(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.MUSCLE, false)
    }

    private growingMuscle(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.MUSCLE, true)
    }

    private unfoldFace(faceToReplace: FaceSnapshot, faceJointIndex: number, apexTag: number): FaceSnapshot [] {
        const jointIndex = faceToReplace.joints.map(faceJoint => faceJoint.jointIndex)
        const sortedJoints = faceToReplace.joints.sort((a: IJointSnapshot, b: IJointSnapshot) => b.tag - a.tag)
        const chosenJoint = sortedJoints[faceJointIndex]
        const apexLocation = new Vector3().add(chosenJoint.location).addScaledVector(faceToReplace.normal, faceToReplace.averageIdealSpan * 0.1)
        const apexIndex = this.exports.createJoint(apexTag, faceToReplace.laterality, apexLocation.x, apexLocation.y, apexLocation.z)
        if (apexIndex >= this.exports.getDimensions().jointCountMax) {
            return []
        }
        sortedJoints.forEach(faceJoint => {
            if (faceJoint.jointNumber !== chosenJoint.jointNumber) {
                const idealSpan = new Vector3().subVectors(faceJoint.location, apexLocation).length()
                this.muscle(faceJoint.jointIndex, apexIndex, idealSpan)
            }
        })
        this.growingMuscle(chosenJoint.jointIndex, apexIndex, faceToReplace.averageIdealSpan)
        const createdFaceIndexes: number[] = []
        sortedJoints.map(joint => joint.jointNumber).forEach((jointNumber: number, index: number) => { // youngest first
            switch (jointNumber) {
                case 0:
                    createdFaceIndexes[index] = this.face(jointIndex[1], jointIndex[2], apexIndex)
                    break
                case 1:
                    createdFaceIndexes[index] = this.face(jointIndex[2], jointIndex[0], apexIndex)
                    break
                case 2:
                    createdFaceIndexes[index] = this.face(jointIndex[0], jointIndex[1], apexIndex)
                    break
            }
        })
        faceToReplace.remove()
        this.exports.clear()
        return createdFaceIndexes
            .map(index => index - 1) // after removal, since we're above
            .map(index => new FaceSnapshot(this, this.exports, index))
    }
}

