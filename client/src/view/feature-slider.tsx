/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { GetHandleProps, GetTrackProps, Handles, Rail, Slider, SliderItem, Tracks } from "react-compound-slider"
import { useRecoilState } from "recoil"

import { percentString } from "../fabric/eig-util"
import { IWorldFeatureValue } from "../storage/recoil"

const MAX_SLIDER = 100000
const domain = [0, MAX_SLIDER]

export function FeatureSlider({featureValue, apply}: {
    featureValue: IWorldFeatureValue,
    apply: (wf: WorldFeature, percent: number, value: number) => void,
}): JSX.Element {
    const {mapping, percentAtom} = featureValue
    const {name, nuanceToPercent, percentToNuance, percentToValue} = mapping

    const [percent, setPercent] = useRecoilState(percentAtom)
    const [values, setValues] = useState([Math.floor(percentToNuance(percent) * MAX_SLIDER)])

    useEffect(() => {
        const newPercent = Math.round(nuanceToPercent(values[0] / MAX_SLIDER))
        if (newPercent - percent !== 0) {
            setPercent(newPercent)
        }
    }, [values])
    useEffect(() => apply(mapping.feature, percent, percentToValue(percent)), [percent])

    return (
        <div style={{
            height: "3em",
            width: "100%",
            paddingLeft: "1em",
            paddingRight: "1em",
        }} className="my-2">
            <div className="float-right">
                {percentString(percent)}
            </div>
            <strong>{name}</strong>
            <Slider
                mode={1}
                step={1}
                domain={domain}
                rootStyle={sliderStyle}
                onChange={(newValues: number[]) => setValues(newValues)}
                values={values}
            >
                <Rail>
                    {({getRailProps}) => <div style={{
                        position: "absolute",
                        width: "100%",
                        height: 14,
                        borderRadius: 7,
                        cursor: "pointer",
                        backgroundColor: railBackground,
                    }} {...getRailProps()}/>}
                </Rail>
                <Handles>
                    {({handles, getHandleProps}) => (
                        <div className="slider-handles">
                            {handles.map((handle, index) => (
                                <Handle
                                    key={handle.id}
                                    handle={handle}
                                    getHandleProps={getHandleProps}
                                    top={index === 1}
                                />
                            ))}
                        </div>
                    )}
                </Handles>
                <Tracks right={false}>
                    {({tracks, getTrackProps}) => (
                        <div className="slider-tracks">
                            {tracks.map(({id, source, target}, index) => (
                                <Track
                                    key={id}
                                    source={source}
                                    target={target}
                                    getTrackProps={getTrackProps}
                                    color={trackColor(index)}
                                />
                            ))}
                        </div>
                    )}
                </Tracks>
            </Slider>
        </div>
    )
}

function Handle({handle, getHandleProps, top}: {
    handle: SliderItem,
    getHandleProps: GetHandleProps,
    top: boolean,
}): JSX.Element {
    const min = domain[0]
    const max = domain[1]
    const {id, value, percent} = handle
    return (
        <div
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            style={{
                left: `${percent}%`,
                position: "absolute",
                marginLeft: "-11px",
                marginTop: "-6px",
                zIndex: 2,
                width: 24,
                height: 24,
                cursor: "pointer",
                borderRadius: 2,
                boxShadow: "1px 1px 1px 1px rgba(0, 0, 0, 0.2)",
                backgroundColor: handleColor(top),
            }}
            {...getHandleProps(id)}
        />
    )
}

function Track({source, target, getTrackProps, color}: {
    source: SliderItem,
    target: SliderItem,
    getTrackProps: GetTrackProps,
    color: string,
}): JSX.Element {
    return (
        <div
            style={{
                position: "absolute",
                height: 14,
                zIndex: 1,
                backgroundColor: color,
                borderRadius: 2,
                cursor: "pointer",
                left: `${source.percent}%`,
                width: `${target.percent - source.percent}%`,
            }}
            {...getTrackProps()}
        />
    )
}

const railBackground = "#9B9B9B"

function handleColor(top: boolean): string {
    return top ? "#c6161690" : "#597fe790"
}

function trackColor(index: number): string {
    return index === 0 ? railBackground : "white"
}

const sliderStyle: React.CSSProperties = {
    margin: "1%",
    position: "relative",
    width: "92%",
}
