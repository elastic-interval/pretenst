/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { IFabricEngine, Laterality } from "./fabric-engine"
import { FabricInstance } from "./fabric-instance"
import { vectorFromFloatArray } from "./fabric-kernel"
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
        private instance: FabricInstance,
        private faceIndex: number,
        private derived?: boolean,
    ) {
        this.jointSnapshots = TRIANGLE
            .map(jointNumber => {
                const engine = this.engine
                const jointIndex = engine.getFaceJointIndex(faceIndex, jointNumber)
                const tag = engine.getJointTag(jointIndex)
                const location = vectorFromFloatArray(this.instance.faceLocations, (faceIndex * 3 + jointNumber) * 3)
                return {jointNumber, jointIndex, tag, location} as IJointSnapshot
            })
    }

    public get fresh(): FaceSnapshot {
        // potentially walk back the index, due to deletions since last time
        const engine = this.engine
        let faceIndex = this.faceIndex
        if (faceIndex >= engine.getFaceCount()) {
            faceIndex = engine.getFaceCount() - 1
        }
        while (faceIndex >= 0) {
            const differentJoints = this.joints.filter(jointSnapshot => {
                const currentJointIndex = engine.getFaceJointIndex(faceIndex, jointSnapshot.jointNumber)
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
        return new FaceSnapshot(this.fabric, this.instance, faceIndex, true)
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
        // return vectorFromFloatArray(this.instance.getFaceMidpoints(), this.faceIndex * 3)
    }

    public get normal(): Vector3 {
        return TRIANGLE
            .map(jointNumber => vectorFromFloatArray(
                this.instance.faceNormals,
                (this.faceIndex * 3 + jointNumber) * 3,
            ))
            .reduce((prev, current) => prev.add(current), new Vector3())
            .multiplyScalar(1 / 3.0)
    }

    public get laterality(): number {
        const engine = this.engine
        for (let jointWalk = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
            const jointLaterality = engine.getJointLaterality(engine.getFaceJointIndex(this.faceIndex, jointWalk))
            if (jointLaterality !== Laterality.Middle) {
                return jointLaterality
            }
        }
        return Laterality.Middle
    }

    public remove(): void {
        // maybe fresh first
        this.engine.removeFace(this.faceIndex)
    }

    private get engine(): IFabricEngine {
        return this.instance.engine
    }
}
