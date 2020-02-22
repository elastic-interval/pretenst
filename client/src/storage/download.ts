/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as FileSaver from "file-saver"
import JSZip from "jszip"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export interface IOutputInterval {
    joints: string,
    type: string,
    strainString: string,
    stiffness: number,
    stiffnessString: string,
    linearDensity: number,
    linearDensityString: string,
    isPush: boolean,
    role: string,
    length: number,
}

export interface IFabricOutput {
    name: string
    joints: {
        index: string,
        x: string,
        y: string,
        z: string,
    }[]
    intervals: IOutputInterval[]
}


function extractJointFile(output: IFabricOutput): string {
    const csvJoints: string[][] = []
    csvJoints.push(["index", "x", "y", "z"])
    output.joints.forEach(joint => csvJoints.push([joint.index, joint.x, joint.y, joint.z]))
    return csvJoints.map(a => a.join(";")).join("\n")
}

function extractIntervalFile(output: IFabricOutput): string {
    const csvIntervals: string[][] = []
    csvIntervals.push(["joints", "type", "strain", "stiffness", "linear density", "role", "length"])
    output.intervals.forEach(interval => {
        csvIntervals.push([
            `"=""${interval.joints}"""`,
            interval.type,
            interval.strainString,
            interval.stiffnessString,
            interval.linearDensityString,
            interval.role,
            interval.length.toFixed(8),
        ])
    })
    return csvIntervals.map(a => a.join(";")).join("\n")
}

function extractSubmergedFile(fabric: TensegrityFabric): string {
    const csvSubmerged: string[][] = []
    csvSubmerged.push(["joints"])
    csvSubmerged.push([`"=""${fabric.submergedJoints.map(joint => joint.index + 1)}"""`])
    return csvSubmerged.map(a => a.join(";")).join("\n")
}

export function saveCSVZip(fabric: TensegrityFabric): void {
    const output = fabric.output
    const zip = new JSZip()
    zip.file("joints.csv", extractJointFile(output))
    zip.file("intervals.csv", extractIntervalFile(output))
    zip.file("submerged.csv", extractSubmergedFile(fabric))
    zip.generateAsync({type: "blob", mimeType: "application/zip"}).then(blob => {
        const dateString = new Date().toISOString()
            .replace(/[.].*/, "").replace(/[:T_]/g, "-")
        FileSaver.saveAs(blob, `pretenst-${dateString}.zip`)
    })
}
