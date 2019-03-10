import {Vector3} from "three"

import {BILATERAL_MIDDLE, Fabric} from "./fabric"
import {IFabricInstanceExports} from "./fabric-exports"
import {vectorFromFloatArray} from "./fabric-kernel"

export interface IJointSnapshot {
    jointNumber: number
    jointIndex: number
    tag: number
    location: Vector3
}

export const TRIANGLE = [0, 1, 2]

export class FaceSnapshot {

    private jointSnapshots: IJointSnapshot[]

    constructor(
        private fabric: Fabric,
        private exports: IFabricInstanceExports,
        private fabricExports: IFabricInstanceExports,
        private faceIndex: number,
        private derived?: boolean,
    ) {
        this.jointSnapshots = TRIANGLE
            .map(jointNumber => {
                const jointIndex = fabricExports.getFaceJointIndex(faceIndex, jointNumber)
                const tag = fabricExports.getJointTag(jointIndex)
                const location = vectorFromFloatArray(this.exports.getFaceLocations(), (faceIndex * 3 + jointNumber) * 3)
                return {jointNumber, jointIndex, tag, location} as IJointSnapshot
            })
    }

    public get fresh(): FaceSnapshot {
        // potentially walk back the index, due to deletions since last time
        let faceIndex = this.faceIndex
        if (faceIndex >= this.fabricExports.getFaceCount()) {
            faceIndex = this.fabricExports.getFaceCount() - 1
        }
        while (faceIndex >= 0) {
            const differentJoints = this.joints.filter(jointSnapshot => {
                const currentJointIndex = this.fabricExports.getFaceJointIndex(faceIndex, jointSnapshot.jointNumber)
                return currentJointIndex !== jointSnapshot.jointIndex
            })
            if (differentJoints.length === 0) {
                break
            }
            faceIndex--
            if (faceIndex < 0) {
                throw new Error("Face not found!")
            }
        }
        return new FaceSnapshot(this.fabric, this.exports, this.fabricExports, faceIndex, true)
    }

    public get isDerived(): boolean {
        return !!this.derived
    }

    public get index(): number {
        return this.faceIndex
    }

    public get joints(): IJointSnapshot[] {
        return this.jointSnapshots
    }

    public get averageIdealSpan(): number {
        return this.fabricExports.getFaceAverageIdealSpan(this.faceIndex)
    }

    public get midpoint(): Vector3 {
        return vectorFromFloatArray(this.exports.getFaceMidpoints(), this.faceIndex * 3)
    }

    public get normal(): Vector3 {
        return TRIANGLE
            .map(jointNumber => vectorFromFloatArray(
                this.exports.getFaceNormals(),
                (this.faceIndex * 3 + jointNumber) * 3,
            ))
            .reduce((prev, current) => prev.add(current), new Vector3())
            .multiplyScalar(1 / 3.0)
    }

    public get laterality(): number {
        for (let jointWalk = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
            const jointLaterality = this.fabricExports.getJointLaterality(this.fabricExports.getFaceJointIndex(this.faceIndex, jointWalk))
            if (jointLaterality !== BILATERAL_MIDDLE) {
                return jointLaterality
            }
        }
        return BILATERAL_MIDDLE
    }

    public remove(): void {
        // maybe fresh first
        this.fabricExports.removeFace(this.faceIndex)
    }
}
