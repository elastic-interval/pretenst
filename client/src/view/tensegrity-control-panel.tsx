/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp,
    FaBars,
    FaBiohazard,
    FaCamera,
    FaCircle,
    FaCompressArrowsAlt,
    FaCubes,
    FaDotCircle,
    FaFileCsv,
    FaHandPointUp,
    FaListAlt,
    FaParachuteBox,
    FaRadiationAlt,
    FaSyncAlt, FaTimesCircle,
} from "react-icons/all"
import { Button, ButtonGroup, Navbar } from "reactstrap"

import { LifePhase } from "../fabric/life-phase"
import { optimizeFabric } from "../fabric/tensegrity-brick"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"

import { StrainPanel } from "./strain-panel"

interface IControlPanel {
    fabric: TensegrityFabric,
    clearFabric: () => void,
    setShowFaces: (showFaces: boolean) => void
    selectedBrick?: IBrick,
    setSelectedBrick: (selectedFace?: IBrick) => void,
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
        fabric, clearFabric, setShowFaces, selectedBrick, setSelectedBrick,
        autoRotate, setAutoRotate, fastMode, setFastMode, showFeatures, setShowFeatures, children,
    }: IControlPanel): JSX.Element {

    const lifePhase = fabric.lifePhase

    const [colorBars, setColorBars] = useState(true)
    const [colorCables, setColorCables] = useState(true)

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

    function ViewButton({bars, cables}: { bars: boolean, cables: boolean }): JSX.Element {
        const onClick = () => {
            setColorBars(bars)
            setColorCables(cables)
            setShowFaces(bars && cables)
            if (selectedBrick) {
                setSelectedBrick()
            }
        }
        const color = bars === colorBars && cables === colorCables ? "success" : "secondary"
        return <Button style={{color: "white"}} color={color} onClick={onClick}>
            {bars && cables ? (<><FaHandPointUp/><span> Faces</span></>) :
                bars ? (<><FaCircle/><span> Pushes </span></>) : (<><span> Pulls </span><FaDotCircle/></>)}
        </Button>
    }

    const engine = fabric.instance.engine
    return (
        <Navbar style={{borderStyle: "none"}}>
            <ButtonGroup>
                {children}
            </ButtonGroup>
            <ButtonGroup style={{paddingLeft: "1em"}}>
                <Button onClick={clearFabric}><FaListAlt/> Programs</Button>
            </ButtonGroup>
            <div style={{display: "inline-flex", alignContent: "center"}}>
                {selectedBrick ? (
                    <ButtonGroup style={{paddingLeft: "0.6em", width: "40em"}}>
                        <Button disabled={!fabric.splitIntervals} onClick={adjustValue(true)}>
                            <FaArrowUp/><span> Bigger</span>
                        </Button>
                        <Button disabled={!fabric.splitIntervals} onClick={adjustValue(false)}>
                            <FaArrowDown/><span> Smaller</span>
                        </Button>
                        <Button onClick={() => {
                            setSelectedBrick()
                            fabric.clearSelection()
                        }}>
                            <FaTimesCircle/>
                        </Button>
                    </ButtonGroup>
                ) : (
                    <div style={{
                        display: "flex",
                        backgroundColor: "#5f5f5f",
                        padding: "0.5em",
                        borderRadius: "1.5em",
                    }}>
                        <ButtonGroup style={{display: "flex"}}>
                            <StrainPanel fabric={fabric} bars={false} colorBars={colorBars} colorCables={colorCables}/>
                            <ViewButton bars={false} cables={true}/>
                        </ButtonGroup>
                        <ButtonGroup style={{paddingLeft: "0.4em", display: "flex"}}>
                            <ViewButton bars={true} cables={true}/>
                        </ButtonGroup>
                        <ButtonGroup style={{paddingLeft: "0.4em", display: "flex"}}>
                            <ViewButton bars={true} cables={false}/>
                            <StrainPanel fabric={fabric} bars={true} colorBars={colorBars} colorCables={colorCables}/>
                        </ButtonGroup>
                    </div>
                )}
            </div>
            <ButtonGroup style={{paddingLeft: "1em"}}>
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
            </ButtonGroup>
            <ButtonGroup style={{paddingLeft: "1em"}}>
                <Button onClick={() => saveCSVFiles(fabric)}>
                    <FaFileCsv/>
                </Button>
                <Button onClick={() => saveOBJFile(fabric)}>
                    <FaCubes/>
                </Button>
            </ButtonGroup>
            <ButtonGroup style={{paddingLeft: "1em"}}>
                <Button color={fastMode ? "secondary" : "warning"} onClick={() => setFastMode(!fastMode)}>
                    <FaCamera/>
                </Button>
                <Button color={showFeatures ? "warning" : "secondary"} onClick={() => setShowFeatures(!showFeatures)}>
                    <FaBars/>
                </Button>
            </ButtonGroup>
        </Navbar>
    )
}

