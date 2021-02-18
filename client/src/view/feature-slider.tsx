/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { GetHandleProps, GetTrackProps, Handles, Rail, Slider, SliderItem, Tracks } from "react-compound-slider"
import { FaBalanceScale } from "react-icons/all"
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

    useEffect(() => {setPercent(Math.round(nuanceToPercent(values[0] / MAX_SLIDER)))}, [values])
    useEffect(() => apply(mapping.feature, percent, percentToValue(percent)), [percent])

    return (
        <div style={{height: "3em"}} className="m-2 w-100">
            <div className="float-right">
                <FaBalanceScale onClick={() => setValues([Math.floor(percentToNuance(100) * MAX_SLIDER)])}/>
            </div>
            <div className="m-auto w-25">
                {name} = {percentString(percent)}
            </div>
            <Slider
                mode={1} step={1} domain={domain} rootStyle={sliderStyle}
                values={values}
                onChange={(newValues: number[]) => setValues(newValues)}
            >
                <Rail>
                    {({getRailProps}) => <div className="rail-props" {...getRailProps()}/>}
                </Rail>
                <Handles>
                    {({handles, getHandleProps}) => (
                        <div className="slider-handles">
                            {handles.map((handle, index) => (
                                <Handle key={handle.id} handle={handle} getHandleProps={getHandleProps}/>
                            ))}
                        </div>
                    )}
                </Handles>
                <Tracks right={false}>
                    {({tracks, getTrackProps}) => (
                        <div className="slider-tracks">
                            {tracks.map(({id, source, target}, index) => (
                                <Track key={id} source={source} target={target} getTrackProps={getTrackProps}/>
                            ))}
                        </div>
                    )}
                </Tracks>
            </Slider>
        </div>
    )
}

function Handle({handle, getHandleProps}: {
    handle: SliderItem,
    getHandleProps: GetHandleProps,
}): JSX.Element {
    const min = domain[0]
    const max = domain[1]
    const {id, value, percent} = handle
    return (
        <div
            role="slider"
            className="slider-handle"
            style={{left: `${percent}%`}}
            aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
            {...getHandleProps(id)}
        />
    )
}

function Track({source, target, getTrackProps}: {
    source: SliderItem,
    target: SliderItem,
    getTrackProps: GetTrackProps,
}): JSX.Element {
    return (
        <div className="slider-track"
            style={{left: `${source.percent}%`, width: `${target.percent - source.percent}%`}}
            {...getTrackProps()}
        />
    )
}

const sliderStyle: React.CSSProperties = {
    margin: "1%",
    position: "relative",
    width: "98%",
}
