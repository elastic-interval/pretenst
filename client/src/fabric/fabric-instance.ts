/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage, View, World } from "eig"
import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from "three"

import { UP, vectorFromArray } from "./eig-util"
import { FloatFeature } from "./float-feature"

export interface IFloatView {
    jointCount: number
    intervalCount: number
    faceCount: number
    lineGeometry: BufferGeometry
    faceGeometry: BufferGeometry
    jointLocations: Float32Array
    unitVectors: Float32Array
    idealLengths: Float32Array
    strains: Float32Array
    strainLimits: Float32Array
    strainNuances: Float32Array
    stiffnesses: Float32Array
    linearDensities: Float32Array
}

export type CreateInstance = (frozen: boolean, existingFabric?: Fabric) => FabricInstance

export class FabricInstance {
    public fabric: Fabric
    public world: World
    public view: View
    public floatView: IFloatView = createEmptyFloatView()
    public adoptFabric: (fabric: Fabric) => FabricInstance
    public midpoint = new Vector3(0, 0, 0)
    public forward = new Vector3(1, 0, 0)
    public right = new Vector3(0, 0, 1)
    public left = new Vector3(0, 0, -1)

    private featuresToApply: FloatFeature[] = []
    private fabricBackup?: Fabric

    constructor(eig: typeof import("eig"), jointCount: number, worldObject: object, fabricObject?: object) {
        this.world = worldObject as World
        this.adoptFabric = (fabric) => {
            this.free()
            this.fabric = fabric
            this.view = eig.View.on_fabric(fabric)
            return this
        }
        this.adoptFabric(fabricObject ? fabricObject as Fabric : eig.Fabric.new(jointCount))
    }

    public iterate(requestedStage: Stage): Stage | undefined {
        const stage = this.fabric.iterate(requestedStage, this.world)
        const feature = this.featuresToApply.shift()
        if (feature) {
            this.world.set_float_value(feature.worldFeature, feature.numeric)
        }
        this.refreshFloatView()
        return stage
    }

    public showFrozen(satisfied: boolean): void {
        this.updateFloatView(true, satisfied)
    }

    public get fabricClone(): Fabric {
        return this.fabric.clone()
    }

    public snapshot(): void {
        console.log("snapshot")
        this.fabricBackup = this.fabricClone
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
        this.midpoint.set(this.view.midpoint_x(), this.view.midpoint_y(), this.view.midpoint_z())
        this.updateFloatView(false, false)
    }

    public clear(): FabricInstance {
        this.fabric.clear()
        this.refreshFloatView()
        return this
    }

    public applyFeature(feature: FloatFeature): void {
        this.featuresToApply.push(feature)
    }

    public jointLocation(jointIndex: number): Vector3 {
        return vectorFromArray(this.floatView.jointLocations, jointIndex)
    }

    public apply(matrix: Matrix4): void {
        this.fabric.apply_matrix4(new Float32Array(matrix.toArray()))
        this.refreshFloatView()
    }

    public unitVector(intervalIndex: number): Vector3 {
        return vectorFromArray(this.floatView.unitVectors, intervalIndex)
    }

    public free(): void {
        const fabric = this.fabric
        if (fabric) {
            fabric.free()
        }
        const view = this.view
        if (view) {
            view.free()
        }
    }

