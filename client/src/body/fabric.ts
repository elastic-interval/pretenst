import {BufferGeometry, Float32BufferAttribute, Geometry, Vector3} from 'three'

import {Direction, IFabricExports, SEED_CORNERS} from './fabric-exports'
import {FabricKernel, vectorFromFloatArray} from './fabric-kernel'
import {FaceSnapshot, IJointSnapshot} from './face-snapshot'

export const BILATERAL_MIDDLE = 0
export const BILATERAL_RIGHT = 1
export const BILATERAL_LEFT = 2
export const HUNG_ALTITUDE = 7
export const NORMAL_TICKS = 50

export const INTERVALS_RESERVED = 1
export const SPOT_TO_HANGER = new Vector3(0, HUNG_ALTITUDE, 0)

const ARROW_LENGTH = 9
const ARROW_WIDTH = 1
const ARROW_TIP_LENGTH_FACTOR = 1.3
const ARROW_TIP_WIDTH_FACTOR = 1.5

export class Fabric {
    private kernel: FabricKernel
    private intervalCountMax: number
    private faceCountMax: number
    private pointerGeometryStored: Geometry | undefined
    private facesGeometryStored: BufferGeometry | undefined

    constructor(private fabricExports: IFabricExports, public jointCountMax: number) {
        this.intervalCountMax = jointCountMax * 3 + 30
        this.faceCountMax = jointCountMax * 2 + 20
        this.kernel = new FabricKernel(fabricExports, this.jointCountMax, this.intervalCountMax, this.faceCountMax)
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
        return this.kernel.vectors
    }

    public get midpoint(): Vector3 {
        return this.kernel.midpoint
    }

    public get seed(): Vector3 {
        return this.kernel.seed
    }

    public get forward(): Vector3 {
        return this.kernel.forward
    }

    public get right(): Vector3 {
        return this.kernel.right
    }

    public get jointCount() {
        return this.fabricExports.joints()
    }

    public get intervalCount() {
        return this.fabricExports.intervals()
    }

    public get faceCount() {
        return this.fabricExports.faces()
    }

    public getFaceHighlightGeometries(faceIndex: number): Geometry[] {
        const createGeometry = (index: number) => {
            const face = this.getFaceSnapshot(index)
            const apexHeight = face.averageIdealSpan * Math.sqrt(2 / 3)
            const apex = new Vector3().add(face.midpoint).addScaledVector(face.normal, apexHeight)
            const faceOffset = face.index * 3
            const faceLocations = this.kernel.faceLocations
            const geometry = new Geometry()
            geometry.vertices = [
                vectorFromFloatArray(faceLocations, faceOffset * 3), apex,
                vectorFromFloatArray(faceLocations, (faceOffset + 1) * 3), apex,
                vectorFromFloatArray(faceLocations, (faceOffset + 2) * 3), apex,
            ]
            return geometry
        }
        const geometries: Geometry[] = []
        geometries.push(createGeometry(faceIndex))
        const oppositeFaceIndex = this.fabricExports.findOppositeFaceIndex(faceIndex)
        if (oppositeFaceIndex < this.fabricExports.faces()) {
            geometries.push(createGeometry(oppositeFaceIndex))
        }
        return geometries
    }

    public get facesGeometry(): BufferGeometry {
        const geometry = new BufferGeometry()
        geometry.addAttribute('position', new Float32BufferAttribute(this.kernel.faceLocations, 3))
        geometry.addAttribute('normal', new Float32BufferAttribute(this.kernel.faceNormals, 3))
        if (this.facesGeometryStored) {
            this.facesGeometryStored.dispose()
        }
        this.facesGeometryStored = geometry
        return geometry
    }

