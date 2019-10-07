/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaArrowDown, FaArrowUp } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { IntervalRole, Limit } from "../fabric/fabric-engine"
import { IInterval } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { DisplacementSlider } from "./displacement-slider"

interface IElastic {
    strands: number,
    factor: number,
}

const THICKNESSES = [3, 6, 12, 24, 48]
const MID_STRAND = THICKNESSES [Math.ceil(THICKNESSES.length / 2) - 1]
const ELASTICS: IElastic[] = THICKNESSES.map(strands => ({strands, factor: strands / MID_STRAND}))

export function AdjustPanel({fabric, barMode, setDisplacementSelection}: {
    fabric: TensegrityFabric,
    barMode: boolean,
    setDisplacementSelection: (on: boolean) => void,
}): JSX.Element {

    const [selectOn, setSelectOn] = useState(false)
    const [nuance, setNuance] = useState(0)

    const setFabricSlackLimits = (bars: boolean, nuanceValue: number) => {
        if (bars) {
            fabric.instance.engine.setSlackLimits(nuanceValue, 0)
        } else {
            fabric.instance.engine.setSlackLimits(0, nuanceValue)
        }
    }

    const displacementFromNuance = (nuanceValue: number) => {
        const engine = fabric.instance.engine
        const min = engine.getLimit(barMode ? Limit.MinBarDisplacement : Limit.MinCableDisplacement)
        const max = engine.getLimit(barMode ? Limit.MaxBarDisplacement : Limit.MaxCableDisplacement)
        return (1 - nuanceValue) * min + nuanceValue * max
    }

    const switchSelection = (on: boolean) => {
        setDisplacementSelection(on)
        setSelectOn(on)
    }

    function adjustment(up: boolean): number {
        const factor = 1.1
        return up ? factor : (1 / factor)
    }

    const onSelect = (nuanceValue: number) => {
        const isBar = (interval: IInterval) => interval.intervalRole === IntervalRole.Bar
        const displacement = displacementFromNuance(nuanceValue)
        fabric.intervals.forEach(interval => {
            const bar = isBar(interval)
            if (barMode !== bar) {
                interval.selected = false
            } else {
                const intervalDisplacement = fabric.instance.getIntervalDisplacement(interval.index) * (bar ? -1 : 1)
                interval.selected = nuance < 0.5 ? intervalDisplacement < displacement : intervalDisplacement > displacement
            }
        })
        switchSelection(true)
    }

    const LengthAdjustmentButtons = () => {
        const adjustValue = (up: boolean) => () => {
            const engine = fabric.instance.engine
            fabric.selectedIntervals.forEach(interval => engine.multiplyRestLength(interval.index, adjustment(up)))
            switchSelection(false)
        }
        return (
            <ButtonGroup>
                <Button disabled={!selectOn} onClick={adjustValue(true)}>
                    <FaArrowUp/> Longer
                </Button>
                <Button disabled={!selectOn} onClick={adjustValue(false)}>
                    <FaArrowDown/> Shorter
                </Button>
            </ButtonGroup>
        )
    }

    const ElasticFactorButtons = () => {
        const onClick = (elasticFactor: number) => {
            const engine = fabric.instance.engine
            fabric.selectedIntervals.forEach(interval => engine.setElasticFactor(interval.index, elasticFactor))
            switchSelection(false)
        }
        return (
            <ButtonGroup>
                {ELASTICS.map(elastic => (
                    <Button key={elastic.strands} disabled={!selectOn} onClick={() => onClick(elastic.factor)}>
                        "{elastic.strands}" ({elastic.factor.toFixed(3)})
                    </Button>
                ))}
            </ButtonGroup>
        )
    }

    return (
        <div>
            <DisplacementSlider
                adjustBars={barMode}
                nuance={nuance}
                setNuance={(nuanceValue: number) => {
                    setNuance(nuanceValue)
                    if (nuanceValue === 0) {
                        switchSelection(false)
                    }
                    onSelect(nuanceValue)
                }}
                displacementFromNuance={displacementFromNuance}
                setFabricSlackLimits={setFabricSlackLimits}
            />
            <LengthAdjustmentButtons/>
            <ElasticFactorButtons/>
        </div>
    )
}

