/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaAngleDoubleLeft,
    FaAngleDoubleRight,
    FaAngleLeft,
    FaAngleRight,
    FaArrowDown,
    FaArrowUp,
    FaEye,
    FaHeart,
    FaTimesCircle,
} from "react-icons/all"
import {
    Button,
    ButtonDropdown,
    ButtonGroup,
    Col,
    Container,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    Progress,
    Row,
} from "reactstrap"

import { Limit } from "../fabric/fabric-engine"
import {
    byDisplacementTreshold,
    ISelectedStress,
    ISelection,
    selectModeBars,
    selectModeSlack,
    StressSelectMode,
} from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { intervalColor } from "./materials"

const ELASTICS = [1, 2, 3, 5, 10]

export const DEFAULT_SELECTED_STRESS: ISelection = {
    selectedStress: {
        stressSelectMode: StressSelectMode.TighterCables,
        stressValue: 0.5,
    },
}

export function DisplacementPanel({fabric, selectedStress, setSelection}: {
    fabric: TensegrityFabric,
    selectedStress: ISelectedStress,
    setSelection: (selection: ISelection) => void,
}): JSX.Element {

    const engine = fabric.instance.engine
    const barMode = selectModeBars(selectedStress.stressSelectMode)
    const slackMode = selectModeSlack(selectedStress.stressSelectMode)

    const [choiceOpen, setChoiceOpen] = useState(false)
    const [nuance, setNuance] = useState(0.5)
    const [showElasticFactor, setShowElasticFactor] = useState(0)

    function adjustment(up: boolean): number {
        const factor = 1.1
        return up ? factor : (1 / factor)
    }

    const NuanceAdjustmentButtons = () => {
        const adjustValue = (percentChange: number) => () => {
            const unboundedNuance = nuance + percentChange / 100
            const nuanceValue = unboundedNuance > 1 ? 1 : unboundedNuance < 0 ? 0 : unboundedNuance
            setNuance(nuanceValue)
        }
        return (
            <ButtonGroup className="w-100">
                <Button onClick={adjustValue(-5)}><FaAngleDoubleLeft/>5%</Button>
                <Button onClick={adjustValue(-1)}><FaAngleLeft/>1%</Button>
                <Button onClick={adjustValue(1)}>1%<FaAngleRight/></Button>
                <Button onClick={adjustValue(5)}>5%<FaAngleDoubleRight/></Button>
            </ButtonGroup>
        )
    }

    const LengthAdjustmentButtons = () => {
        const adjustLength = (up: boolean) => () => {
            fabric.forEachSelected(interval => engine.multiplyRestLength(interval.index, adjustment(up)))
        }
        return (
            <ButtonGroup vertical={true} style={{width: "100%"}}>
                <Button onClick={adjustLength(true)}><FaArrowUp/> Lengthen</Button>
                <Button onClick={adjustLength(false)} className="my-1"><FaArrowDown/> Shorten</Button>
            </ButtonGroup>
        )
    }

    const ElasticFactorAdjustmentButtons = () => {
        const adjustElasticFactor = (elasticFactor: number) => {
            fabric.forEachSelected(interval => engine.setElasticFactor(interval.index, elasticFactor))
        }
        return (
            <ButtonGroup style={{width: "100%"}}>
                {ELASTICS.map(elastic => (
                    <Button key={elastic} onClick={() => adjustElasticFactor(elastic)}>
                        {elastic}X
                    </Button>
                ))}
            </ButtonGroup>
        )
    }

    const ElasticFactorViewButtons = () => {
        const viewElasticFactor = (elasticFactor: number) => {
            if (elasticFactor === showElasticFactor) {
                setShowElasticFactor(0)
                return
            }
            fabric.selectIntervals(interval => {
                if (barMode !== interval.isBar) {
                    return false
                }
                const elastic = fabric.instance.engine.getElasticFactor(interval.index)
                return elasticFactor === elastic
            })
            setShowElasticFactor(elasticFactor)
            fabric.forEachSelected(interval => engine.setElasticFactor(interval.index, elasticFactor))
        }
        return (
            <ButtonGroup radioGroup="elastic" style={{width: "100%"}}>
                {ELASTICS.map(elastic => (
                    <Button
                        color={(elastic === showElasticFactor) ? "success" : "secondary"}
                        radioGroup="elastic" key={elastic}
                        onClick={() => viewElasticFactor(elastic)}
                    ><FaEye/>{elastic}X</Button>
                ))}
            </ButtonGroup>
        )
    }

    const percent = (slackMode ? nuance : 1 - nuance) * 100
    return (
        <Container style={{width: "100em"}}>
            <Row>
                <Col md="5">
                    <Row>
                        <Col md={4}>
                            <ButtonDropdown isOpen={choiceOpen} toggle={() => setChoiceOpen(!choiceOpen)}
                                            style={{width: "10em"}}>
                                <DropdownToggle caret={true}>
                                    {selectedStress.stressSelectMode}
                                </DropdownToggle>
                                <DropdownMenu right={false}>
                                    {Object.keys(StressSelectMode).map(key => {
                                        const stressSelectMode: StressSelectMode = StressSelectMode[key]
                                        const stress = {stressSelectMode, stressValue: 0.5}
                                        const newSelection: ISelection = {selectedStress: stress}
                                        const onClick = () => {
                                            setNuance(stress.stressValue)
                                            setSelection(newSelection)
                                        }
                                        return (
                                            <DropdownItem key={key} onClick={onClick}>
                                                {stressSelectMode}
                                            </DropdownItem>
                                        )
                                    })}
                                </DropdownMenu>
                            </ButtonDropdown>
                        </Col>
                        <Col md={8}>
                            <NuanceAdjustmentButtons/>
                        </Col>
                    </Row>
                    <Row noGutters={true}>
                        <Col md={5}>
                            <div style={PROGRESS_BOX}>
                                <Progress
                                    className={`${slackMode ? "h-100" : "float-right h-100"} ${barMode ? "bar" : "cable"}`}
                                    value={percent} max={100} bar={true}
                                >{percent.toFixed(0)}%</Progress>
                            </div>
                        </Col>
                        <Col md={7} className="my-1">
                            <NumbersPanel
                                fabric={fabric}
                                selectedStress={selectedStress}
                                showElasticFactor={showElasticFactor}
                                nuance={nuance}
                                barMode={barMode}
                                slackMode={slackMode}
                            />
                        </Col>
                    </Row>
                </Col>
                <Col md="2">
                    <Row>
                        <Col md={12} className="flex-fill">
                            <LengthAdjustmentButtons/>
                        </Col>
                    </Row>
                </Col>
                <Col md="4">
                    <Row>
                        <Col md={12} className="flex-fill">
                            <ElasticFactorAdjustmentButtons/>
                        </Col>
                    </Row>
                    <Row noGutters={true} className="my-1">
                        <Col md={12} className="flex-fill">
                            <ElasticFactorViewButtons/>
                        </Col>
                    </Row>
                </Col>
                <Col md="1">
                    <ButtonGroup styl={{height: "100%"}} vertical={false}>
                        <Button onClick={() => {
                            fabric.clearSelection()
                            setSelection({})
                        }}><FaTimesCircle/></Button>
                    </ButtonGroup>
                </Col>
            </Row>
        </Container>
    )
}

