/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties } from "react"
import { GetHandleProps, GetRailProps, Handles, Rail, Slider } from "react-compound-slider"
import { Button, ButtonGroup, Col, Container, Row } from "reactstrap"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"

const buttonClass = "text-left my-3 btn-info"

export function AdjustPanel({fabric, domain, values}: {
    fabric?: TensegrityFabric,
    domain: number[],
    values: number[],
}): JSX.Element {

    if (!fabric) {
        return <div/>
    }
    const sliderStyle: CSSProperties = {  // Give the slider some width
        position: "relative",
        height: "90%",
        marginTop: "30%",
        marginBottom: "30%",
        borderRadius: 12,
        border: "2px solid steelblue",
    }
    const onChange = (changedValues: number[]) => {
        console.log(changedValues)
    }
    return (
        <Container className="adjust-panel">
            <Row className="h-100">
                <Col xs={{size: 6}}>
                    <Slider
                        vertical={true}
                        step={0.01}
                        rootStyle={sliderStyle}
                        domain={domain}
                        values={values}
                        onChange={onChange}
                    >
                        <Rail>
                            {({getRailProps}) => (
                                <SliderRail getRailProps={getRailProps}/>
                            )}
                        </Rail>
                        <Handles>
                            {({handles, getHandleProps}) => (
                                <>
                                    {handles.map(handle => (
                                        <Handle key={handle.id} domain={domain}
                                                handle={handle} getHandleProps={getHandleProps}/>
                                    ))}
                                </>
                            )}
                        </Handles>
                    </Slider>
                </Col>
                <Col xs={{size: 6}} className="my-auto">
                    <ButtonGroup vertical={true} className="w-100">
                        <Button className={buttonClass}>And..</Button>
                        <Button className={buttonClass}>then</Button>
                        <Button className={buttonClass}>And..</Button>
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

export function Handle({domain, handle, getHandleProps}: {
    domain: number[],
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
                aria-valuemin={domain[0]}
                aria-valuemax={domain[1]}
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
                aria-valuemin={domain[0]}
                aria-valuemax={domain[1]}
                aria-valuenow={handle.value}
                style={{
                    top: `${handle.percent}%`,
                    position: "absolute",
                    transform: "translate(2em, -50%)",
                    zIndex: 2,
                }}
            >{handle.value.toFixed(2)}</div>
        </>
    )
}
