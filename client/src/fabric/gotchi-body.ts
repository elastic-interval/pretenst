/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Geometry, Matrix4, Vector3 } from "three"

import { FabricDirection, IFabricEngine, IntervalRole, Laterality, LifePhase } from "./fabric-engine"
import { FabricInstance } from "./fabric-instance"
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

    constructor(private instance: FabricInstance) {
    }

    public get isResting(): boolean {
        return this.currentState === FabricDirection.Rest && this.nextState === FabricDirection.Rest
    }

    public recycle(): void {
        this.disposeOfGeometry()
        this.instance.release()
    }

    public get index(): number {
        return this.instance.index
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

    public get midpoint(): Vector3 {
        return this.instance.getMidpoint()
    }

    public get seed(): Vector3 {
        return new Vector3() // TODO
    }

    public get forward(): Vector3 {
        return new Vector3() // TODO
    }

    public get right(): Vector3 {
        return new Vector3() // TODO
    }

    public get jointCount(): number {
        return this.engine.getJointCount()
    }

    public get intervalCount(): number {
        return this.engine.getIntervalCount()
    }

    public get facesGeometry(): BufferGeometry {
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", new Float32BufferAttribute(this.instance.faceLocations, 3))
        geometry.addAttribute("normal", new Float32BufferAttribute(this.instance.faceNormals, 3))
        if (this.facesGeometryStored) {
            this.facesGeometryStored.dispose()
        }
        this.facesGeometryStored = geometry
        return geometry
    }

    public pointerGeometryFor(state: FabricDirection): Geometry {
        const geometry = new Geometry()
        const v = () => new Vector3().add(this.seed)
        const arrowFromL = v()
        const arrowFromR = v()
        const arrowToL = v()
        const arrowToR = v()
        const arrowToLx = v()
        const arrowToRx = v()
        const arrowTip = v()
        switch (state) {
            case FabricDirection.Forward:
                arrowToL.addScaledVector(this.right, -ARROW_WIDTH).addScaledVector(this.forward, ARROW_LENGTH)
                arrowToLx.addScaledVector(this.right, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.forward, ARROW_LENGTH)
                arrowFromL.addScaledVector(this.right, -ARROW_WIDTH)
                arrowToR.addScaledVector(this.right, ARROW_WIDTH).addScaledVector(this.forward, ARROW_LENGTH)
                arrowToRx.addScaledVector(this.right, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.forward, ARROW_LENGTH)
                arrowFromR.addScaledVector(this.right, ARROW_WIDTH)
                arrowTip.addScaledVector(this.forward, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
                break
            case FabricDirection.TurnLeft:
                arrowToL.addScaledVector(this.forward, -ARROW_WIDTH).addScaledVector(this.right, -ARROW_LENGTH)
                arrowToLx.addScaledVector(this.forward, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, -ARROW_LENGTH)
                arrowFromL.addScaledVector(this.forward, -ARROW_WIDTH)
                arrowToR.addScaledVector(this.forward, ARROW_WIDTH).addScaledVector(this.right, -ARROW_LENGTH)
                arrowToRx.addScaledVector(this.forward, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, -ARROW_LENGTH)
                arrowFromR.addScaledVector(this.forward, ARROW_WIDTH)
                arrowTip.addScaledVector(this.right, -ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
                break
            case FabricDirection.TurnRight:
                arrowToL.addScaledVector(this.forward, ARROW_WIDTH).addScaledVector(this.right, ARROW_LENGTH)
                arrowToLx.addScaledVector(this.forward, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, ARROW_LENGTH)
                arrowFromL.addScaledVector(this.forward, ARROW_WIDTH)
                arrowToR.addScaledVector(this.forward, -ARROW_WIDTH).addScaledVector(this.right, ARROW_LENGTH)
                arrowToRx.addScaledVector(this.forward, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(this.right, ARROW_LENGTH)
                arrowFromR.addScaledVector(this.forward, -ARROW_WIDTH)
                arrowTip.addScaledVector(this.right, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
                break
            case FabricDirection.Reverse:
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
        const SEED_CORNERS = 5 // TODO: get rid of the seed
        const SEED_RADIUS = 2 // TODO: get rid of it
        const engine = this.engine
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
        const hangerJoint = engine.createJoint(engine.nextJointTag(), Laterality.Middle, x, 0, z)
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const where = locations[walk]
            engine.createJoint(engine.nextJointTag(), Laterality.Middle, where.x, where.y, where.z)
        }
        const jointPairName = engine.nextJointTag()
        const left = engine.createJoint(jointPairName, Laterality.LeftSide, leftLoc.x, leftLoc.y, leftLoc.z)
        const right = engine.createJoint(jointPairName, Laterality.RightSide, rightLoc.x, rightLoc.y, rightLoc.z)
        this.muscle(hangerJoint, left)
        this.muscle(hangerJoint, right)
        this.muscle(left, right)
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.muscle(walk + 1, (walk + 1) % SEED_CORNERS + 1)
            this.muscle(walk + 1, left)
            this.muscle(walk + 1, right)
        }
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            this.face(left, walk + 1, (walk + 1) % SEED_CORNERS + 1)
            this.face(right, (walk + 1) % SEED_CORNERS + 1, walk + 1)
        }
        this.setAltitude(HUNG_ALTITUDE - SEED_RADIUS)
        this.iterate(0) // output the face geometry, set direction vector, but don't experience time
        return this
    }

    public get currentState(): FabricDirection {
        return this.engine.getCurrentState()
    }

    public get nextState(): FabricDirection {
        return this.engine.getNextState()
    }

    public set nextState(state: FabricDirection) {
        this.engine.setNextState(state)
    }

    public iterate(ticks: number): boolean {
        return !this.engine.iterate(LifePhase.Busy) // todo
    }

    public get age(): number {
        return this.engine.getAge()
    }

    public setAltitude(altitude: number): number {
        return this.engine.setAltitude(altitude)
    }

    public unfold(faceIndex: number, jointNumber: number): FaceSnapshot [] {
        const apexTag = this.engine.nextJointTag()
        let oppositeFaceIndex = this.engine.findOppositeFaceIndex(faceIndex)
        const freshFaces = this.unfoldFace(this.getFaceSnapshot(faceIndex), jointNumber, apexTag)
        if (oppositeFaceIndex < 1000) { // TODO
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
        return new FaceSnapshot(this, this.instance, faceIndex)
    }

    // ==========================================================

    private face(joint0Index: number, joint1Index: number, joint2Index: number): number {
        return this.engine.createFace(joint0Index, joint1Index, joint2Index)
    }

    private muscle(alphaIndex: number, omegaIndex: number): number { // TODO: no more muscles
        return this.engine.createInterval(alphaIndex, omegaIndex, IntervalRole.ColumnPush, 1, 1, 1, 1)
    }

    private unfoldFace(faceToReplace: FaceSnapshot, faceJointIndex: number, apexTag: number): FaceSnapshot [] {
        const jointIndex = faceToReplace.joints.map(faceJoint => faceJoint.jointIndex)
        const sortedJoints = faceToReplace.joints.sort((a: IJointSnapshot, b: IJointSnapshot) => b.tag - a.tag)
        const chosenJoint = sortedJoints[faceJointIndex]
        const faceToReplaceAverageLength = 1 // TODO
        const apexLocation = new Vector3().add(chosenJoint.location).addScaledVector(faceToReplace.normal, faceToReplaceAverageLength * 0.1)
        const apexIndex = this.engine.createJoint(apexTag, faceToReplace.laterality, apexLocation.x, apexLocation.y, apexLocation.z)
        sortedJoints.forEach(faceJoint => {
            if (faceJoint.jointNumber !== chosenJoint.jointNumber) {
                this.muscle(faceJoint.jointIndex, apexIndex)
            }
        })
        this.muscle(chosenJoint.jointIndex, apexIndex)
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
        this.instance.forgetDimensions()
        return createdFaceIndexes
            .map(index => index - 1) // after removal, since we're above
            .map(index => new FaceSnapshot(this, this.instance, index))
    }

    private get engine(): IFabricEngine {
        return this.instance.engine
    }

}

