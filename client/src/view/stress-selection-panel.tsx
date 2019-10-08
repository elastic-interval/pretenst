/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaArrowDown, FaArrowUp, FaTimes } from "react-icons/all"
import { Button, ButtonGroup, Progress } from "reactstrap"

import { IntervalRole, Limit } from "../fabric/fabric-engine"
import { StressSelectMode } from "../fabric/tensegrity-brick-types"
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

    const [nuance, setNuance] = useState(0)

    const displacementFromNuance = (nuanceValue: number) => {
        const engine = fabric.instance.engine
        const selectModeBars = stressSelectMode === StressSelectMode.Bars
        const min = engine.getLimit(selectModeBars ? Limit.MinBarDisplacement : Limit.MinCableDisplacement)
        const max = engine.getLimit(selectModeBars ? Limit.MaxBarDisplacement : Limit.MaxCableDisplacement)
        return (1 - nuanceValue) * min + nuanceValue * max
    }

    function adjustment(up: boolean): number {
        const factor = 1.1
        return up ? factor : (1 / factor)
    }

    const NuanceAdjustmentButtons = () => {
        const adjustValue = (percentChange: number) => () => {
            const unboundedNuance = nuance + percentChange / 100
            const nuanceValue = unboundedNuance > 1 ? 1 : unboundedNuance < 0 ? 0 : unboundedNuance
            const threshold = displacementFromNuance(nuanceValue)
            fabric.intervals.forEach(interval => {
                const selectModeBars = stressSelectMode === StressSelectMode.Bars
                const isBar = interval.intervalRole === IntervalRole.Bar
                if (selectModeBars !== isBar) {
                    interval.selected = false
                } else {
                    const displacement = fabric.instance.getIntervalDisplacement(interval.index) * (isBar ? -1 : 1)
                    interval.selected = nuanceValue < 0.5 ? displacement < threshold : displacement > threshold
                }
            })
            setNuance(nuanceValue)
            switch (stressSelectMode) {
                case StressSelectMode.Bars:
                    fabric.instance.engine.setSlackLimits(nuanceValue, 0)
                    break
                case StressSelectMode.Cables:
                    fabric.instance.engine.setSlackLimits(0, nuanceValue)
            }
        }
        return (
            <ButtonGroup>
                <Button onClick={adjustValue(1)}><FaArrowUp/>1%</Button>
                <Button onClick={adjustValue(-1)}><FaArrowDown/>1%</Button>
                <Button onClick={adjustValue(5)}><FaArrowUp/>5%</Button>
                <Button onClick={adjustValue(-5)}><FaArrowDown/>5%</Button>
            </ButtonGroup>
        )
    }

    const LengthAdjustmentButtons = () => {
        const adjustValue = (up: boolean) => () => {
            const engine = fabric.instance.engine
            fabric.selectedIntervals.forEach(interval => engine.multiplyRestLength(interval.index, adjustment(up)))
        }
        return (
            <ButtonGroup>
                <Button onClick={adjustValue(true)}>
                    <FaArrowUp/>Longer
                </Button>
                <Button onClick={adjustValue(false)}>
                    <FaArrowDown/>Shorter
                </Button>
            </ButtonGroup>
        )
    }

    const ElasticFactorButtons = () => {
        const onClick = (elasticFactor: number) => {
            const engine = fabric.instance.engine
            fabric.selectedIntervals.forEach(interval => engine.setElasticFactor(interval.index, elasticFactor))
        }
        return (
            <ButtonGroup>
                {ELASTICS.map(elastic => (
                    <Button key={elastic.strands} onClick={() => onClick(elastic.factor)}>{elastic.strands}</Button>
                ))}
            </ButtonGroup>
        )
    }

    function CancelButton(): JSX.Element {
        const onCancel = () => {
            fabric.selectNone()
            cancelSelection()
        }
        return (
            <Button onClick={onCancel}><FaTimes/>Cancel</Button>
        )
    }

    const percent = nuance * 100
    return (
        <div style={{display: "block"}}>
            <div style={{display: "inline-flex"}}>
                <NuanceAdjustmentButtons/>&nbsp;
                <LengthAdjustmentButtons/>&nbsp;
                <ElasticFactorButtons/>&nbsp;
                <CancelButton/>
            </div>
            <div className="m-1">
                <Progress
                    value={percent}
                    max={100}
                    color="success"
                    bar={true}
                >
                    {percent.toFixed(0)}
                </Progress>
            </div>
        </div>
    )
}

