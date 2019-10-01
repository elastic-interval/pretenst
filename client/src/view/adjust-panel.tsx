/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useState } from "react"
import { GetHandleProps, GetRailProps, Handles, Rail, Slider } from "react-compound-slider"
import { Button, ButtonGroup, Col, Container, Row } from "reactstrap"

import { Limit } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

const BUTTON_CLASS = "text-left my-3 btn-info"
const DOMAIN = [0, 100]
const VALUES = [0]

export function AdjustPanel({fabric}: {
    fabric?: TensegrityFabric,
}): JSX.Element {

    if (!fabric) {
        return <div/>
    }

    const [cableSlack, setCableSlack] = useState(0)

    const onChange = (changedValues: number[]) => {
        const percent = changedValues[0]
        const proportion = percent / 100
        const minCable = fabric.instance.getLimit(Limit.MinCable)
        const maxCable = fabric.instance.getLimit(Limit.MaxCable)
        const newSlack = (1 - proportion) * minCable + proportion * maxCable
        setCableSlack(newSlack)
        fabric.instance.setSlackLimits(0, proportion)
    }
    return (
        <Container className="adjust-panel">
            <Row className="h-100">
                <Col xs={{size: 6}}>
                    <Slider
                        reversed={true}
                        vertical={true}
                        step={-0.01}
                        rootStyle={{
                            position: "relative",
                            height: "90%",
                            marginTop: "30%",
                            marginBottom: "30%",
                            borderRadius: 12,
                            border: "2px solid steelblue",
                        }}
                        domain={DOMAIN}
                        values={VALUES}
                        onChange={onChange}
                    >
                        <Rail>{({getRailProps}) => <SliderRail getRailProps={getRailProps}/>}</Rail>
                        <Handles>
                            {({handles, getHandleProps}) => (
                                <>
                                    {handles.map(handle => (
                                        <Handle key={handle.id} handle={handle} getHandleProps={getHandleProps}/>
                                    ))}
                                </>
                            )}
                        </Handles>
                    </Slider>
                </Col>
                <Col xs={{size: 6}} className="my-auto">
                    <ButtonGroup vertical={true} className="w-100">
                        <Button className={BUTTON_CLASS}>Lengthen {cableSlack.toFixed(5)}</Button>
                        <Button className={BUTTON_CLASS}>And..</Button>
                    </ButtonGroup>
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
        // transform: "translate(-20%, 0%)",
        borderRadius: 7,
        cursor: "pointer",
        // border: "1px solid white",
    }

    const railInnerStyle: CSSProperties = {
        position: "absolute",
        height: "100%",
        width: "1em",
        // transform: "translate(-20%, 0%)",
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

export function Handle({handle, getHandleProps}: {
    handle: { id: string, value: number, percent: number },
    getHandleProps: GetHandleProps,
}): JSX.Element {
    return (
        <>
            <div
                style={{
                    top: `${handle.percent}%`,
                    position: "absolute",
                    transform: "translate(-20%, -50%)",
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
                    transform: "translate(-20%, -50%)",
                    zIndex: 2,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    boxShadow: "1px 1px 1px 1px rgba(0, 0, 0, 0.3)",
                    backgroundColor: "#ffc400",
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
                    transform: "translate(2em, -50%)",
                    zIndex: 2,
                }}
            >{handle.value.toFixed(2)}%
            </div>
        </>
    )
}
