/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { GetHandleProps, GetTrackProps, Handles, Rail, Slider, SliderItem, Tracks } from "react-compound-slider"
import { FaClock, FaCompressArrowsAlt, FaFistRaised, FaHandRock, FaParachuteBox, FaSlidersH } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function LiveTab(
    {
        floatFeatures, tensegrity,
        storedState$,
    }: {
        floatFeatures: Record<WorldFeature, FloatFeature>,
        tensegrity: Tensegrity,
        storedState$: BehaviorSubject<IStoredState>,
    }): JSX.Element {


    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
            updatePolygons(newState.polygons)
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaClock/> Time</h6>
                <FeaturePanel key="it" feature={floatFeatures[WorldFeature.IterationsPerFrame]} disabled={polygons}/>
                <FeaturePanel key="ic" feature={floatFeatures[WorldFeature.IntervalCountdown]} disabled={polygons}/>
                <FeaturePanel key="pc" feature={floatFeatures[WorldFeature.PretensingCountdown]} disabled={polygons}/>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaSlidersH/> Adjustments</h6>
                {[
                    WorldFeature.MaxStrain,
                    WorldFeature.MaxStiffness,
                    WorldFeature.VisualStrain,
                    WorldFeature.SlackThreshold,
                ].map(feature => (
                    <FeaturePanel
                        key={`WorldFeature[${feature}]`}
                        feature={floatFeatures[feature]}
                        disabled={polygons}
                    />))}
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaFistRaised/> Perturb</h6>
                <ButtonGroup className="w-100">
                    <Button disabled={life.stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(1)}>
                        <FaHandRock/> Nudge
                    </Button>
                    <Button disabled={life.stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(10)}>
                        <FaParachuteBox/> Drop
                    </Button>
                    <Button disabled={polygons}
                            onClick={() => tensegrity.fabric.centralize()}>
                        <FaCompressArrowsAlt/> Centralize
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <StrainSlider domain={[100, 500]}/>
            </Grouping>
        </div>
    )
}

function StrainSlider({domain}: {
    domain: number[],
}): JSX.Element {

    const [values, setValues] = useState([150, 200])

    function onChange(newValues: number[]): void {
        console.log("slider", newValues)
        setValues(newValues)
    }

    return (
        <div style={{height: "2em", width: "100%"}}>
            <Slider
                mode={1}
                step={1}
                domain={domain}
                rootStyle={sliderStyle}
                onChange={onChange}
                values={values}
            >
                <Rail>
                    {({getRailProps}) => (
                        <div style={railStyle} {...getRailProps()} />
                    )}
                </Rail>
                <Handles>
                    {({handles, getHandleProps}) => (
                        <div className="slider-handles">
                            {handles.map(handle => (
                                <Handle
                                    key={handle.id}
                                    handle={handle}
                                    domain={domain}
                                    getHandleProps={getHandleProps}
                                />
                            ))}
                        </div>
                    )}
                </Handles>
                <Tracks right={false}>
                    {({tracks, getTrackProps}) => (
                        <div className="slider-tracks">
                            {tracks.map(({id, source, target}) => (
                                <Track
                                    key={id}
                                    source={source}
                                    target={target}
                                    getTrackProps={getTrackProps}
                                />
                            ))}
                        </div>
                    )}
                </Tracks>
            </Slider>
        </div>
    )
}

function Handle({domain, handle, getHandleProps}:{
    domain: number[],
    handle: SliderItem,
    getHandleProps: GetHandleProps,
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
                borderRadius: "50%",
                boxShadow: "1px 1px 1px 1px rgba(0, 0, 0, 0.2)",
                backgroundColor: "#34568f",
            }}
            {...getHandleProps(id)}
        />
    )
}

function Track({source, target, getTrackProps}:{
    source: SliderItem,
    target: SliderItem,
    getTrackProps: GetTrackProps,
}): JSX.Element {
    return (
        <div
            style={{
                position: "absolute",
                height: 14,
                zIndex: 1,
                backgroundColor: "#7aa0c4",
                borderRadius: 7,
                cursor: "pointer",
                left: `${source.percent}%`,
                width: `${target.percent - source.percent}%`,
            }}
            {...getTrackProps()}
        />
    )
}

const sliderStyle: React.CSSProperties = {
    margin: "5%",
    position: "relative",
    width: "90%",
}

const railStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: 14,
    borderRadius: 7,
    cursor: "pointer",
    backgroundColor: "rgb(155,155,155)",
}

