/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaBolt, FaSun, FaTimesCircle, FaYinYang } from "react-icons/all"
import { Button, ButtonGroup, Col, Container, Row } from "reactstrap"

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

export function EditPanel({fabric, pretenst, setPretenst, selectedFace, setSelectedFace}: {
    fabric: TensegrityFabric,
    pretenst: number,
    setPretenst: (pretenst: number) => void,
    selectedFace?: ISelectedFace,
    setSelectedFace: (selectedFace?: ISelectedFace) => void,
}): JSX.Element {

    const [colorBars, setColorBars] = useState(true)
    const [colorCables, setColorCables] = useState(true)

    useEffect(() => fabric.instance.engine.setColoring(colorBars, colorCables), [colorBars, colorCables])

    useEffect(() => {
        if (pretenst === 0) {
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
                <Container>
                    <Row>
                        <Col xs="3">
                            <ButtonGroup>
                                <Button
                                    color={pretenst === 0.1 ? "success" : "secondary"}
                                    onClick={() => setPretenst(0.1)}>
                                    <FaBolt/>&nbsp;Pretenst
                                </Button>
                                <Button
                                    color={pretenst === 0.0 ? "success" : "secondary"}
                                    onClick={() => setPretenst(0.0)}>
                                    <FaYinYang/>&nbsp;Slack
                                </Button>
                            </ButtonGroup>
                        </Col>
                        <Col xs="3">
                            <ButtonGroup>
                                <Button
                                    color={colorBars && colorCables ? "success" : "secondary"}
                                    onClick={() => {
                                        if (pretenst === 0) {
                                            return
                                        }
                                        setColorBars(true)
                                        setColorCables(true)
                                    }}>Both</Button>
                                <Button
                                    color={colorBars && !colorCables ? "success" : "secondary"}
                                    onClick={() => {
                                        if (pretenst === 0) {
                                            return
                                        }
                                        setColorBars(true)
                                        setColorCables(false)
                                    }}>
                                    Bars
                                </Button>
                                <Button
                                    color={colorCables && !colorBars ? "success" : "secondary"}
                                    onClick={() => {
                                        if (pretenst === 0) {
                                            return
                                        }
                                        setColorBars(false)
                                        setColorCables(true)
                                    }}>
                                    Cables
                                </Button>
                            </ButtonGroup>
                        </Col>
                        <StrainPanel fabric={fabric}/>
                    </Row>
                </Container>
            )}
        </div>
    )
}

