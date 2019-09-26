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
import {
    Button,
    ButtonDropdown,
    ButtonGroup,
    ButtonToolbar,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from "reactstrap"

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

    return (
        <div className="new-fabric-panel">
            <ButtonToolbar>
                <ButtonGroup>
                    <ButtonDropdown
                        addonType="append"
                        isOpen={open}
                        toggle={() => setOpen(!open)}>
                        <DropdownToggle>
                            <span>
                                {open ? <FaRegFolderOpen/> : <FaRegFolder/>}&nbsp;&nbsp;&nbsp;
                                <strong>{loadFabricCode()[storageIndex]}</strong>
                            </span>
                        </DropdownToggle>
                        <DropdownMenu>
                            {loadFabricCode().map((code, index) => (
                                <DropdownItem key={`Buffer${index}`} onClick={() => select(code, index)}>
                                    {code}
                                </DropdownItem>
                            ))}
                        </DropdownMenu>
                    </ButtonDropdown>
                </ButtonGroup>
                &nbsp;&nbsp;&nbsp;
                <ButtonGroup>
                    <Button onClick={() => constructFabric(loadFabricCode()[storageIndex])}><FaRecycle/></Button>
                    <Button onClick={() => withFabric(f => {
                        const dateString = new Date().toISOString()
                            .replace(/[.].*/, "").replace(/[:T_]/g, "-")
                        const output = f.output
                        FileSaver.saveAs(extractJointBlob(output), `${dateString}-joints.csv`)
                        FileSaver.saveAs(extractIntervalBlob(output), `${dateString}-intervals.csv`)
                    })}><FaDownload/></Button>
                </ButtonGroup>
                &nbsp;&nbsp;&nbsp;
                <ButtonGroup>
                    <Button onClick={() => withFabric(f => f.optimize(false))}><FaBolt/>L</Button>
                    <Button onClick={() => withFabric(f => f.optimize(true))}><FaBolt/>H</Button>
                    <Button onClick={() => withFabric(connectClosestFacePair)}><FaStarOfDavid/></Button>
                </ButtonGroup>
                &nbsp;&nbsp;&nbsp;
                <ButtonGroup>
                    <Button onClick={() => withFabric(f => f.instance.setAltitude(10))}><FaParachuteBox/></Button>
                    <Button onClick={() => withFabric(f => f.autoRotate = !f.autoRotate)}><FaSyncAlt/></Button>
                    <Button onClick={() => withFabric(f => f.instance.centralize())}><FaCompressArrowsAlt/></Button>
                </ButtonGroup>
            </ButtonToolbar>
        </div>
    )
}
