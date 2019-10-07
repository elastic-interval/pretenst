/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { GetHandleProps, GetRailProps, Handles, Rail, Slider } from "react-compound-slider"
import { FaArrowDown, FaArrowUp } from "react-icons/all"
import { Button, ButtonGroup, Col, Container, Row } from "reactstrap"

import { IntervalRole, Limit } from "../fabric/fabric-engine"
import { IInterval } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

interface IElastic {
    strands: number,
    factor: number,
}

const BUTTON_CLASS = "my-1"
const BUTTON_GROUP_CLASS = "my-3 w-100"
const DOMAIN = [0, 100]
const VALUES = [0]
const THICKNESSES = [3, 6, 12, 24, 48]
const MID_STRAND = THICKNESSES [Math.ceil(THICKNESSES.length / 2) - 1]
const ELASTICS: IElastic[] = THICKNESSES.map(strands => ({strands, factor: strands / MID_STRAND}))

export function AdjustPanel({fabric, setDisplacementSelection}: {
    fabric?: TensegrityFabric,
    setDisplacementSelection: (on: boolean) => void,
}): JSX.Element {

    if (!fabric) {
        return <div/>
    }

    const [barMode, setBarMode] = useState(false)
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

    const IntervalGroupToggle = () => {
        const setAdjustBars = (barsMode: boolean) => {
            setBarMode(barsMode)
            setFabricSlackLimits(barsMode, nuance)
            switchSelection(false)
        }
        return (
            <ButtonGroup className={BUTTON_GROUP_CLASS}>
                <Button disabled={!barMode} className={BUTTON_CLASS} onClick={() => setAdjustBars(false)}>
                    Cables
                </Button>
                <Button disabled={barMode} className={BUTTON_CLASS} onClick={() => setAdjustBars(true)}>
                    Bars
                </Button>
            </ButtonGroup>
        )
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
            <ButtonGroup vertical={true} className={BUTTON_GROUP_CLASS}>
                <Button disabled={!selectOn} className={BUTTON_CLASS} onClick={adjustValue(true)}>
                    <FaArrowUp/> Lengthen
                </Button>
                <Button disabled={!selectOn} className={BUTTON_CLASS} onClick={adjustValue(false)}>
                    <FaArrowDown/> Shorten
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
            <ButtonGroup vertical={true} className={BUTTON_GROUP_CLASS}>{ELASTICS.map(elastic => (
                <Button key={elastic.strands} disabled={!selectOn} className={BUTTON_CLASS}
                        onClick={() => onClick(elastic.factor)}>
                    {elastic.strands}-thick ({elastic.factor.toFixed(3)})
                </Button>
            ))}</ButtonGroup>
        )
    }

    return (
        <Container style={{
            borderColor: "white",
            borderStyle: "solid",
            borderWidth: "1px",
            height: "100%",
        }}>
            <Row className="h-100">
                <Col xs={{size: 5}}>
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
                </Col>
                <Col xs={{size: 7}} className="my-auto">
                    <IntervalGroupToggle/>
                    <LengthAdjustmentButtons/>
                    <ElasticFactorButtons/>
                </Col>
            </Row>
        </Container>
    )
}

function DisplacementSlider({adjustBars, displacementFromNuance, setFabricSlackLimits, nuance, setNuance}: {
    adjustBars: boolean,
    nuance: number,
    setNuance: (nuance: number) => void,
    displacementFromNuance: (nuance: number) => number,
    setFabricSlackLimits: (bars: boolean, nuanceValue: number) => void,
}): JSX.Element {

    const [displacement, setDisplacement] = useState(0)

    useEffect(() => {
        const ticker = setInterval(() => setDisplacement(displacementFromNuance(nuance)), 1000)
        return () => clearInterval(ticker)
    }, [nuance])

    const sliderStyle: CSSProperties = {
        position: "relative",
        height: "90%",
        marginTop: "30%",
        marginBottom: "30%",
        borderRadius: 12,
    }

    const changeNuanceTo = (nuanceValue: number) => {
        setDisplacement(displacementFromNuance(nuanceValue))
        setNuance(nuanceValue)
        setFabricSlackLimits(adjustBars, nuanceValue)
    }

    const onChange = (newSliderValues: number[]) => {
        const percent = newSliderValues[0]
        changeNuanceTo(percent / 100)
    }

    return (
        <Slider rootStyle={sliderStyle} reversed={true} vertical={true}
                step={-0.01} domain={DOMAIN} values={VALUES}
                onChange={onChange}>
            <Rail>{({getRailProps}) => <SliderRail getRailProps={getRailProps}/>}</Rail>
            <Handles>{({handles, getHandleProps}) => (
                <>{
                    handles.map(handle => (
                        <Handle key={handle.id} handle={handle}
                                getHandleProps={getHandleProps}
                                cableDisplacement={displacement}
                        />
                    ))
                }</>
            )}</Handles>
        </Slider>
    )
}

function SliderRail({getRailProps}: { getRailProps: GetRailProps }): JSX.Element {
    const railOuterStyle: CSSProperties = {
        position: "absolute",
        height: "100%",
        width: "6em",
        transform: "translate(1.2em, 0%)",
        borderTopRightRadius: 10,
        borderBottomRightRadius: 7,
        cursor: "pointer",
        border: "1px solid lightgreen",
    }

    const railInnerStyle: CSSProperties = {
        position: "absolute",
        height: "100%",
        width: "1em",
        transform: "translate(1.2em, 0%)",
        borderRadius: 0,
        pointerEvents: "none",
        backgroundColor: "rgb(155,155,155)",
    }

    return (
        <>
            <div style={railOuterStyle} {...getRailProps()} />
            <div style={railInnerStyle}/>
        </>
    )
}

export function Handle({handle, getHandleProps, cableDisplacement}: {
    handle: { id: string, value: number, percent: number },
    getHandleProps: GetHandleProps,
    cableDisplacement: number,
}): JSX.Element {
    return (
        <>
            <div
                style={{
                    top: `${handle.percent}%`,
                    position: "absolute",
                    transform: "translate(1em, -50%)",
                    WebkitTapHighlightColor: "rgba(0,0,0,0)",
                    zIndex: 5,
                    width: 42,
                    height: 28,
                    cursor: "pointer",
                    // border: "1px solid white",
                    backgroundColor: "none",
                }}
                {...getHandleProps(handle.id)}
            />
            <div
                role="slider"
                aria-valuemin={DOMAIN[0]}
                aria-valuemax={DOMAIN[1]}
                aria-valuenow={handle.value}
                style={{
                    top: `${handle.percent}%`,
                    position: "absolute",
                    transform: "translate(1em, -50%)",
                    zIndex: 2,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    boxShadow: "1px 1px 1px 1px rgba(0, 0, 0, 0.3)",
                    backgroundColor: "#00ff00",
                }}
            />
            <div
                role="slider"
                aria-valuemin={DOMAIN[0]}
                aria-valuemax={DOMAIN[1]}
                aria-valuenow={handle.value}
                style={{
                    top: `${handle.percent}%`,
                    position: "absolute",
                    transform: "translate(3em, -50%)",
                    zIndex: 2,
                }}
            >
                {handle.value.toFixed(2)}%
                <br/>
                {cableDisplacement.toFixed(4)}
            </div>
        </>
    )
}
