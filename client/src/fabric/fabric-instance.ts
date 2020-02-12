/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, FabricFeature, Stage, View, World } from "eig"
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

export interface IFloatView {
    lineColors: Float32Array
    lineLocations: Float32Array
    faceNormals: Float32Array
    faceLocations: Float32Array
    jointLocations: Float32Array
    jointVelocities: Float32Array
    unitVectors: Float32Array
    strains: Float32Array
    strainNuances: Float32Array
    stiffnesses: Float32Array
    linearDensities: Float32Array
}

function createFloatView(fabric: Fabric, view: View): IFloatView {
    return {
        lineColors: floatArray(
            array => view.copy_line_colors_to(array),
            () => fabric.get_interval_count() * 3 * 2,
        ),
        lineLocations: floatArray(
            array => view.copy_line_locations_to(array),
            () => fabric.get_interval_count() * 3 * 2,
        ),
        faceNormals: floatArray(
            array => view.copy_face_normals_to(array),
            () => fabric.get_face_count() * 3 * 3,
        ),
        faceLocations: floatArray(
            array => view.copy_face_vertex_locations_to(array),
            () => fabric.get_face_count() * 3 * 3,
        ),
        jointLocations: floatArray(
            array => view.copy_joint_locations_to(array),
            () => fabric.get_joint_count() * 3,
        ),
        jointVelocities: floatArray(
            array => view.copy_joint_velocities_to(array),
            () => fabric.get_joint_count() * 3,
        ),
        unitVectors: floatArray(
            array => view.copy_unit_vectors_to(array),
            () => fabric.get_interval_count() * 3,
        ),
        strains: floatArray(
            array => view.copy_strains_to(array),
            () => fabric.get_interval_count(),
        ),
        strainNuances: floatArray(
            array => view.copy_strain_nuances_to(array),
            () => fabric.get_interval_count(),
        ),
        stiffnesses: floatArray(
            array => view.copy_stiffnesses_to(array),
            () => fabric.get_interval_count(),
        ),
        linearDensities: floatArray(
            array => view.copy_linear_densities_to(array),
            () => fabric.get_interval_count(),
        ),
    }
}

function floatArray(copyFunction: (array: Float32Array) => void, length: () => number): Float32Array {
    const array = new Float32Array(length())
    copyFunction(array)
    return array
}

export class FabricInstance {
    public fabric: Fabric
    public world: World
    public view: View
    public floatView: IFloatView

    constructor(eig: typeof import("eig"), jointCount: number) {
        this.world = eig.World.new()
        this.fabric = eig.Fabric.new(jointCount)
        this.view = eig.View.on_fabric(this.fabric)
        this.floatView = createFloatView(this.fabric, this.view)
    }

    public iterate(requestedStage: Stage): Stage {
        const stage = this.fabric.iterate(requestedStage, this.world)
        this.fabric.render_to(this.view, this.world)
        this.floatView = createFloatView(this.fabric, this.view)
        return stage
    }

    public applyFeature(feature: FloatFeature): void {
        this.world.set_float_value(feature.fabricFeature, feature.numeric)
    }

    public setFeatureValue(fabricFeature: FabricFeature, value: number): void {
        this.world.set_float_value(fabricFeature, value)
    }

    public location(jointIndex: number): Vector3 {
        return vectorFromArray(this.floatView.jointLocations, jointIndex)
    }

    public apply(matrix: Matrix4): void {
        this.fabric.apply_matrix4(new Float32Array(matrix.toArray()))
    }

    public unitVector(intervalIndex: number): Vector3 {
        return vectorFromArray(this.floatView.unitVectors, intervalIndex)
    }

    public faceMidpoint(faceIndex: number): Vector3 {
        return faceVector(faceIndex, this.floatView.faceLocations)
    }

    public intervalLocation(intervalIndex: number): Vector3 {
        return vectorFromArray(this.floatView.lineLocations, intervalIndex)
    }

    public getIntervalMidpoint(intervalIndex: number): Vector3 {
        const a = this.intervalLocation(intervalIndex * 2)
        const b = this.intervalLocation(intervalIndex * 2 + 1)
        return new Vector3().add(a).add(b).multiplyScalar(0.5)
    }
}
