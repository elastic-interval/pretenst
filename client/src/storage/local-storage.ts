/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { TensegrityFabric } from "../fabric/tensegrity-fabric"

const FABRIC_CODE_KEY = "FabricCode"
const STORAGE_INDEX_KEY = "StorageIndex"

const STORAGE_BOOTSTRAP: string[] = [
    "0",
    "1",
    "2",
    "9",
    "1[1,1,1]",
    "2[2,2,2]",
    "3[3,3,3[3,3,3]]L",
    "2[2,2,2[2,2,2]]H",
    "4[2=4]",
    "1[1,3[1,1,1],4]",
    "3[3[3,3,3],3[3,3,3],3[3,3,3]]",
    "3[3[3,3,3],3[3,3,3],3[3,3,3]]L",
    "9[9,9,9]",
    "2[1=2[3=2[2=2[3=2[1=2[3=2[2=2]]]]]]]X",
    "2[1=4[3=4[2=4[3=4[1=4[3=4[2=4[3=1]]]]]]]]",
]

export function loadFabricCode(): string[] {
    const item = localStorage.getItem(FABRIC_CODE_KEY)
    if (!item) {
        return STORAGE_BOOTSTRAP
    }
    return JSON.parse(item)
}

export function storeFabricCode(fabricCode: string[]): void {
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(fabricCode))
}

export function loadStorageIndex(): number {
    const item = localStorage.getItem(STORAGE_INDEX_KEY)
    if (!item) {
        return 0
    }
    return parseInt(item, 10)
}

export function storeStorageIndex(index: number): void {
    localStorage.setItem(STORAGE_INDEX_KEY, index.toString(10))
}

export function dumpToCSV(fabric: TensegrityFabric): void {
    const csvJoints: string[][] = []
    const csvIntervals: string[][] = []
    const output = fabric.output
    csvJoints.push(["index", "x", "y", "z"])
    output.joints.forEach(joint => {
        csvJoints.push([joint.index, joint.x, joint.y, joint.z])
    })
    csvIntervals.push(["joints", "type"])
    output.intervals.forEach(interval => {
        csvIntervals.push([`"=""${interval.joints}"""`, interval.type])
    })
    localStorage.setItem("Joints", csvJoints.map(a => a.join(";")).join("\n"))
    localStorage.setItem("Intervals", csvIntervals.map(a => a.join(";")).join("\n"))
}
