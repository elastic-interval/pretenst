/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp,
    FaBolt,
    FaCircle,
    FaCompressArrowsAlt,
    FaCubes,
    FaDotCircle,
    FaFileCsv,
    FaHandPointUp,
    FaListAlt,
    FaParachuteBox,
    FaRecycle,
    FaRunning,
    FaSun,
    FaSyncAlt,
    FaTimesCircle,
    FaYinYang,
} from "react-icons/all"
import { Button, ButtonGroup, Navbar } from "reactstrap"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import {
    AdjacentIntervals,
    bySelectedFace,
    IFace,
    IPercent,
    ISelectedFace,
    nextAdjacent,
    percentOrHundred,
} from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

import { COLD_COLOR, HOT_COLOR } from "./materials"
import { StrainPanel } from "./strain-panel"

interface IControlPanel {
    fabric: TensegrityFabric,
    busy: boolean,
    clearFabric: () => void,
    rebuildFabric: () => void,
    pretenst: number,
    setPretenst: (pretenst: number) => void,
    setShowFaces: (showFaces: boolean) => void
    selectedFace?: ISelectedFace,
    setSelectedFace: (selectedFace?: ISelectedFace) => void,
    autoRotate: boolean,
    setAutoRotate: (autoRotate: boolean) => void,
    fastMode: boolean,
    setFastMode: (fastMode: boolean) => void,
}


export function TensegrityControlPanel(
    {
        fabric, busy, clearFabric, rebuildFabric, pretenst, setPretenst, setShowFaces, selectedFace, setSelectedFace,
        autoRotate, setAutoRotate, fastMode, setFastMode,
    }: IControlPanel): JSX.Element {

    const [colorBars, setColorBars] = useState(true)
    const [colorCables, setColorCables] = useState(true)

    useEffect(() => fabric.instance.engine.setColoring(colorBars, colorCables), [colorBars, colorCables])

    useEffect(() => {
        if (pretenst === 0) {
            setShowFaces(true)
            setColorBars(true)
            setColorCables(true)
        }
    }, [pretenst])

    function adjustment(up: boolean): number {
        const factor = 1.03
        return up ? factor : (1 / factor)
    }

    const adjustValue = (up: boolean) => () => {
        fabric.forEachSelected(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment(up))
        })
    }

    const onRecycle = () => {
        setSelectedFace(undefined)
        fabric.clearSelection()
        rebuildFabric()
    }

    const grow = (face: IFace, scale?: IPercent) => {
        createConnectedBrick(face.brick, face.triangle, percentOrHundred(scale))
        setSelectedFace(undefined)
    }

    const faceNextAdjacent = (face: ISelectedFace) => {
        const nextAdjacentFace = nextAdjacent(face)
        fabric.selectIntervals(bySelectedFace(nextAdjacentFace))
        setSelectedFace(nextAdjacentFace)
    }

    const onCancel = () => {
        fabric.clearSelection()
        setSelectedFace(undefined)
    }

    function ViewButton({bars, cables, children}: {
        bars: boolean,
        cables: boolean,
        children: JSX.Element | JSX.Element[],
    }): JSX.Element {
        const onClick = () => {
            setColorBars(bars)
            setColorCables(cables)
            setShowFaces(bars && cables)
        }
        const color = bars === colorBars && cables === colorCables ? "success" : "secondary"
        const iconColor = bars && cables ? "white" : bars ? HOT_COLOR : COLD_COLOR
        const style = {
            color: iconColor,
        }
        return <Button style={style} disabled={pretenst === 0} color={color}
                       onClick={onClick}>{children}</Button>
    }

    function PretenstButton({pretenstValue, children}: {
        pretenstValue: number,
        children: JSX.Element | JSX.Element[],
    }): JSX.Element {
        const onClick = () => setPretenst(pretenstValue)
        const chosen = pretenst === pretenstValue
        const color = chosen ? "success" : "secondary"
        return <Button color={color} disabled={chosen} onClick={onClick}>{children}</Button>
    }

    return (
        <Navbar style={{borderStyle: "none"}}>
            {selectedFace ? (
                <ButtonGroup>
                    {!selectedFace.face.canGrow ? undefined : (
                        <Button onClick={() => grow(selectedFace.face)}><FaSun/> Grow</Button>
                    )}
                    {selectedFace.adjacentIntervals === AdjacentIntervals.None ? (
                        <Button onClick={() => faceNextAdjacent(selectedFace)}>Click sphere to select
                            bars/cables</Button>
                    ) : (
                        <>
                            <Button onClick={adjustValue(true)}>L<FaArrowUp/></Button>
                            <Button onClick={adjustValue(false)}>L<FaArrowDown/></Button>
                            <Button onClick={() => faceNextAdjacent(selectedFace)}>
                                Click sphere to make selections
                            </Button>
                        </>
                    )}
                    <Button onClick={onCancel}><FaTimesCircle/></Button>
                </ButtonGroup>
            ) : (
                <>
                    <ButtonGroup>
                        <Button onClick={clearFabric}><FaListAlt/></Button>
                        <Button onClick={onRecycle}><FaRecycle/></Button>
                    </ButtonGroup>
                    <ButtonGroup style={{paddingLeft: "1em"}}>
                        <PretenstButton pretenstValue={0.0}>
                            <FaYinYang/>
                            <span> Slack</span>
                        </PretenstButton>
                        <PretenstButton pretenstValue={0.1}>
                            <FaBolt/>
                            <span> Pretenst</span>
                        </PretenstButton>
                    </ButtonGroup>
                    <div style={{display: "flex", paddingLeft: "2em"}}>
                        <ViewButton bars={true} cables={true}>
                            <FaHandPointUp/>
                            <span> Faces</span>
                        </ViewButton>
                        <ButtonGroup style={{paddingLeft: "0.6em", display: "flex"}}>
                            <ViewButton bars={true} cables={false}>
                                <FaCircle/>
                                <span> Bars</span>
                            </ViewButton>
                            <StrainPanel fabric={fabric} busy={busy} bars={true}
                                         colorBars={colorBars} colorCables={colorCables}/>
                        </ButtonGroup>
                        <ButtonGroup style={{paddingLeft: "0.6em", display: "flex"}}>
                            <ViewButton bars={false} cables={true}>
                                <FaDotCircle/>
                                <span> Cables</span>
                            </ViewButton>
                            <StrainPanel fabric={fabric} busy={busy} bars={false}
                                         colorBars={colorBars} colorCables={colorCables}/>
                        </ButtonGroup>
                    </div>
                    <ButtonGroup style={{paddingLeft: "1em"}}>
                        <Button disabled={pretenst === 0}
                                onClick={() => fabric.instance.engine.setAltitude(10)}><FaParachuteBox/></Button>
                        <Button onClick={() => fabric.instance.engine.centralize()}><FaCompressArrowsAlt/></Button>
                        <Button onClick={() => setAutoRotate(!autoRotate)}><FaSyncAlt/></Button>
                        <Button color={fastMode ? "secondary" : "warning"} onClick={() => setFastMode(!fastMode)}>
                            <FaRunning/>
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup style={{paddingLeft: "1em"}}>
                        <Button onClick={() => saveCSVFiles(fabric)}><FaFileCsv/></Button>
                        <Button onClick={() => saveOBJFile(fabric)}><FaCubes/></Button>
                    </ButtonGroup>
                </>
            )}
        </Navbar>
    )
}

