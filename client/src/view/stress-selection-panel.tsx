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
    Progress,
    Row,
} from "reactstrap"

import { IntervalRole, Limit } from "../fabric/fabric-engine"
import {
    IInterval,
    ISelectedStress,
    ISelection,
    selectModeBars,
    selectModeSlack,
    StressSelectMode,
} from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

interface IElastic {
    strands: number,
    factor: number,
}

const THICKNESSES = [3, 6, 12, 24, 48]
const MID_STRAND = THICKNESSES [Math.ceil(THICKNESSES.length / 2) - 1]
const ELASTICS: IElastic[] = THICKNESSES.map(strands => ({strands, factor: strands / MID_STRAND}))

export const DEFAULT_SELECTED_STRESS: ISelection = {
    selectedStress: {
        stressSelectMode: StressSelectMode.SlackestCables,
        stressValue: 0.5,
    },
}

export function StressSelectionPanel({fabric, selectedStress, setSelection}: {
    fabric: TensegrityFabric,
    selectedStress: ISelectedStress,
    setSelection: (selection: ISelection) => void,
}): JSX.Element {

    const engine = fabric.instance.engine
    const currentMinDisplacement = () => engine.getLimit(barMode ? Limit.MinBarDisplacement : Limit.MinCableDisplacement)
    const currentMaxDisplacement = () => engine.getLimit(barMode ? Limit.MaxBarDisplacement : Limit.MaxCableDisplacement)
    const [choiceOpen, setChoiceOpen] = useState(false)
    const [nuance, setNuance] = useState(0.5)
    const barMode = selectModeBars(selectedStress.stressSelectMode)
    const slackMode = selectModeSlack(selectedStress.stressSelectMode)
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
    }, [nuance, selectedStress.stressSelectMode])

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
            switch (selectedStress.stressSelectMode) {
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
                <Button onClick={adjustValue(-5)}><FaAngleDoubleLeft/>5%</Button>
                <Button onClick={adjustValue(-1)}><FaAngleLeft/>1%</Button>
                <Button onClick={adjustValue(1)}>1%<FaAngleRight/></Button>
                <Button onClick={adjustValue(5)}>5%<FaAngleDoubleRight/></Button>
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
                    <Button key={elastic.strands} onClick={() => adjustElasticFactor(elastic.factor)}>
                        T{elastic.strands}
                    </Button>
                ))}
            </ButtonGroup>
        )
    }

    const percent = (slackMode ? nuance : 1 - nuance) * 100
    return (
        <Container style={{paddingRight: 0, paddingLeft: 0}}>
            <Row>
                <Col md="2">
                    <ButtonDropdown isOpen={choiceOpen} toggle={() => setChoiceOpen(!choiceOpen)}>
                        <DropdownToggle>{selectedStress.stressSelectMode}</DropdownToggle>
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
                <Col md="4">
                    <Row>
                        <Col md={12}>
                            <NuanceAdjustmentButtons/>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <div style={PROGRESS_BOX}>
                                <Progress color="success" className={slackMode ? "h-100" : "float-right h-100"}
                                          value={percent} max={100} bar={true}
                                >
                                    {percent.toFixed(0)}%
                                </Progress>
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
                            setSelection({})
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
