/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { GetHandleProps, GetRailProps, Handles, Rail, Slider } from "react-compound-slider"

const DOMAIN = [0, 100]
const VALUES = [0]

export function DisplacementSlider({adjustBars, displacementFromNuance, setFabricSlackLimits, nuance, setNuance}: {
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
        <Slider rootStyle={sliderStyle} reversed={true} vertical={false}
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
