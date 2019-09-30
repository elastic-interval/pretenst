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

import { connectClosestFacePair } from "../fabric/tensegrity-brick"
import { IFabricOutput, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { loadFabricCode, loadStorageIndex, storeStorageIndex } from "../storage/local-storage"

function extractJointBlob(output: IFabricOutput): Blob {
    const csvJoints: string[][] = []
    csvJoints.push(["index", "x", "y", "z"])
    output.joints.forEach(joint => csvJoints.push([joint.index, joint.x, joint.y, joint.z]))
    const jointsFile = csvJoints.map(a => a.join(";")).join("\n")
    return new Blob([jointsFile], {type: "application/csv"})
}

function extractIntervalBlob(output: IFabricOutput): Blob {
    const csvIntervals: string[][] = []
    csvIntervals.push(["joints", "type"])
    output.intervals.forEach(interval => {
        csvIntervals.push([`"=""${interval.joints}"""`, interval.type])
    })
    const intervalsFile = csvIntervals.map(a => a.join(";")).join("\n")
    return new Blob([intervalsFile], {type: "application/csv"})
}

export function GlobalFabricPanel({constructFabric, fabric, cancelSelection}: {
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

    function saveFiles(f: TensegrityFabric): void {
        const dateString = new Date().toISOString()
            .replace(/[.].*/, "").replace(/[:T_]/g, "-")
        const output = f.output
        FileSaver.saveAs(extractJointBlob(output), `${dateString}-joints.csv`)
        FileSaver.saveAs(extractIntervalBlob(output), `${dateString}-intervals.csv`)
    }

    const buttonClass = "text-left my-2 mx-1 btn-info"

    return (
        <ButtonGroup className="w-75 align-self-center my-4" vertical={true}>
            <ButtonDropdown className="w-100 my-2 btn-info" isOpen={open} toggle={() => setOpen(!open)}>
                <DropdownToggle>
                    {open ? <FaRegFolderOpen/> : <FaRegFolder/>} Choose
                </DropdownToggle>
                <DropdownMenu>
                    {loadFabricCode().map((code, index) => (
                        <DropdownItem key={`Buffer${index}`} onClick={() => select(code, index)}>
                            {code}
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </ButtonDropdown>
            <Button className={buttonClass} onClick={() => withFabric(f => f.optimize(false))}>
                <FaBolt/> L Optimize
            </Button>
            <Button className={buttonClass} onClick={() => withFabric(f => f.optimize(true))}>
                <FaBolt/> H Optimize
            </Button>
            <Button className={buttonClass} onClick={() => withFabric(connectClosestFacePair)}>
                <FaStarOfDavid/> Connect
            </Button>
            <Button className={buttonClass} onClick={() => withFabric(f => f.instance.setAltitude(10))}>
                <FaParachuteBox/> Jump
            </Button>
            <Button className={buttonClass} onClick={() => withFabric(f => f.autoRotate = !f.autoRotate)}>
                <FaSyncAlt/> Rotate
            </Button>
            <Button className={buttonClass} onClick={() => withFabric(f => f.instance.centralize())}>
                <FaCompressArrowsAlt/> Centralize
            </Button>
            <Button className={buttonClass} onClick={() => withFabric(saveFiles)}>
                <FaDownload/> Download
            </Button>
            <Button className={buttonClass} onClick={() => constructFabric(loadFabricCode()[storageIndex])}>
                <FaRecycle/> Rebuild
            </Button>
        </ButtonGroup>
    )
}
