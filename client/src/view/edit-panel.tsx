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
    FaDotCircle,
    FaHandPointUp,
    FaSun,
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

import { StrainPanel } from "./strain-panel"

export function EditPanel({fabric, pretenst, setPretenst, setShowFaces, selectedFace, setSelectedFace}: {
    fabric: TensegrityFabric,
    pretenst: number,
    setPretenst: (pretenst: number) => void,
    setShowFaces: (showFaces: boolean) => void
    selectedFace?: ISelectedFace,
    setSelectedFace: (selectedFace?: ISelectedFace) => void,
}): JSX.Element {

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

    const grow = (face: IFace, scale?: IPercent) => {
        createConnectedBrick(face.brick, face.triangle, percentOrHundred(scale))
        setSelectedFace(undefined)
    }

    const faceNextAdjacent = (face: ISelectedFace) => {
        const nextAdjacentFace = nextAdjacent(face)
        fabric.selectIntervals(bySelectedFace(nextAdjacentFace))
        setSelectedFace(nextAdjacentFace)
    }

    function CancelButton(): JSX.Element {
        const onCancel = () => {
            fabric.clearSelection()
            setSelectedFace(undefined)
        }
        return (
            <Button onClick={onCancel}><FaTimesCircle/></Button>
        )
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
        return <Button disabled={pretenst === 0} color={color} onClick={onClick}>{children}</Button>
    }

    function PretenstButton({pretenstValue, children}: {
        pretenstValue: number,
        children: JSX.Element | JSX.Element[],
    }): JSX.Element {
        const onClick = () => setPretenst(pretenstValue)
        const color = pretenst === pretenstValue ? "success" : "secondary"
        return <Button color={color} onClick={onClick}>{children}</Button>
    }

    return (
        <div id="bottom-middle">
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
                    <CancelButton/>
                </ButtonGroup>
            ) : (
                <Navbar style={{borderStyle: "none"}}>
                    <ButtonGroup>
                        <PretenstButton pretenstValue={0.0}><FaYinYang/></PretenstButton>
                        <PretenstButton pretenstValue={0.1}><FaBolt/></PretenstButton>
                    </ButtonGroup>
                    <ButtonGroup style={{paddingLeft: "1em"}}>
                        <ViewButton bars={true} cables={true}><FaHandPointUp/></ViewButton>
                    </ButtonGroup>
                    <div style={{paddingLeft: "1em", display: "flex"}}>
                        <ViewButton bars={true} cables={false}><FaCircle/></ViewButton>
                        <StrainPanel fabric={fabric} bars={true} colorBars={colorBars} colorCables={colorCables}/>
                    </div>
                    <div style={{paddingLeft: "1em", display: "inline-flex"}}>
                        <ViewButton bars={false} cables={true}><FaDotCircle/></ViewButton>
                        <StrainPanel fabric={fabric} bars={false} colorBars={colorBars} colorCables={colorCables}/>
                    </div>
                </Navbar>
            )}
        </div>
    )
}

