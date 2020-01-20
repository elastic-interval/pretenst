/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { IFabricEngine } from "./fabric-engine"
import { FabricInstance } from "./fabric-instance"

export const vectorFromArray = (array: Float32Array, index: number, vector?: Vector3): Vector3 => {
    const offset = index * 3
    if (vector) {
        vector.set(array[offset], array[offset + 1], array[offset + 2])
        return vector
    } else {
        return new Vector3(array[offset], array[offset + 1], array[offset + 2])
    }
}

export const vectorToArray = (vector: Vector3, array: Float32Array, index: number): void => {
    const offset = index * 3
    array[offset] = vector.x
    array[offset + 1] = vector.y
    array[offset + 2] = vector.z
}

export function faceVector(faceIndex: number, array: Float32Array): Vector3 {
    const index = faceIndex * 3
    const a = vectorFromArray(array, index)
    const b = vectorFromArray(array, index + 1)
    const c = vectorFromArray(array, index + 2)
    return new Vector3().add(a).add(b).add(c).multiplyScalar(1.0 / 3.0)
}

export class FabricKernel {
    private instanceArray: FabricInstance[] = []
    private instanceUsed: boolean[] = []
    private arrayBuffer: ArrayBuffer

    constructor(engine: IFabricEngine) {
        const fabricBytes = engine.init()
        this.arrayBuffer = engine.memory.buffer
        const byteLength = this.arrayBuffer.byteLength
        if (byteLength === 0) {
            throw new Error(`Zero byte length! ${fabricBytes}`)
        }
        for (let index = 0; index < engine.getInstanceCount(); index++) {
            this.instanceArray.push(new FabricInstance(
                index,
                this.arrayBuffer,
                toFree => this.instanceUsed[toFree] = false,
                engine,
            ))
            this.instanceUsed.push(false)
        }
    }

    public allocateInstance(): FabricInstance | undefined {
        const freeIndex = this.instanceUsed.indexOf(false)
        if (freeIndex < 0) {
            return undefined
        }
        this.instanceUsed[freeIndex] = true
        return this.instanceArray[freeIndex]
    }
}

