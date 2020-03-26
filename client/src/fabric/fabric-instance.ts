/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage, View, World } from "eig"
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

export interface IFloatView {
    lineColors: Float32Array
    lineLocations: Float32Array
    faceNormals: Float32Array
    faceLocations: Float32Array
    jointLocations: Float32Array
    jointVelocities: Float32Array
    unitVectors: Float32Array
    idealLengths: Float32Array
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
        idealLengths: floatArray(
            array => view.copy_ideal_lengths_to(array),
            () => fabric.get_interval_count(),
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

export type InstanceFactory = () => FabricInstance

export class FabricInstance {
    public fabric: Fabric
    public world: World
    public view: View
    public floatView: IFloatView

    private featuresToApply: FloatFeature[] = []
    private fabricBackup?: Fabric
    private adoptFabric: (fabric: Fabric) => void

    constructor(eig: typeof import("eig"), jointCount: number, worldInstance: object) {
        // @ts-ignore
        this.world = worldInstance
        this.adoptFabric = (fabric) => {
            const f = this.fabric
            if (f) {
                f.free()
            }
            this.fabric = fabric
            if (this.view) {
                this.view.free()
            }
            this.view = eig.View.on_fabric(fabric)
        }
        this.adoptFabric(eig.Fabric.new(jointCount))
    }

    public iterate(requestedStage: Stage): Stage {
        const stage = this.fabric.iterate(requestedStage, this.world)
        this.view.render(this.fabric, this.world)
        const feature = this.featuresToApply.shift()
        if (feature) {
            this.world.set_float_value(feature.fabricFeature, feature.numeric)
        }
        this.floatView = createFloatView(this.fabric, this.view)
        return stage
    }

    public snapshot(): void {
        this.fabricBackup = this.fabric.clone()
        console.error("snapshot")
    }

    public restoreSnapshot(): void {
        console.log("restoreSnapshot")
        const backup = this.fabricBackup
        if (!backup) {
            throw new Error("Missing backup")
        }
        this.adoptFabric(backup.clone())
    }

    public refreshFloatView(): void {
        this.view.render(this.fabric, this.world)
        this.floatView = createFloatView(this.fabric, this.view)
    }

    public clear(): void {
        this.fabric.clear()
        this.refreshFloatView()
    }

    public applyFeature(feature: FloatFeature): void {
        this.featuresToApply.push(feature)
    }

    public jointLocation(jointIndex: number): Vector3 {
        return vectorFromArray(this.floatView.jointLocations, jointIndex)
    }

    public apply(matrix: Matrix4): void {
        this.fabric.apply_matrix4(new Float32Array(matrix.toArray()))
    }

    public unitVector(intervalIndex: number): Vector3 {
        return vectorFromArray(this.floatView.unitVectors, intervalIndex)
    }

    public get forward(): Vector3 {
        return new Vector3(1, 0, 0) // TODO
    }

    public get right(): Vector3 {
        return new Vector3(0, 0, 1) // TODO
    }
}
