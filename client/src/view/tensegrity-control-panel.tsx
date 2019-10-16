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
    FaDiceFour,
    FaDiceOne,
    FaDiceThree,
    FaDiceTwo,
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
} from "react-icons/all"
import { Button, ButtonGroup, Navbar } from "reactstrap"

import { LifePhase } from "../fabric/fabric-engine"
import { createConnectedBrick } from "../fabric/tensegrity-brick"
import {
    AdjacentIntervals,
    bySelectedFace,
    IFace,
    IPercent,
    ISelectedFace,
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
    lifePhase: LifePhase,
    setMature: () => void,
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
        fabric, busy, clearFabric, rebuildFabric, lifePhase, setMature, setShowFaces, selectedFace, setSelectedFace,
        autoRotate, setAutoRotate, fastMode, setFastMode,
    }: IControlPanel): JSX.Element {

    const [colorBars, setColorBars] = useState(true)
    const [colorCables, setColorCables] = useState(true)
    const [lengthAdjustable, setLengthAdjustable] = useState(false)

    useEffect(() => fabric.instance.engine.setColoring(colorBars, colorCables), [colorBars, colorCables])

    useEffect(() => {
        if (lifePhase === LifePhase.Mature) {
            setShowFaces(true)
            setColorBars(true)
            setColorCables(true)
        }
    }, [lifePhase])

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

    function ViewButton({bars, cables, children}: {
        bars: boolean,
        cables: boolean,
        children: JSX.Element | JSX.Element[],
    }): JSX.Element {
        const faces = bars && cables
        const onClick = () => {
            setColorBars(bars)
            setColorCables(cables)
            setShowFaces(faces)
            if (selectedFace) {
                setSelectedFace()
            }
        }
        const color = bars === colorBars && cables === colorCables ? "success" : "secondary"
        const iconColor = faces ? "white" : bars ? HOT_COLOR : COLD_COLOR
        const style = {
            color: iconColor,
        }
        return <Button style={style} disabled={lifePhase !== LifePhase.Mature} color={color}
                       onClick={onClick}>{children}</Button>
    }

    function FaceAdjacentButton({selected, adjacentIntervals}: {
        selected: ISelectedFace,
        adjacentIntervals: AdjacentIntervals,
    }): JSX.Element {
        let icon = <FaCircle/>
        switch (adjacentIntervals) {
            case AdjacentIntervals.Cables:
                icon = <FaDiceOne/>
                break
            case AdjacentIntervals.Bars:
                icon = <FaDiceTwo/>
                break
            case AdjacentIntervals.Face:
                icon = <FaDiceThree/>
                break
            case AdjacentIntervals.Brick:
                icon = <FaDiceFour/>
                break
            case AdjacentIntervals.None:
                icon = <FaTimesCircle/>
                break
        }
        const onClick = () => {
            if (adjacentIntervals === AdjacentIntervals.None) {
                fabric.clearSelection()
                setSelectedFace(undefined)
                setLengthAdjustable(false)
                return
            }
            const newSelected: ISelectedFace = {...selected, adjacentIntervals}
            setLengthAdjustable(fabric.selectIntervals(bySelectedFace(newSelected)) > 0)
            setSelectedFace(newSelected)
        }
        const none = adjacentIntervals === AdjacentIntervals.None
        const chosen = selected.adjacentIntervals === adjacentIntervals
        const color = none ? "warning" : chosen ? "success" : "secondary"
        return (
            <Button color={color} disabled={chosen && !none} onClick={onClick}>
                {icon}
            </Button>
        )
    }

    return (
        <Navbar style={{borderStyle: "none"}}>
            <ButtonGroup>
                <Button onClick={clearFabric}><FaListAlt/></Button>
                <Button onClick={onRecycle}><FaRecycle/></Button>
            </ButtonGroup>
            <ButtonGroup style={{paddingLeft: "1em"}}>
                <Button
                    color={lifePhase !== LifePhase.Mature ? "success" : "secondary"}
                    disabled={lifePhase === LifePhase.Mature} onClick={setMature}>
                    <FaBolt/>
                    <span> Pretenst</span>
                </Button>
            </ButtonGroup>
            <div style={{display: "flex", paddingLeft: "2em"}}>
                <ViewButton bars={true} cables={true}>
                    <FaHandPointUp/>
                    <span> Faces</span>
                </ViewButton>
                {selectedFace ? (
                    <ButtonGroup style={{paddingLeft: "0.6em", width: "30em"}}>
                        <Button disabled={!selectedFace.face.canGrow} onClick={() => grow(selectedFace.face)}>
                            <FaSun/>
                        </Button>
                        <Button disabled={!lengthAdjustable} onClick={adjustValue(true)}>
                            <FaArrowUp/>
                        </Button>
                        <Button disabled={!lengthAdjustable} onClick={adjustValue(false)}>
                            <FaArrowDown/>
                        </Button>
                        {Object.keys(AdjacentIntervals).map(key => (
                            <FaceAdjacentButton
                                key={key}
                                selected={selectedFace}
                                adjacentIntervals={AdjacentIntervals[key]}
                            />
                        ))}
                    </ButtonGroup>
                ) : (
                    <div style={{display: "flex", width: "30em"}}>
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
                )}
            </div>
            <ButtonGroup style={{paddingLeft: "1em"}}>
                <Button disabled={lifePhase !== LifePhase.Mature}
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
        </Navbar>
    )
}