    private updateFloatView(frozen: boolean, satisfied: boolean): void {
        const fabric = this.fabric
        const view = this.view
        const jointCount = fabric.get_joint_count()
        const intervalCount = fabric.get_interval_count()
        const faceCount = fabric.get_face_count()
        const floatView = this.floatView
        const dimensionChange = floatView.jointCount !== jointCount || floatView.intervalCount !== intervalCount || floatView.faceCount !== faceCount
        if (dimensionChange) {
            // console.log(`j(${floatView.jointCount}=>${jointCount}) i(${floatView.intervalCount}=>${intervalCount}) f(${floatView.faceCount}=>${faceCount})`)
            floatView.jointCount = jointCount
            floatView.intervalCount = intervalCount
            floatView.faceCount = faceCount
            floatView.lineGeometry.dispose()
            floatView.lineGeometry = new BufferGeometry()
            const lineLocations = new Float32Array(intervalCount * 3 * 2)
            view.copy_line_locations_to(lineLocations)
            floatView.lineGeometry.setAttribute("position", new Float32BufferAttribute(lineLocations, 3))
            const lineColors = new Float32Array(intervalCount * 3 * 2)
            if (frozen) {
                if (satisfied) {
                    lineColors.fill(0)
                    for (let green = 1; green < lineColors.length; green += 3) {
                        lineColors[green] = 1
                    }
                } else {
                    lineColors.fill(1)
                }
            } else {
                view.copy_line_colors_to(lineColors)
            }
            floatView.lineGeometry.setAttribute("color", new Float32BufferAttribute(lineColors, 3))
            floatView.faceGeometry.dispose()
            floatView.faceGeometry = new BufferGeometry()
            const faceLocations = new Float32Array(faceCount * 3 * 3)
            view.copy_face_vertex_locations_to(faceLocations)
            floatView.faceGeometry.setAttribute("position", new Float32BufferAttribute(faceLocations, 3))
            const faceNormals = new Float32Array(faceCount * 3 * 3)
            view.copy_face_normals_to(faceNormals)
            floatView.faceGeometry.setAttribute("normal", new Float32BufferAttribute(faceNormals, 3))
            floatView.jointLocations = new Float32Array(jointCount * 3)
            floatView.unitVectors = new Float32Array(intervalCount * 3)
            floatView.idealLengths = new Float32Array(intervalCount)
            floatView.strains = new Float32Array(intervalCount)
            floatView.strainNuances = new Float32Array(intervalCount)
            floatView.stiffnesses = new Float32Array(intervalCount)
            floatView.linearDensities = new Float32Array(intervalCount)
        } else {
            const line = this.floatView.lineGeometry.attributes
            const face = this.floatView.faceGeometry.attributes
            if (line.position) {
                // console.log(`j(${floatView.jointCount}) i(${floatView.intervalCount}) f(${floatView.faceCount})`)
                const linePosition = line.position as Float32BufferAttribute
                view.copy_line_locations_to(linePosition.array as Float32Array)
                linePosition.needsUpdate = true
                const lineColor = line.color as Float32BufferAttribute
                const lineColors = lineColor.array as Float32Array
                if (frozen) {
                    if (satisfied) {
                        lineColors.fill(0)
                        for (let green = 1; green < lineColors.length; green += 3) {
                            lineColors[green] = 1
                        }
                    } else {
                        lineColors.fill(1)
                    }
                } else {
                    view.copy_line_colors_to(lineColors)
                }
                lineColor.needsUpdate = true
                const facePosition = face.position as Float32BufferAttribute
                view.copy_face_vertex_locations_to(facePosition.array as Float32Array)
                facePosition.needsUpdate = true
                const faceNormal = face.normal as Float32BufferAttribute
                view.copy_face_normals_to(faceNormal.array as Float32Array)
                faceNormal.needsUpdate = true
            }
        }
        view.copy_joint_locations_to(floatView.jointLocations)
        view.copy_unit_vectors_to(floatView.unitVectors)
        view.copy_ideal_lengths_to(floatView.idealLengths)
        view.copy_strains_to(floatView.strains)
        view.copy_strain_limits_to(floatView.strainLimits)
        view.copy_strain_nuances_to(floatView.strainNuances)
        view.copy_stiffnesses_to(floatView.stiffnesses)
        view.copy_linear_densities_to(floatView.linearDensities)
        const locations = floatView.jointLocations
        const fromTo = (fromJoint: number, toJoint: number, vector: Vector3) => {
            const from = fromJoint * 3
            const to = toJoint * 3
            vector.set(
                locations[to] - locations[from],
                locations[to + 1] - locations[from + 1],
                locations[to + 2] - locations[from + 2],
            )
        }
        fromTo(2, 1, this.forward)
        this.forward.y = 0
        this.forward.normalize()
        this.right.crossVectors(this.forward, UP).normalize()
        this.left.set(0, 0, 0).sub(this.right)
    }
}

function createEmptyFloatView(): IFloatView {
    const empty = new Float32Array(0)
    const jointCount = 0
    const intervalCount = 0
    const faceCount = 0
    return {
        jointCount, intervalCount, faceCount,
        lineGeometry: new BufferGeometry(), faceGeometry: new BufferGeometry(),
        jointLocations: empty, unitVectors: empty, idealLengths: empty,
        strains: empty, strainLimits: new Float32Array(4), strainNuances: empty,
        stiffnesses: empty, linearDensities: empty,
    }
}
