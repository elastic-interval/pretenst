/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as FileSaver from "file-saver"
import * as React from "react"
import { useState } from "react"
import {
    FaBolt,
    FaCompressArrowsAlt,
    FaDownload,
    FaParachuteBox,
    FaRecycle,
    FaRegFolder,
    FaRegFolderOpen,
    FaStarOfDavid,
    FaSyncAlt,
} from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { Mesh, Object3D } from "three"
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter"

import { IntervalRole } from "../fabric/fabric-engine"
import { connectClosestFacePair } from "../fabric/tensegrity-brick"
import { IInterval } from "../fabric/tensegrity-brick-types"
import { IFabricOutput, SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { loadFabricCode, loadStorageIndex, storeStorageIndex } from "../storage/local-storage"

import { TENSEGRITY_BAR, TENSEGRITY_CABLE, TENSEGRITY_FACE } from "./materials"

function extractJointBlob(output: IFabricOutput): Blob {
    const csvJoints: string[][] = []
    csvJoints.push(["index", "x", "y", "z"])
    output.joints.forEach(joint => csvJoints.push([joint.index, joint.x, joint.y, joint.z]))
    const jointsFile = csvJoints.map(a => a.join(";")).join("\n")
    return new Blob([jointsFile], {type: "application/csv"})
}

function extractIntervalBlob(output: IFabricOutput): Blob {
    const csvIntervals: string[][] = []
    csvIntervals.push(["joints", "type", "stress", "thickness"])
    output.intervals.forEach(interval => {
        csvIntervals.push([
            `"=""${interval.joints}"""`,
            interval.type,
            interval.stress.toFixed(5),
            interval.thickness.toFixed(3),
        ])
    })
    const intervalsFile = csvIntervals.map(a => a.join(";")).join("\n")
    return new Blob([intervalsFile], {type: "application/csv"})
}

function extractSubmergedJointBlob(fabric: TensegrityFabric): Blob {
    const csvSubmerged: string[][] = []
    csvSubmerged.push(["joints"])
    csvSubmerged.push([`"=""${fabric.submergedJoints.map(joint => joint.index)}"""`])
    const intervalsFile = csvSubmerged.map(a => a.join(";")).join("\n")
    return new Blob([intervalsFile], {type: "application/csv"})
}

function saveCSVFiles(fabric: TensegrityFabric): void {
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
        object3d.add(new Mesh(fabric.facesGeometry, TENSEGRITY_FACE))
    } else {
        object3d.add(...fabric.intervals.map((interval: IInterval) => {
            const bar = interval.intervalRole === IntervalRole.Bar
            const material = bar ? TENSEGRITY_BAR : TENSEGRITY_CABLE
            const {scale, rotation} = fabric.orientInterval(interval, bar ? 1 : 0.1)
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

function saveOBJFile(fabric: TensegrityFabric): void {
    FileSaver.saveAs(extractOBJBlob(fabric, false), "pretenst.obj")
}

export function CommandPanel({constructFabric, fabric, cancelSelection}: {
    constructFabric: (fabricCode: string) => void,
    fabric?: TensegrityFabric,
    cancelSelection: () => void,
}): JSX.Element {

    const [storageIndex, setStorageIndex] = useState<number>(loadStorageIndex)
    const [open, setOpen] = useState<boolean>(false)

    function select(code: string, index: number): void {
        setStorageIndex(index)
        storeStorageIndex(index)
        constructFabric(code)
    }

    function withFabric(operation: (f: TensegrityFabric) => void): void {
        if (!fabric) {
            return
        }
        cancelSelection()
        operation(fabric)
    }


    const BUTTON_CLASS = "text-left my-2 mx-1"

    return (
        <div className="text-center">
            <ButtonGroup className="w-75 align-self-center my-4" vertical={true}>
                <ButtonDropdown className="w-100 my-2 btn-info" isOpen={open} toggle={() => setOpen(!open)}>
                    <DropdownToggle>
                        {open ? <FaRegFolderOpen/> : <FaRegFolder/>} Choose a program
                    </DropdownToggle>
                    <DropdownMenu>
                        {loadFabricCode().map((code, index) => (
                            <DropdownItem key={`Buffer${index}`} onClick={() => select(code, index)}>
                                {code}
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </ButtonDropdown>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(saveCSVFiles)}>
                    <FaDownload/> CSV
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(saveOBJFile)}>
                    <FaDownload/> OBJ
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(f => f.optimize(false))}>
                    <FaBolt/> Short Optimize
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(f => f.optimize(true))}>
                    <FaBolt/> Long Optimize
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(connectClosestFacePair)}>
                    <FaStarOfDavid/> Connect
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(f => f.instance.setAltitude(10))}>
                    <FaParachuteBox/> Jump
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(f => f.autoRotate = !f.autoRotate)}>
                    <FaSyncAlt/> Rotate
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => withFabric(f => f.instance.centralize())}>
                    <FaCompressArrowsAlt/> Centralize
                </Button>
                <Button className={BUTTON_CLASS} onClick={() => constructFabric(loadFabricCode()[storageIndex])}>
                    <FaRecycle/> Rebuild
                </Button>
            </ButtonGroup>
        </div>
    )
}
