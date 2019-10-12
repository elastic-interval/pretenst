/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as FileSaver from "file-saver"
import { Mesh, Object3D } from "three"
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter"

import { IInterval } from "../fabric/tensegrity-brick-types"
import { IFabricOutput, SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { BAR, CABLE, FACE } from "../view/materials"

function extractJointBlob(output: IFabricOutput): Blob {
    const csvJoints: string[][] = []
    csvJoints.push(["index", "x", "y", "z"])
    output.joints.forEach(joint => csvJoints.push([joint.index, joint.x, joint.y, joint.z]))
    const jointsFile = csvJoints.map(a => a.join(";")).join("\n")
    return new Blob([jointsFile], {type: "application/csv"})
}

function extractIntervalBlob(output: IFabricOutput): Blob {
    const csvIntervals: string[][] = []
    csvIntervals.push(["joints", "type", "strain", "elastic"])
    output.intervals.forEach(interval => {
        csvIntervals.push([
            `"=""${interval.joints}"""`,
            interval.type,
            interval.strain.toFixed(5),
            interval.elastic.toFixed(3),
        ])
    })
    const intervalsFile = csvIntervals.map(a => a.join(";")).join("\n")
    return new Blob([intervalsFile], {type: "application/csv"})
}

function extractSubmergedJointBlob(fabric: TensegrityFabric): Blob {
    const csvSubmerged: string[][] = []
    csvSubmerged.push(["joints"])
    csvSubmerged.push([`"=""${fabric.submergedJoints.map(joint => joint.index)}"""`])
    const submergedFile = csvSubmerged.map(a => a.join(";")).join("\n")
    return new Blob([submergedFile], {type: "application/csv"})
}

export function saveCSVFiles(fabric: TensegrityFabric): void {
    // const dateString = new Date().toISOString()
    //     .replace(/[.].*/, "").replace(/[:T_]/g, "-")
    const output = fabric.output
    FileSaver.saveAs(extractJointBlob(output), "joints.csv")
    FileSaver.saveAs(extractIntervalBlob(output), "intervals.csv")
    FileSaver.saveAs(extractSubmergedJointBlob(fabric), "submerged.csv")
}

function extractOBJBlob(fabric: TensegrityFabric, faces: boolean): Blob {
    const object3d = new Object3D()
    if (faces) {
        object3d.add(new Mesh(fabric.facesGeometry, FACE))
    } else {
        object3d.add(...fabric.intervals.map((interval: IInterval) => {
            const material = interval.isBar ? BAR : CABLE
            const {scale, rotation} = fabric.orientInterval(interval, interval.isBar ? 1 : 0.1)
            const mesh = new Mesh(SPHERE, material)
            mesh.position.copy(fabric.instance.getIntervalMidpoint(interval.index))
            mesh.scale.copy(scale)
            mesh.rotation.setFromQuaternion(rotation)
            return mesh
        }))
        object3d.updateMatrixWorld(true)
    }
    return new Blob([new OBJExporter().parse(object3d)], {type: "text/plain"})
}

export function saveOBJFile(fabric: TensegrityFabric): void {
    FileSaver.saveAs(extractOBJBlob(fabric, false), "pretenst.obj")
}