const PROGRESS_BOX = {
    borderColor: "white", borderStyle: "solid", borderWidth: "1px", borderRadius: "3px",
    marginTop: "4px",
    height: "2em",
    backgroundColor: "black",
}

const NumbersPanel = ({fabric, selectedStress, showElasticFactor, nuance, barMode, slackMode}: {
    fabric: TensegrityFabric,
    selectedStress: ISelectedStress,
    showElasticFactor: number,
    nuance: number,
    barMode: boolean,
    slackMode: boolean,
}) => {
    const engine = fabric.instance.engine
    const currentMinDisplacement = () => engine.getLimit(barMode ? Limit.MinBarDisplacement : Limit.MinCableDisplacement)
    const currentMaxDisplacement = () => engine.getLimit(barMode ? Limit.MaxBarDisplacement : Limit.MaxCableDisplacement)
    const [minDisplacement, setMinDisplacement] = useState(currentMinDisplacement)
    const [maxDisplacement, setMaxDisplacement] = useState(currentMaxDisplacement)
    const [displacement, setDisplacement] = useState((currentMinDisplacement() + currentMaxDisplacement()) / 2)
    const [pump, setPump] = useState(false)

    function refresh(): void {
        if (showElasticFactor > 0) {
            fabric.setDisplacementThreshold(1000, barMode ? StressSelectMode.TighterBars : StressSelectMode.TighterCables)
            return
        }
        const min = currentMinDisplacement()
        const max = currentMaxDisplacement()
        setMinDisplacement(min)
        setMaxDisplacement(max)
        const newDisplacement = (1 - nuance) * min + nuance * max
        setDisplacement(newDisplacement)
        fabric.selectIntervals(byDisplacementTreshold(fabric, newDisplacement, selectedStress.stressSelectMode))
        fabric.setDisplacementThreshold(newDisplacement, selectedStress.stressSelectMode)
        setTimeout(() => setPump(false), 200)
        setPump(true)
    }

    useEffect(() => {
        const timer = setInterval(refresh, 1000)
        return () => clearTimeout(timer)
    }, [nuance, showElasticFactor, selectedStress.stressSelectMode])

    return (
        <InputGroup>
            <InputGroupAddon addonType="prepend">
                <InputGroupText style={{width: "4em", textAlign: "right"}}>
                    {minDisplacement.toFixed(3)}
                </InputGroupText>
            </InputGroupAddon>
            <Input style={{color: intervalColor(barMode), textAlign: "center"}} disabled={true}
                   value={`${barMode ? "Bars" : "Cables"} ${slackMode ? "<" : ">"} ${displacement.toFixed(3)}`}/>
            <InputGroupAddon addonType="append">
                <InputGroupText style={{width: "4em", textAlign: "right"}}>
                    {maxDisplacement.toFixed(3)}
                </InputGroupText>
                <InputGroupText style={{color: pump ? intervalColor(barMode) : "white"}}>
                    <FaHeart/>
                </InputGroupText>
            </InputGroupAddon>
        </InputGroup>
    )
}
