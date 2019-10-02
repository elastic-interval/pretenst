/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { GetHandleProps, GetRailProps, Handles, Rail, Slider } from "react-compound-slider"
import { FaArrowDown, FaArrowUp, FaHandPointDown, FaHandPointUp } from "react-icons/all"
import { Button, ButtonGroup, Col, Container, Row } from "reactstrap"

import { IntervalRole, Limit } from "../fabric/fabric-engine"
import { IInterval } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

interface IElastic {
    strands: number,
    factor: number,
}

const BUTTON_CLASS = "my-1 btn-info"
const BUTTON_GROUP_CLASS = "my-3 w-100"
const DOMAIN = [0, 100]
const VALUES = [0]
const THICKNESSES = [6, 10, 12, 14, 16, 18]
const MID_STRAND = THICKNESSES [Math.ceil(THICKNESSES.length / 2) - 1]
const ELASTICS: IElastic[] = THICKNESSES.map(strands => ({strands, factor: strands / MID_STRAND}))

export function AdjustPanel({fabric, setDisplacementSelection}: {
    fabric?: TensegrityFabric,
    setDisplacementSelection: (on: boolean) => void,
}): JSX.Element {

    if (!fabric) {
        return <div/>
    }

    const [adjustBars, setAdjustBarsState] = useState(false)
    const [displacement, setDisplacement] = useState(0)
    const [nuance, setNuance] = useState(0)
    const [selectOn, setSelectOn] = useState(false)

    const setSlackLimits = (bars: boolean, nuanceValue: number) => {
        if (bars) {
            fabric.instance.setSlackLimits(nuanceValue, 0)
        } else {
            fabric.instance.setSlackLimits(0, nuanceValue)
        }
    }

    const displacementFromNuance = (nuanceValue: number) => {
        const min = fabric.instance.getLimit(adjustBars ? Limit.MinBarDisplacement : Limit.MinCableDisplacement)
        const max = fabric.instance.getLimit(adjustBars ? Limit.MaxBarDisplacement : Limit.MaxCableDisplacement)
        return (1 - nuanceValue) * min + nuanceValue * max
    }

    useEffect(() => {
        const ticker = setInterval(() => setDisplacement(displacementFromNuance(nuance)), 1000)
        return () => clearInterval(ticker)
    }, [nuance])

    const changeNuanceTo = (nuanceValue: number) => {
        setNuance(nuanceValue)
        setDisplacement(displacementFromNuance(nuanceValue))
        setSlackLimits(adjustBars, nuanceValue)
    }

    const onChange = (changedPercent: number[]) => {
        const percent = changedPercent[0]
        changeNuanceTo(percent / 100)
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
        const setAdjustBars = (bars: boolean) => {
            setAdjustBarsState(bars)
            setSlackLimits(bars, nuance)
        }
        return (
            <ButtonGroup className={BUTTON_GROUP_CLASS}>
                <Button disabled={!adjustBars} className={BUTTON_CLASS} onClick={() => setAdjustBars(false)}>
                    Cables
                </Button>
                <Button disabled={adjustBars} className={BUTTON_CLASS} onClick={() => setAdjustBars(true)}>
                    Bars
                </Button>
            </ButtonGroup>
        )
    }

    const IntervalSelectButtons = () => {
        const onSelect = () => {
            const isBar = (interval: IInterval) => interval.intervalRole === IntervalRole.Bar
            const isNotBar = (interval: IInterval) => interval.intervalRole !== IntervalRole.Bar
            fabric.intervals.filter(adjustBars ? isNotBar : isBar).forEach(interval => interval.selected = false)
            fabric.intervals.filter(adjustBars ? isBar : isNotBar).forEach(interval => {
                const intervalDisplacement = fabric.instance.getIntervalDisplacement(interval.index)
                interval.selected = nuance < 0.5 ? intervalDisplacement < displacement : intervalDisplacement > displacement
            })
            switchSelection(true)
        }
        return (
            <ButtonGroup vertical={true} className={BUTTON_GROUP_CLASS}>
                <Button disabled={nuance < 0.5} className={BUTTON_CLASS} onClick={onSelect}>
                    <FaHandPointUp/> Select above
                    <br/>
                    {displacement.toFixed(4)}
                </Button>
                <Button disabled={nuance > 0.5} className={BUTTON_CLASS} onClick={onSelect}>
                    <FaHandPointDown/> Select below
                    <br/>
                    {displacement.toFixed(4)}
                </Button>
            </ButtonGroup>
        )
    }

    const LengthAdjustmentButtons = () => {
        const adjustValue = (up: boolean) => () => fabric.intervals.filter(interval => interval.selected).forEach(interval => {
            fabric.instance.multiplyRestLength(interval.index, adjustment(up))
            switchSelection(false)
        })
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
            fabric.intervals.forEach(interval => fabric.instance.setElasticFactor(interval.index, elasticFactor))
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

    const sliderStyle: CSSProperties = {
        position: "relative",
        height: "90%",
        marginTop: "30%",
        marginBottom: "30%",
        borderRadius: 12,
    }
    return (
        <Container className="adjust-panel">
            <Row className="h-100">
                <Col xs={{size: 5}}>
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
                </Col>
                <Col xs={{size: 7}} className="my-auto">
                    <IntervalGroupToggle/>
                    <IntervalSelectButtons/>
                    <LengthAdjustmentButtons/>
                    <ElasticFactorButtons/>
                </Col>
            </Row>
        </Container>
    )
}

function SliderRail({getRailProps}: { getRailProps: GetRailProps }): JSX.Element {
    const railOuterStyle: CSSProperties = {
        position: "absolute",
        height: "100%",
        width: "3em",
        transform: "translate(1.2em, 0%)",
        borderRadius: 7,
        cursor: "pointer",
        // border: "1px solid white",
    }

    const railInnerStyle: CSSProperties = {
        position: "absolute",
        height: "100%",
        width: "1em",
        transform: "translate(1.2em, 0%)",
        borderRadius: 7,
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
