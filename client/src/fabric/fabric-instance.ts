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

export class FabricInstance {
    private _lineColors: LazyFloatArray
    private _lineLocations: LazyFloatArray
    private _faceNormals: LazyFloatArray
    private _faceLocations: LazyFloatArray
    private _jointLocations: LazyFloatArray
    private _jointVelocities: LazyFloatArray
    private _unitVectors: LazyFloatArray
    private _strains: LazyFloatArray
    private _strainNuances: LazyFloatArray
    private _stiffnesses: LazyFloatArray
    private _linearDensities: LazyFloatArray

    constructor(
        public readonly world: World,
        public readonly view: View,
        public readonly fabric: Fabric,
    ) {
        this._lineColors = new LazyFloatArray(
            array => this.view.copy_line_colors_to(array),
            () => fabric.get_interval_count() * 3 * 2,
        )
        this._lineLocations = new LazyFloatArray(
            array => this.view.copy_line_locations_to(array),
            () => fabric.get_interval_count() * 3 * 2,
        )
        this._faceNormals = new LazyFloatArray(
            array => this.view.copy_face_normals_to(array),
            () => fabric.get_face_count() * 3 * 3,
        )
        this._faceLocations = new LazyFloatArray(
            array => this.view.copy_face_vertex_locations_to(array),
            () => fabric.get_face_count() * 3 * 3,
        )
        this._jointLocations = new LazyFloatArray(
            array => this.view.copy_joint_locations_to(array),
            () => fabric.get_joint_count() * 3,
        )
        this._jointVelocities = new LazyFloatArray(
            array => this.view.copy_joint_velocities_to(array),
            () => fabric.get_joint_count() * 3,
        )
        this._unitVectors = new LazyFloatArray(
            array => this.view.copy_unit_vectors_to(array),
            () => fabric.get_interval_count() * 3,
        )
        this._strains = new LazyFloatArray(
            array => this.view.copy_strains_to(array),
            () => fabric.get_interval_count(),
        )
        this._strainNuances = new LazyFloatArray(
            array => this.view.copy_strain_nuances_to(array),
            () => fabric.get_interval_count(),
        )
        this._stiffnesses = new LazyFloatArray(
            array => this.view.copy_stiffnesses_to(array),
            () => fabric.get_interval_count(),
        )
        this._linearDensities = new LazyFloatArray(
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
        return vectorFromArray(this._jointLocations.floats, jointIndex)
    }

    public apply(matrix: Matrix4): void {
        // todo: do it in Rust
        throw new Error("not implemented")
    }

    public unitVector(intervalIndex: number): Vector3 {
        return vectorFromArray(this._unitVectors.floats, intervalIndex)
    }

    public velocities(): Float32Array {
        return this._jointVelocities.floats
    }

    public get strains(): Float32Array {
        return this._strains.floats
    }

    public get strainNuances(): Float32Array {
        return this._strainNuances.floats
    }

    public get stiffnesses(): Float32Array {
        return this._stiffnesses.floats
    }

    public get linearDensities(): Float32Array {
        return this._linearDensities.floats
    }

    public get faceLocations(): Float32Array {
        return this._faceLocations.floats
    }

    public faceMidpoint(faceIndex: number): Vector3 {
        return faceVector(faceIndex, this._faceLocations.floats)
    }

    public intervalLocation(intervalIndex: number): Vector3 {
        return vectorFromArray(this._lineLocations.floats, intervalIndex)
    }

    public get faceNormals(): Float32Array {
        return this._faceNormals.floats
    }

    public get lineLocations(): Float32Array {
        return this._lineLocations.floats
    }

    public get lineColors(): Float32Array {
        return this._lineColors.floats
    }

    public getIntervalMidpoint(intervalIndex: number): Vector3 {
        const a = this.intervalLocation(intervalIndex * 2)
        const b = this.intervalLocation(intervalIndex * 2 + 1)
        return new Vector3().add(a).add(b).multiplyScalar(0.5)
    }
}

class LazyFloatArray {
    private array: Float32Array | undefined

    constructor(
        private copyFunction: (array: Float32Array) => void,
        private length: () => number,
    ) {
    }

    public get floats(): Float32Array {
        if (!this.array || this.array.length !== this.length()) {
            this.array = new Float32Array(this.length())
        }
        this.copyFunction(this.array) // todo: maybe executed too frequently
        return this.array
    }

    public clear(): void {
        this.array = undefined
    }
}
