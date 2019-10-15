/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import {
    FaAnchor,
    FaCompressArrowsAlt,
    FaCubes,
    FaFileCsv,
    FaParachuteBox,
    FaRecycle,
    FaRunning,
    FaSyncAlt,
    FaWalking,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

export function CommandPanel({rebuild, fabric, fastMode, setFastMode, autoRotate, setAutoRotate, storageIndex}: {
    rebuild: () => void,
    fabric?: TensegrityFabric,
    fastMode: boolean,
    setFastMode: (fastMode: boolean) => void,
    autoRotate: boolean,
    setAutoRotate: (autoRotate: boolean) => void,
    storageIndex: number,
}): JSX.Element {

    const onRotateToggle = () => {
        setAutoRotate(!autoRotate)
    }
    const onCentralize = () => {
        if (fabric) {
            fabric.instance.engine.centralize()
        }
    }
    const onJump = () => {
        if (fabric) {
            fabric.instance.engine.setAltitude(10)
        }
    }
    const onFastMode = () => {
        setFastMode(!fastMode)
    }
    const onDownloadCSV = () => {
        if (fabric) {
            saveCSVFiles(fabric)
        }
    }
    const onDownloadOBJ = () => {
        if (fabric) {
            saveOBJFile(fabric)
        }
    }
    return (
        <ButtonGroup id="bottom-right">
            <Button color="success" onClick={rebuild}><FaRecycle/></Button>
            <Button color="info" onClick={onJump}><FaParachuteBox/></Button>
            <Button color="info" onClick={onCentralize}><FaCompressArrowsAlt/></Button>
            <Button color="info" onClick={onRotateToggle}>{autoRotate ? <FaAnchor/> : <FaSyncAlt/>}</Button>
            <Button color={fastMode ? "secondary" : "warning"} onClick={onFastMode}>
                {fastMode ? <FaRunning/> : <FaWalking/>}
            </Button>
            <Button color="secondary" onClick={onDownloadCSV}><FaFileCsv/></Button>
            <Button color="secondary" onClick={onDownloadOBJ}><FaCubes/></Button>
        </ButtonGroup>
    )
}
