/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaTimes } from "react-icons/all"
import { Button, ButtonGroup, Progress } from "reactstrap"

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

    const barMode = selectModeBars(stressSelectMode)
    const slackMode = selectModeSlack(stressSelectMode)

    const [nuance, setNuance] = useState(0.5)

    useEffect(() => fabric.intervals.forEach(intervalSelection(nuanceToDisplacement(nuance))), [nuance])

    const nuanceToDisplacement = (nuanceValue: number) => {
        const engine = fabric.instance.engine
        const min = engine.getLimit(barMode ? Limit.MinBarDisplacement : Limit.MinCableDisplacement)
        const max = engine.getLimit(barMode ? Limit.MaxBarDisplacement : Limit.MaxCableDisplacement)
        return (1 - nuanceValue) * min + nuanceValue * max
    }

    function adjustment(up: boolean): number {
        const factor = 1.1
        return up ? factor : (1 / factor)
    }

    function intervalSelection(displacementThreshold: number): (interval: IInterval) => void {
        return interval => {
            const directionalDisplacement = fabric.instance.getIntervalDisplacement(interval.index)
            const selectIf = (selectBars: boolean, greaterThan: boolean) => {
                const intervalIsBar = interval.intervalRole === IntervalRole.Bar
                if (intervalIsBar !== selectBars) {
                    interval.selected = false
                    return
                }
                const displacement = intervalIsBar ? -directionalDisplacement : directionalDisplacement
                interval.selected = greaterThan ? displacement > displacementThreshold : displacement < displacementThreshold
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
    const disp = nuanceToDisplacement(nuance).toFixed(3)
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
                    className={slackMode ? "" : "float-right"}
                    style={{flexDirection: "unset"}}
                    value={slackMode ? percent : 100 - percent}
                    max={100}
                    color="success"
                    bar={true}
                >
                    {percent.toFixed(0)}%={disp}
                </Progress>
            </div>
        </div>
    )
}

