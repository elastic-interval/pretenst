/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import {
    FaAnchor,
    FaBolt,
    FaCompressArrowsAlt,
    FaDownload,
    FaParachuteBox,
    FaRecycle,
    FaRunning,
    FaSyncAlt,
    FaWalking,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"
import { loadFabricCode } from "../storage/local-storage"

export function CommandPanel({constructFabric, fabric, fastMode, setFastMode, autoRotate, setAutoRotate, storageIndex}: {
    constructFabric: (fabricCode: string) => void,
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
    const onRebuild = () => {
        constructFabric(loadFabricCode()[storageIndex])
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
    const onOptimizeA = () => {
        if (fabric) {
            fabric.optimize(true)
        }
    }
    const onOptimizeB = () => {
        if (fabric) {
            fabric.optimize(false)
        }
    }

    return (
        <ButtonGroup style={{
            position: "absolute",
            bottom: "1em",
            right: "1em",
        }}>
            <Button onClick={onRebuild}><FaRecycle/></Button>
            <Button onClick={onJump}><FaParachuteBox/></Button>
            <Button onClick={onCentralize}><FaCompressArrowsAlt/></Button>
            <Button onClick={onRotateToggle}>{autoRotate ? <FaAnchor/> : <FaSyncAlt/>}</Button>
            <Button onClick={onFastMode}>{fastMode ? <FaRunning/> : <FaWalking/>}</Button>
            <Button onClick={onDownloadCSV}><FaDownload/>CSV</Button>
            <Button onClick={onDownloadOBJ}><FaDownload/>OBJ</Button>
            <Button onClick={onOptimizeA}><FaBolt/>A</Button>
            <Button onClick={onOptimizeB}><FaBolt/>B</Button>
        </ButtonGroup>
    )
}
