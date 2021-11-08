/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage, View, World, WorldFeature } from "eig"
import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from "three"

import { featureMapping } from "../view/feature-mapping"

import { midpoint, vectorFromArray } from "./eig-util"
import { IFace, IInterval, IJoint } from "./tensegrity-types"
import { Twist } from "./twist"

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

export type CreateInstance = (featureValues?: Record<WorldFeature, number>, existingFabric?: Fabric) => FabricInstance

export class FabricInstance {
    public fabric: Fabric
    public world: World
    public view: View
    public floatView: IFloatView = createEmptyFloatView()
    public adoptFabric: (fabric: Fabric) => FabricInstance
    public midpoint = new Vector3(0, 0, 0)

    private valuesToApply: ICurrentValue[] = []
    private fabricBackup?: Fabric

    constructor(
        eig: typeof import("eig"),
        featureValues: Record<WorldFeature, number>,
        jointCount: number,
        worldObject: object,
        fabricObject?: object,
    ) {
        this.world = worldObject as World
        for (const [key, percent] of Object.entries(featureValues)) {
            const feature = parseInt(key, 10)
            const {percentToValue} = featureMapping(feature)
            const value = percentToValue(percent)
            this.world.set_float_value(feature, value)
        }
        this.adoptFabric = (fabric) => {
            this.free()
            this.fabric = fabric
            this.view = eig.View.on_fabric(fabric)
            return this
        }
        this.adoptFabric(fabricObject ? fabricObject as Fabric : eig.Fabric.new(jointCount))
    }

    public iterate(): boolean {
        const busy = this.fabric.iterate(this.world)
        this.refreshFloatView()
        const current = this.valuesToApply.shift()
        if (current) {
            this.world.set_float_value(current.feature, current.value)
        }
        return busy
    }

    public get stage(): Stage {
        return this.fabric.get_stage()
    }

    public set stage(requested: Stage) {
        const stage = this.fabric.request_stage(requested, this.world)
        if (!stage) {
            console.error(`Could not move to stage ${requested}!`)
        }
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

    public applyFeature(feature: WorldFeature, percent: number, value: number): void {
        this.valuesToApply.push({feature, percent, value})
    }

    public jointLocation(joint: IJoint): Vector3 {
        return vectorFromArray(this.floatView.jointLocations, joint.index)
    }

    public averageJointLocation(joints: IJoint[]): Vector3 {
        return joints
            .reduce((accum, joint) => accum.add(this.jointLocation(joint)), new Vector3())
            .multiplyScalar(1 / joints.length)
    }

    public jointDistance(a: IJoint, b: IJoint): number {
        return this.jointLocation(a).distanceTo(this.jointLocation(b))
    }

    public intervalLocation({alpha, omega}: IInterval): Vector3 {
        return this.jointLocation(alpha).add(this.jointLocation(omega)).multiplyScalar(0.5)
    }

    public twistLocation({pushes}: Twist): Vector3 {
        return pushes
            .reduce((sum, push) => sum.add(this.intervalLocation(push)), new Vector3())
            .multiplyScalar(1 / pushes.length)
    }

    public intervalLength({alpha, omega}: IInterval): number {
        return this.jointDistance(alpha, omega)
    }

    public faceLocation(face: IFace): Vector3 {
        return midpoint(face.ends.map(end => this.jointLocation(end)))
    }

    public averageFaceLocation(faces: IFace[]): Vector3 {
        return faces
            .reduce((accum, face) => accum.add(this.faceLocation(face)), new Vector3())
            .multiplyScalar(1 / faces.length)
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

interface ICurrentValue {
    feature: WorldFeature
    percent: number
    value: number
}
