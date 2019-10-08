/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaTimesCircle } from "react-icons/all"
import { Button, ButtonGroup, Col, Container, Input, InputGroup, InputGroupAddon, Progress, Row } from "reactstrap"

import { IntervalRole, Limit } from "../fabric/fabric-engine"
import { IInterval, selectModeBars, selectModeSlack, StressSelectMode } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

interface IElastic {
    strands: number,
    factor: number,
}

const THICKNESSES = [3, 6, 12, 24, 48]
const MID_STRAND = THICKNESSES [Math.ceil(THICKNESSES.length / 2) - 1]
const ELASTICS: IElastic[] = THICKNESSES.map(strands => ({strands, factor: strands / MID_STRAND}))

export function StressSelectionPanel({fabric, stressSelectMode, cancelSelection}: {
    fabric: TensegrityFabric,
    stressSelectMode: StressSelectMode,
    cancelSelection: () => void,
}): JSX.Element {

    const engine = fabric.instance.engine
    const barMode = selectModeBars(stressSelectMode)
    const slackMode = selectModeSlack(stressSelectMode)
    const currentMinDisplacement = () => engine.getLimit(barMode ? Limit.MinBarDisplacement : Limit.MinCableDisplacement)
    const currentMaxDisplacement = () => engine.getLimit(barMode ? Limit.MaxBarDisplacement : Limit.MaxCableDisplacement)

    const [nuance, setNuance] = useState(0.5)
    const [minDisplacement, setMinDisplacement] = useState(currentMinDisplacement)
    const [maxDisplacement, setMaxDisplacement] = useState(currentMaxDisplacement)
    const [displacement, setDisplacement] = useState((currentMinDisplacement() + currentMaxDisplacement()) / 2)

    useEffect(() => {
        const min = currentMinDisplacement()
        const max = currentMaxDisplacement()
        setMinDisplacement(min)
        setMaxDisplacement(max)
        const newDisplacement = (1 - nuance) * min + nuance * max
        setDisplacement(newDisplacement)
        fabric.intervals.forEach(intervalSelection(newDisplacement))
    }, [nuance])

    function adjustment(up: boolean): number {
        const factor = 1.1
        return up ? factor : (1 / factor)
    }

    function intervalSelection(dispThreshold: number): (interval: IInterval) => void {
        return interval => {
            const directionalDisp = fabric.instance.getIntervalDisplacement(interval.index)
            const selectIf = (selectBars: boolean, greaterThan: boolean) => {
                const intervalIsBar = interval.intervalRole === IntervalRole.Bar
                if (intervalIsBar !== selectBars) {
                    interval.selected = false
                    return
                }
                const intervalDisp = intervalIsBar ? -directionalDisp : directionalDisp
                interval.selected = greaterThan ? intervalDisp > dispThreshold : intervalDisp < dispThreshold
            }
            switch (stressSelectMode) {
                case StressSelectMode.SlackestBars:
                    selectIf(true, false)
                    break
                case StressSelectMode.SlackestCables:
                    selectIf(false, false)
                    break
                case StressSelectMode.TightestBars:
                    selectIf(true, true)
                    break
                case StressSelectMode.TightestCables:
                    selectIf(false, true)
                    break
            }
        }
    }

    const NuanceAdjustmentButtons = () => {
        const adjustValue = (percentChange: number) => () => {
            const unboundedNuance = nuance + percentChange / 100
            const nuanceValue = unboundedNuance > 1 ? 1 : unboundedNuance < 0 ? 0 : unboundedNuance
            setNuance(nuanceValue)
        }
        return (
            <ButtonGroup size="sm" className="w-100">
                <Button onClick={adjustValue(1)}><FaArrowUp/>1%</Button>
                <Button onClick={adjustValue(-1)}><FaArrowDown/>1%</Button>
                <Button onClick={adjustValue(5)}><FaArrowUp/>5%</Button>
                <Button onClick={adjustValue(-5)}><FaArrowDown/>5%</Button>
            </ButtonGroup>
        )
    }

    const AdjustmentButtons = () => {
        const adjustLength = (up: boolean) => () => {
            fabric.selectedIntervals.forEach(interval => engine.multiplyRestLength(interval.index, adjustment(up)))
            fabric.selectNone()
        }
        const adjustElasticFactor = (elasticFactor: number) => {
            fabric.selectedIntervals.forEach(interval => engine.setElasticFactor(interval.index, elasticFactor))
        }
        return (
            <ButtonGroup size="sm" style={{width: "100%"}}>
                <Button onClick={adjustLength(true)}>L<FaArrowUp/></Button>
                <Button onClick={adjustLength(false)}>L<FaArrowDown/></Button>
                {ELASTICS.map(elastic => (
                    <Button key={elastic.strands}
                            onClick={() => adjustElasticFactor(elastic.factor)}>T{elastic.strands}</Button>
                ))}
            </ButtonGroup>
        )
    }

    const percent = nuance * 100
    return (
        <Container style={{paddingRight: 0, paddingLeft: 0}}>
            <Row>
                <Col md="1">
                    <span className="text-white">{stressSelectMode}</span>
                </Col>
                <Col md="5">
                    <Row>
                        <Col md={12}>
                            <NuanceAdjustmentButtons/>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <div style={PROGRESS_BOX}>
                                <Progress
                                    className={slackMode ? "h-100" : "float-right h-100"}
                                    value={slackMode ? percent : 100 - percent}
                                    max={100}
                                    color="success"
                                    bar={true}
                                >{percent.toFixed(0)}%</Progress>
                            </div>
                        </Col>
                    </Row>
                </Col>
                <Col md="5">
                    <Row>
                        <Col md={12} className="flex-fill">
                            <AdjustmentButtons/>
                        </Col>
                    </Row>
                    <Row noGutters={true} className="my-1">
                        <Col md={4}>
                            <InputGroup size="sm">
                                <InputGroupAddon addonType="prepend">Min</InputGroupAddon>
                                <Input size={5} disabled={true} value={minDisplacement.toFixed(3)}/>
                            </InputGroup>
                        </Col>
                        <Col md={4}>
                            <InputGroup size="sm">
                                <InputGroupAddon addonType="prepend">Max</InputGroupAddon>
                                <Input size={5} disabled={true} value={maxDisplacement.toFixed(3)}/>
                            </InputGroup>
                        </Col>
                        <Col md={4}>
                            <InputGroup size="sm">
                                <InputGroupAddon style={{color: "green"}} addonType="prepend">Now</InputGroupAddon>
                                <Input style={{color: "green"}} disabled={true}
                                       value={`${slackMode ? "<" : ">"}${displacement.toFixed(3)}`}/>
                            </InputGroup>
                        </Col>
                    </Row>
                </Col>
                <Col md="1">
                    <ButtonGroup size="sm" styl={{height: "100%"}} vertical={false}>
                        <Button onClick={() => {
                            fabric.selectNone()
                            cancelSelection()
                        }}><FaTimesCircle/></Button>
                    </ButtonGroup>
                </Col>
            </Row>
        </Container>
    )
}

const PROGRESS_BOX = {
    borderColor: "white", borderStyle: "solid", borderWidth: "1px",
    marginTop: "3px",
    height: "100%", borderRadius: "3px",
}
