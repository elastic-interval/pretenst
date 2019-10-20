/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp, FaBars, FaBiohazard,
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
    FaParachuteBox, FaRadiationAlt,
    FaRunning,
    FaSun,
    FaSyncAlt,
    FaTimesCircle,
} from "react-icons/all"
import { Button, ButtonGroup, Navbar } from "reactstrap"

import { doNotTouch, LifePhase } from "../fabric/fabric-engine"
import { createConnectedBrick, optimizeFabric } from "../fabric/tensegrity-brick"
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
    clearFabric: () => void,
    setShowFaces: (showFaces: boolean) => void
    selectedFace?: ISelectedFace,
    setSelectedFace: (selectedFace?: ISelectedFace) => void,
    autoRotate: boolean,
    setAutoRotate: (autoRotate: boolean) => void,
    fastMode: boolean,
    setFastMode: (fastMode: boolean) => void,
    showFeatures: boolean,
    setShowFeatures: (showFeatures: boolean) => void
    children: (JSX.Element | undefined)[] | JSX.Element | string,
}

export function TensegrityControlPanel(
    {
        fabric, clearFabric, setShowFaces, selectedFace, setSelectedFace,
        autoRotate, setAutoRotate, fastMode, setFastMode, showFeatures, setShowFeatures, children,
    }: IControlPanel): JSX.Element {

    const lifePhase = fabric.lifePhase

    const [colorBars, setColorBars] = useState(true)
    const [colorCables, setColorCables] = useState(true)
    const [lengthAdjustable, setLengthAdjustable] = useState(false)

    useEffect(() => fabric.instance.engine.setColoring(colorBars, colorCables), [colorBars, colorCables])

    function adjustment(up: boolean): number {
        const factor = 1.03
        return up ? factor : (1 / factor)
    }

    const adjustValue = (up: boolean) => () => {
        fabric.forEachSelected(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment(up))
        })
    }

    const grow = (face: IFace, scale?: IPercent) => {
        createConnectedBrick(face.brick, face.triangle, percentOrHundred(scale))
        setSelectedFace(undefined)
    }

    function ViewButton({bars, cables}: { bars: boolean, cables: boolean }): JSX.Element {
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
        return <Button style={style} disabled={doNotTouch(lifePhase)} color={color}
                       onClick={onClick}>
            {bars && cables ? (<><FaHandPointUp/><span> Faces</span></>) :
                bars ? (<><FaCircle/><span> Bars</span></>) : (<><FaDotCircle/><span> Cables</span></>)}
        </Button>
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

    const engine = fabric.instance.engine
    return (
        <Navbar style={{borderStyle: "none"}}>
            <ButtonGroup>
                {children}
            </ButtonGroup>
            <ButtonGroup style={{paddingLeft: "1em"}}>
                <Button onClick={clearFabric}><FaListAlt/> Choose</Button>
            </ButtonGroup>
            <div style={{display: "flex", paddingLeft: "2em"}}>
                <ViewButton bars={true} cables={true}/>
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
                            <ViewButton bars={true} cables={false}/>
                            <StrainPanel fabric={fabric} bars={true} colorBars={colorBars} colorCables={colorCables}/>
                        </ButtonGroup>
                        <ButtonGroup style={{paddingLeft: "0.6em", display: "flex"}}>
                            <ViewButton bars={false} cables={true}/>
                            <StrainPanel fabric={fabric} bars={false} colorBars={colorBars} colorCables={colorCables}/>
                        </ButtonGroup>
                    </div>
                )}
            </div>
            <ButtonGroup size="sm" style={{paddingLeft: "1em"}}>
                <Button disabled={lifePhase !== LifePhase.Shaping} onClick={() => optimizeFabric(fabric, true)}>
                    <FaBiohazard/>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Shaping} onClick={() => optimizeFabric(fabric, false)}>
                    <FaRadiationAlt/>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Pretenst} onClick={() => engine.setAltitude(60, 10000)}>
                    <FaParachuteBox/>
                </Button>
                <Button onClick={() => fabric.instance.engine.centralize()}>
                    <FaCompressArrowsAlt/>
                </Button>
                <Button onClick={() => setAutoRotate(!autoRotate)}>
                    <FaSyncAlt/>
                </Button>
                <Button onClick={() => setShowFeatures(!showFeatures)}>
                    <FaBars/>
                </Button>
                <Button color={fastMode ? "secondary" : "warning"} onClick={() => setFastMode(!fastMode)}>
                    <FaRunning/>
                </Button>
                <Button onClick={() => saveCSVFiles(fabric)}>
                    <FaFileCsv/>
                </Button>
                <Button onClick={() => saveOBJFile(fabric)}>
                    <FaCubes/>
                </Button>
            </ButtonGroup>
        </Navbar>
    )
}

