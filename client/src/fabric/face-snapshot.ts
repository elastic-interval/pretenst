/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Laterality } from "./fabric-exports"
import { InstanceExports, vectorFromFloatArray } from "./fabric-kernel"
import { GotchiBody } from "./gotchi-body"

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
        private fabric: GotchiBody,
        private exports: InstanceExports,
        private faceIndex: number,
        private derived?: boolean,
    ) {
        this.jointSnapshots = TRIANGLE
            .map(jointNumber => {
                const jointIndex = exports.getFaceJointIndex(faceIndex, jointNumber)
                const tag = exports.getJointTag(jointIndex)
                const location = vectorFromFloatArray(this.exports.getFaceLocations(), (faceIndex * 3 + jointNumber) * 3)
                return {jointNumber, jointIndex, tag, location} as IJointSnapshot
            })
    }

    public get fresh(): FaceSnapshot {
        // potentially walk back the index, due to deletions since last time
        let faceIndex = this.faceIndex
        if (faceIndex >= this.exports.getFaceCount()) {
            faceIndex = this.exports.getFaceCount() - 1
        }
        while (faceIndex >= 0) {
            const differentJoints = this.joints.filter(jointSnapshot => {
                const currentJointIndex = this.exports.getFaceJointIndex(faceIndex, jointSnapshot.jointNumber)
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
        return new FaceSnapshot(this.fabric, this.exports, faceIndex, true)
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

    public get midpoint(): Vector3 {
        throw new Error()
        // return vectorFromFloatArray(this.exports.getFaceMidpoints(), this.faceIndex * 3)
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
            const jointLaterality = this.exports.getJointLaterality(this.exports.getFaceJointIndex(this.faceIndex, jointWalk))
            if (jointLaterality !== Laterality.Middle) {
                return jointLaterality
            }
        }
        return Laterality.Middle
    }

    public remove(): void {
        // maybe fresh first
        this.exports.removeFace(this.faceIndex)
    }
}
