/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as FileSaver from "file-saver"
import JSZip from "jszip"

import { intervalRoleName, isPushRole } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IJointHole, intervalLength, jointHolesFromJoint, jointLocation } from "../fabric/tensegrity-types"

function csvNumber(n: number): string {
    return n.toFixed(5).replace(/[.]/, ",")
}

function dateString(): string {
    return new Date().toISOString()
        .replace(/[.].*/, "").replace(/[:T_]/g, "-")
}

export interface IOutputJoint {
    index: number
    x: number
    y: number
    z: number
    radius: number
    holes: IJointHole[]
}

export interface IOutputInterval {
    index: number
    joints: number[]
    type: string
    strain: number
    stiffness: number
    linearDensity: number
    isPush: boolean
    role: string
    scale: number
    idealLength: number
    length: number
    radius: number
}

export interface IFabricOutput {
    name: string
    joints: IOutputJoint[]
    intervals: IOutputInterval[]
}

export function getFabricOutput({name, instance, joints, intervals}: Tensegrity, pushRadius: number, pullRadius: number, jointRadius: number): IFabricOutput {
    instance.refreshFloatView()
    const idealLengths = instance.floatView.idealLengths
    const strains = instance.floatView.strains
    const stiffnesses = instance.floatView.stiffnesses
    const linearDensities = instance.floatView.linearDensities
    return {
        name,
        joints: joints.map(joint => {
            const vector = jointLocation(joint)
            const holes = jointHolesFromJoint(joint, intervals)
            return <IOutputJoint>{
                index: joint.index,
                radius: jointRadius,
                x: vector.x, y: vector.z, z: vector.y,
                anchor: false, // TODO: can this be determined?
                holes,
            }
        }),
        intervals: intervals.map(interval => {
            const isPush = isPushRole(interval.intervalRole)
            const radius = isPush ? pushRadius : pullRadius
            const currentLength = intervalLength(interval)
            const alphaIndex = interval.alpha.index
            const omegaIndex = interval.omega.index
            if (alphaIndex >= joints.length || omegaIndex >= joints.length) {
                throw new Error(`Joint not found ${intervalRoleName(interval.intervalRole)}:${alphaIndex},${omegaIndex}:${joints.length}`)
            }
            return <IOutputInterval>{
                index: interval.index,
                joints: [alphaIndex, omegaIndex],
                type: isPush ? "Push" : "Pull",
                strain: strains[interval.index],
                stiffness: stiffnesses[interval.index],
                linearDensity: linearDensities[interval.index],
                role: intervalRoleName(interval.intervalRole),
                scale: interval.scale._,
                idealLength: idealLengths[interval.index],
                isPush,
                length: currentLength,
                radius,
            }
        }),
    }
}

function extractJointFile(output: IFabricOutput): string {
    const csvJoints: string[][] = []
    csvJoints.push(["index", "x", "y", "z"])
    output.joints.forEach(joint => csvJoints.push([
        (joint.index+1).toFixed(0),
        csvNumber(joint.x), csvNumber(joint.y), csvNumber(joint.z),
    ]))
    return csvJoints.map(a => a.join(";")).join("\n")
}

function extractIntervalFile(output: IFabricOutput): string {
    const csvIntervals: string[][] = []
    csvIntervals.push(["joints", "type", "strain", "stiffness", "linear density", "role", "length"])
    output.intervals.forEach(interval => {
        csvIntervals.push([
            `"=""${interval.joints.map(j => (j + 1).toFixed(0))}"""`, interval.type,
            csvNumber(interval.strain), csvNumber(interval.stiffness), csvNumber(interval.linearDensity),
            interval.role, interval.length.toFixed(8),
        ])
    })
    return csvIntervals.map(a => a.join(";")).join("\n")
}

function extractSubmergedFile(output: IFabricOutput): string {
    const csvSubmerged: string[][] = []
    csvSubmerged.push(["joints"])
    // TODO: submerged
    // csvSubmerged.push([`"=""${output.joints.filter(({anchor})=> anchor).map(joint => joint.index + 1)}"""`])
    return csvSubmerged.map(a => a.join(";")).join("\n")
}

export function saveCSVZip(output: IFabricOutput): void {
    const zip = new JSZip()
    zip.file("joints.csv", extractJointFile(output))
    zip.file("intervals.csv", extractIntervalFile(output))
    zip.file("submerged.csv", extractSubmergedFile(output))
    zip.generateAsync({type: "blob", mimeType: "application/zip"}).then(blob => {
        FileSaver.saveAs(blob, `pretenst-${dateString()}.zip`)
    })
}

export function saveJSONZip(output: IFabricOutput): void {
    const zip = new JSZip()
    zip.file(`pretenst-${dateString()}.json`, JSON.stringify(output, undefined, 2))
    zip.generateAsync({type: "blob", mimeType: "application/zip"}).then(blob => {
        FileSaver.saveAs(blob, `pretenst-${dateString()}.zip`)
    })
}
