/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, FabricFeature, View, World } from "eig"
import { Matrix4, Vector3 } from "three"

import { FloatFeature } from "./fabric-features"

const vectorFromArray = (array: Float32Array, index: number, vector?: Vector3): Vector3 => {
    const offset = index * 3
    if (vector) {
        vector.set(array[offset], array[offset + 1], array[offset + 2])
        return vector
    } else {
        return new Vector3(array[offset], array[offset + 1], array[offset + 2])
    }
}

function faceVector(faceIndex: number, array: Float32Array): Vector3 {
    const index = faceIndex * 3
    const a = vectorFromArray(array, index)
    const b = vectorFromArray(array, index + 1)
    const c = vectorFromArray(array, index + 2)
    return new Vector3().add(a).add(b).add(c).multiplyScalar(1.0 / 3.0)
}

function floatArray(copyFunction: (array: Float32Array) => void, length: () => number): Float32Array {
    const array = new Float32Array(length())
    copyFunction(array)
    return array
}

export class FabricInstance {
    public lineColors: Float32Array
    public lineLocations: Float32Array
    public faceNormals: Float32Array
    public faceLocations: Float32Array
    public jointLocations: Float32Array
    public jointVelocities: Float32Array
    public unitVectors: Float32Array
    public strains: Float32Array
    public strainNuances: Float32Array
    public stiffnesses: Float32Array
    public linearDensities: Float32Array

    constructor(
        public readonly world: World,
        public readonly view: View,
        public readonly fabric: Fabric,
    ) {
        this.lineColors = floatArray(
            array => this.view.copy_line_colors_to(array),
            () => fabric.get_interval_count() * 3 * 2,
        )
        this.lineLocations = floatArray(
            array => this.view.copy_line_locations_to(array),
            () => fabric.get_interval_count() * 3 * 2,
        )
        this.faceNormals = floatArray(
            array => this.view.copy_face_normals_to(array),
            () => fabric.get_face_count() * 3 * 3,
        )
        this.faceLocations = floatArray(
            array => this.view.copy_face_vertex_locations_to(array),
            () => fabric.get_face_count() * 3 * 3,
        )
        this.jointLocations = floatArray(
            array => this.view.copy_joint_locations_to(array),
            () => fabric.get_joint_count() * 3,
        )
        this.jointVelocities = floatArray(
            array => this.view.copy_joint_velocities_to(array),
            () => fabric.get_joint_count() * 3,
        )
        this.unitVectors = floatArray(
            array => this.view.copy_unit_vectors_to(array),
            () => fabric.get_interval_count() * 3,
        )
        this.strains = floatArray(
            array => this.view.copy_strains_to(array),
            () => fabric.get_interval_count(),
        )
        this.strainNuances = floatArray(
            array => this.view.copy_strain_nuances_to(array),
            () => fabric.get_interval_count(),
        )
        this.stiffnesses = floatArray(
            array => this.view.copy_stiffnesses_to(array),
            () => fabric.get_interval_count(),
        )
        this.linearDensities = floatArray(
            array => this.view.copy_linear_densities_to(array),
            () => fabric.get_interval_count(),
        )
    }

    public applyFeature(feature: FloatFeature): void {
        this.world.set_float_value(feature.fabricFeature, feature.numeric)
    }

    public setFeatureValue(fabricFeature: FabricFeature, value: number): void {
        this.world.set_float_value(fabricFeature, value)
    }

    public forgetDimensions(): void {
        this.view.clear()
    }

    public location(jointIndex: number): Vector3 {
        return vectorFromArray(this.jointLocations, jointIndex)
    }

    public apply(matrix: Matrix4): void {
        // todo: do it in Rust
        throw new Error("not implemented")
    }

    public unitVector(intervalIndex: number): Vector3 {
        return vectorFromArray(this.unitVectors, intervalIndex)
    }

    public faceMidpoint(faceIndex: number): Vector3 {
        return faceVector(faceIndex, this.faceLocations)
    }

    public intervalLocation(intervalIndex: number): Vector3 {
        return vectorFromArray(this.lineLocations, intervalIndex)
    }

    public getIntervalMidpoint(intervalIndex: number): Vector3 {
        const a = this.intervalLocation(intervalIndex * 2)
        const b = this.intervalLocation(intervalIndex * 2 + 1)
        return new Vector3().add(a).add(b).multiplyScalar(0.5)
    }
}
