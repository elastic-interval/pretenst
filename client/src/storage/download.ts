/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as FileSaver from "file-saver"
import JSZip from "jszip"

import { Tensegrity } from "../fabric/tensegrity"

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
}

export interface IOutputInterval {
    index: number
    joints: number[]
    type: string
    isPush: boolean
    role: string
    idealLength: number
}

export interface IFabricOutput {
    name: string
    joints: IOutputJoint[]
    intervals: IOutputInterval[]
}

export function getFabricOutput(tensegrity: Tensegrity, scaled: boolean): IFabricOutput {
    const {name, instance, joints, intervals, scale} = tensegrity
    instance.refreshFloatView()
    const idealLengths = instance.floatView.idealLengths
    return {
        name,
        joints: joints.map(joint => {
            const vector = instance.jointLocation(joint)
            if (scaled) {
                vector.multiplyScalar(scale)
            }
            return <IOutputJoint>{index: joint.index, x: vector.x, y: vector.z, z: vector.y}
        }),
        intervals: intervals.map(interval => {
            const isPush = interval.role.push
            const alphaIndex = interval.alpha.index
            const omegaIndex = interval.omega.index
            if (alphaIndex >= joints.length || omegaIndex >= joints.length) {
                throw new Error(`Joint not found ${interval.role.tag}:${alphaIndex},${omegaIndex}:${joints.length}`)
            }
            return <IOutputInterval>{
                index: interval.index,
                joints: [alphaIndex, omegaIndex],
                type: isPush ? "Push" : "Pull",
                role: interval.role.tag,
                idealLength: idealLengths[interval.index] * (scaled ? scale : 1),
                isPush,
            }
        }),
    }
}

function extractJointFile(output: IFabricOutput): string {
    const csvJoints: string[][] = []
    csvJoints.push(["index", "x", "y", "z"])
    output.joints.forEach(joint => csvJoints.push([
        (joint.index + 1).toFixed(0),
        csvNumber(joint.x), csvNumber(joint.y), csvNumber(joint.z),
    ]))
    return csvJoints.map(a => a.join(";")).join("\n")
}

function extractIntervalFile(output: IFabricOutput): string {
    const csvIntervals: string[][] = []
    csvIntervals.push(["joints", "type", "role", "ideal length"])
    output.intervals.forEach(interval => {
        csvIntervals.push([
            `"=""${interval.joints.map(j => (j + 1).toFixed(0))}"""`, interval.type,
            interval.role, csvNumber(interval.idealLength),
        ])
    })
    return csvIntervals.map(a => a.join(";")).join("\n")
}

function extractSubmergedFile(output: IFabricOutput): string {
    const csvSubmerged: string[][] = []
    csvSubmerged.push(["joints"])
    csvSubmerged.push([`"=""${output.joints.filter(({y}) => y <= 0).map(joint => joint.index + 1)}"""`])
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
