/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Genome } from "../genetics/genome"
import { Gotchi, IGotchiFactory } from "../gotchi/gotchi"
import { Hexalot } from "../island/hexalot"
import { HEXALOT_SHAPE } from "../island/island-logic"

import { IFabricDimensions, IFabricEngine } from "./fabric-engine"
import { FabricInstance } from "./fabric-instance"
import { IFeature } from "./features"
import { GotchiBody } from "./gotchi-body"
import { TensegrityFabric } from "./tensegrity-fabric"

const FLOATS_IN_VECTOR = 3
const VECTORS_FOR_FACE = 3
const HEXALOT_BITS = 128
const SPOT_CENTERS_FLOATS = HEXALOT_BITS * FLOATS_IN_VECTOR
const SPOT_CENTERS_SIZE = SPOT_CENTERS_FLOATS * Float32Array.BYTES_PER_ELEMENT
const HEXALOT_SIZE = SPOT_CENTERS_SIZE + HEXALOT_BITS

export const vectorFromFloatArray = (array: Float32Array, index: number, vector?: Vector3): Vector3 => {
    if (vector) {
        vector.set(array[index], array[index + 1], array[index + 2])
        return vector
    } else {
        return new Vector3(array[index], array[index + 1], array[index + 2])
    }
}

export interface IOffsets {
    _vectors: number
    _lineLocations: number
    _lineColors: number
    _faceMidpoints: number
    _faceNormals: number
    _faceLocations: number
    _jointLocations: number
    _intervalUnits: number
    _intervalDisplacements: number
}

function createOffsets(jointCountMax: number, intervalCountMax: number, faceCountMax: number, baseOffset: number): IOffsets {
    const offsets: IOffsets = {
        _vectors: 0,
        _lineLocations: 0,
        _lineColors: 0,
        _faceMidpoints: 0,
        _faceNormals: 0,
        _faceLocations: 0,
        _jointLocations: 0,
        _intervalUnits: 0,
        _intervalDisplacements: 0,
    }
    // sizes
    const seedVectorFloats = 4 * FLOATS_IN_VECTOR
    const faceVectorFloats = faceCountMax * FLOATS_IN_VECTOR
    const faceJointFloats = faceVectorFloats * VECTORS_FOR_FACE
    const faceLocationFloats = faceVectorFloats * VECTORS_FOR_FACE
    const jointLocationFloats = jointCountMax * FLOATS_IN_VECTOR
    const intervalUnitFloats = intervalCountMax * FLOATS_IN_VECTOR
    const lineFloats = intervalCountMax * FLOATS_IN_VECTOR * 2
    offsets._vectors = baseOffset
    offsets._lineColors = offsets._vectors + seedVectorFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._lineLocations = offsets._lineColors + lineFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._faceMidpoints = offsets._lineLocations + lineFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._faceNormals = offsets._faceMidpoints + faceVectorFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._faceLocations = offsets._faceNormals + faceJointFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._jointLocations = offsets._faceLocations + faceLocationFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._intervalUnits = offsets._jointLocations + jointLocationFloats * Float32Array.BYTES_PER_ELEMENT
    offsets._intervalDisplacements = offsets._intervalUnits + intervalUnitFloats * Float32Array.BYTES_PER_ELEMENT
    return offsets
}

export class FabricKernel implements IGotchiFactory {
    private instanceArray: FabricInstance[] = []
    private instanceUsed: boolean[] = []
    private arrayBuffer: ArrayBuffer
    private spotCenters: Float32Array
    private hexalotBits: Int8Array

    constructor(private engine: IFabricEngine, private roleFeatures: IFeature[], dimensions: IFabricDimensions) {
        const fabricBytes = engine.init(dimensions.jointCountMax, dimensions.intervalCountMax, dimensions.faceCountMax, dimensions.instanceMax)
        this.arrayBuffer = engine.memory.buffer
        this.spotCenters = new Float32Array(this.arrayBuffer, 0, SPOT_CENTERS_FLOATS)
        this.hexalotBits = new Int8Array(this.arrayBuffer, SPOT_CENTERS_SIZE, HEXALOT_BITS)
        const byteLength = this.arrayBuffer.byteLength
        if (byteLength === 0) {
            throw new Error(`Zero byte length! ${fabricBytes}`)
        }
        for (let index = 0; index < dimensions.instanceMax; index++) {
            this.instanceArray.push(new FabricInstance(
                this.arrayBuffer,
                createOffsets(dimensions.jointCountMax, dimensions.intervalCountMax, dimensions.faceCountMax, HEXALOT_SIZE + index * fabricBytes),
                dimensions,
                index,
                toFree => this.instanceUsed[toFree] = false,
                engine,
            ))
            this.instanceUsed.push(false)
        }
    }

    public createTensegrityFabric(name: string): TensegrityFabric | undefined {
        const newInstance = this.allocateInstance()
        if (!newInstance) {
            return undefined
        }
        return new TensegrityFabric(newInstance, this.roleFeatures, name)
    }

    public createGotchiSeed(home: Hexalot, rotation: number, genome: Genome): Gotchi | undefined {
        const newInstance = this.allocateInstance()
        if (!newInstance) {
            return undefined
        }
        const fabric = new GotchiBody(newInstance).createSeed(home.center.x, home.center.z, rotation)
        return new Gotchi(home, fabric, genome, this)
    }

    public copyLiveGotchi(gotchi: Gotchi, genome: Genome): Gotchi | undefined {
        const newInstance = this.allocateInstance()
        if (!newInstance) {
            return undefined
        }
        this.engine.cloneInstance(gotchi.body.index, newInstance.index)
        const fabric = new GotchiBody(newInstance)
        return new Gotchi(gotchi.home, fabric, genome, this)
    }

    public setHexalot(spotCenters: Vector3[], surface: boolean[]): void {
        if (spotCenters.length !== HEXALOT_SHAPE.length || surface.length !== HEXALOT_SHAPE.length) {
            throw new Error("Size problem")
        }
        spotCenters.forEach((center, index) => {
            this.spotCenters[index * FLOATS_IN_VECTOR] = center.x
            this.spotCenters[index * FLOATS_IN_VECTOR + 1] = center.y
            this.spotCenters[index * FLOATS_IN_VECTOR + 2] = center.z
        })
        surface.forEach((land, index) => {
            this.hexalotBits[index] = land ? 1 : 0
        })
    }

    // ==============================================================

    private allocateInstance(): FabricInstance | undefined {
        const freeIndex = this.instanceUsed.indexOf(false)
        if (freeIndex < 0) {
            return undefined
        }
        this.instanceUsed[freeIndex] = true
        this.instanceArray[freeIndex].clear()
        this.instanceArray[freeIndex].engine.reset()
        return this.instanceArray[freeIndex]
    }
}