    public pointerGeometryFor(direction: Direction): Geometry {
        const geometry = new Geometry()
        const vector = () => new Vector3().add(this.seed)
        const arrowFromL = vector()
        const arrowFromR = vector()
        const arrowToL = vector()
        const arrowToR = vector()
        const arrowToLx = vector()
        const arrowToRx = vector()
        const arrowTip = vector()
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

    public createSeed(x: number, y: number): void {
        const hanger = new Vector3(x, 0, y)
        const hangerJoint = this.fabricExports.createJoint(this.fabricExports.nextJointTag(), BILATERAL_MIDDLE, hanger.x, hanger.y, hanger.z)
        const R = 1
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const angle = walk * Math.PI * 2 / SEED_CORNERS
            this.fabricExports.createJoint(
                this.fabricExports.nextJointTag(),
                BILATERAL_MIDDLE,
                R * Math.sin(angle) + hanger.x,
                R * Math.cos(angle) + hanger.y,
                hanger.z)
        }
        const jointPairName = this.fabricExports.nextJointTag()
        const left = this.fabricExports.createJoint(jointPairName, BILATERAL_LEFT, hanger.x, hanger.y, hanger.z - R)
        const right = this.fabricExports.createJoint(jointPairName, BILATERAL_RIGHT, hanger.x, hanger.y, hanger.z + R)
        this.interval(hangerJoint, left, -1)
        this.interval(hangerJoint, right, -1)
        this.interval(left, right, -1)
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.interval(walk + 1, (walk + 1) % SEED_CORNERS + 1, -1)
            this.interval(walk + 1, left, -1)
            this.interval(walk + 1, right, -1)
        }
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.face(left, walk + 1, (walk + 1) % SEED_CORNERS + 1)
            this.face(right, (walk + 1) % SEED_CORNERS + 1, walk + 1)
        }
        hanger.y += this.setAltitude(HUNG_ALTITUDE)
    }

    public get direction(): Direction {
        return this.fabricExports.getDirection()
    }

    public set direction(direction: Direction) {
        this.fabricExports.setDirection(direction)
    }

    public iterate(ticks: number): boolean {
        return this.fabricExports.iterate(ticks)
    }

    public endGestation(): void {
        this.fabricExports.endGestation()
        this.kernel.refresh()
    }

    public get age(): number {
        return this.fabricExports.age()
    }

    public get isGestating(): boolean {
        return this.fabricExports.isGestating()
    }

    public centralize(): void {
        this.fabricExports.centralize()
    }

    public setAltitude(altitude: number): number {
        return this.fabricExports.setAltitude(altitude)
    }

    public unfold(faceIndex: number, jointNumber: number): FaceSnapshot [] {
        const newJointCount = this.jointCount + 2
        if (newJointCount >= this.jointCountMax) {
            return []
        }
        const apexTag = this.fabricExports.nextJointTag()
        let oppositeFaceIndex = this.fabricExports.findOppositeFaceIndex(faceIndex)
        const freshFaces = this.unfoldFace(this.getFaceSnapshot(faceIndex), jointNumber, apexTag)
        if (oppositeFaceIndex < this.kernel.faceCountMax) {
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
        return new FaceSnapshot(this, this.kernel, this.fabricExports, faceIndex)
    }

    public setIntervalHighLow(intervalIndex: number, direction: Direction, highLow: number): void {
        if (intervalIndex < INTERVALS_RESERVED || intervalIndex >= this.intervalCount) {
            throw new Error(`Bad interval index index ${intervalIndex}`)
        }
        this.fabricExports.setIntervalHighLow(intervalIndex, direction, highLow)
        switch (direction) {
            case Direction.FORWARD:
            case Direction.REVERSE:
                const oppositeIntervalIndex = this.fabricExports.findOppositeIntervalIndex(intervalIndex)
                if (oppositeIntervalIndex < this.intervalCount) {
                    this.fabricExports.setIntervalHighLow(oppositeIntervalIndex, direction, highLow)
                }
                break
            case Direction.RIGHT:
            case Direction.LEFT:
                // todo: make opposite opposite?
                break
        }
    }

    public toString(): string {
        return `${(this.kernel.blockBytes / 1024).toFixed(1)}k =becomes=> ${this.kernel.bufferBytes / 65536} block(s)`
    }

    // ==========================================================

    private face(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.fabricExports.createFace(joint0Index, joint1Index, joint2Index)
    }

    private interval(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fabricExports.createInterval(alphaIndex, omegaIndex, span, false)
    }

    private intervalGrowth(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fabricExports.createInterval(alphaIndex, omegaIndex, span, true)
    }

    private unfoldFace(faceToReplace: FaceSnapshot, faceJointIndex: number, apexTag: number): FaceSnapshot [] {
        const jointIndex = faceToReplace.joints.map(faceJoint => faceJoint.jointIndex)
        const sortedJoints = faceToReplace.joints.sort((a: IJointSnapshot, b: IJointSnapshot) => b.tag - a.tag)
        const chosenJoint = sortedJoints[faceJointIndex]
        const apexLocation = new Vector3().add(chosenJoint.location).addScaledVector(faceToReplace.normal, faceToReplace.averageIdealSpan * 0.1)
        const apexIndex = this.fabricExports.createJoint(apexTag, faceToReplace.laterality, apexLocation.x, apexLocation.y, apexLocation.z)
        if (apexIndex >= this.jointCountMax) {
            return []
        }
        sortedJoints.forEach(faceJoint => {
            if (faceJoint.jointNumber !== chosenJoint.jointNumber) {
                const idealSpan = new Vector3().subVectors(faceJoint.location, apexLocation).length()
                this.interval(faceJoint.jointIndex, apexIndex, idealSpan)
            }
        })
        this.intervalGrowth(chosenJoint.jointIndex, apexIndex, faceToReplace.averageIdealSpan)
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
        this.kernel.refresh()
        return createdFaceIndexes
            .map(index => index - 1) // after removal, since we're above
            .map(index => new FaceSnapshot(this, this.kernel, this.fabricExports, index))
    }
}

