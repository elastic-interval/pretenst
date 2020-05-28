/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { GetHandleProps, GetTrackProps, Handles, Rail, Slider, SliderItem, Tracks } from "react-compound-slider"
import {
    FaCamera,
    FaCircle,
    FaDownload,
    FaExpandArrowsAlt,
    FaEye,
    FaFile,
    FaFileCsv,
    FaFutbol,
    FaRunning,
    FaVolleyballBall,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { ADJUSTABLE_INTERVAL_ROLES, intervalRoleName } from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { IIntervalFilter } from "../fabric/tensegrity-types"
import { saveCSVZip, saveJSONZip } from "../storage/download"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function FrozenTab({tensegrity, floatFeatures, intervalFilter, setIntervalFilter, storedState$}: {
    tensegrity?: Tensegrity,
    floatFeatures: Record<WorldFeature, FloatFeature>,
    intervalFilter: IIntervalFilter,
    setIntervalFilter: (filter: IIntervalFilter) => void,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    const [showPushes, updateShowPushes] = useState(storedState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(storedState$.getValue().showPulls)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
            updatePolygons(newState.polygons)
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
        })
        return () => subscription.unsubscribe()
    }, [])

    function ViewButton({pushes, pulls, children}: { pushes: boolean, pulls: boolean, children: JSX.Element }): JSX.Element {
        return (
            <Button
                style={{color: "white"}}
                color={pushes === showPushes && pulls === showPulls ? "success" : "secondary"}
                disabled={!polygons}
                onClick={() => {
                    storedState$.next(transition(storedState$.getValue(), {showPulls: pulls, showPushes: pushes}))
                }}
            >
                {children}
            </Button>
        )
    }

    return (
        <>
            <Grouping>
                <h6 className="w-100 text-center"><FaEye/> Show</h6>
                <ButtonGroup className="w-100 my-2">
                    <ViewButton pushes={true} pulls={true}>
                        <span><FaFutbol/> All</span>
                    </ViewButton>
                    <ViewButton pushes={false} pulls={true}>
                        <span><FaVolleyballBall/> Pulls</span>
                    </ViewButton>
                    <ViewButton pushes={true} pulls={false}>
                        <span><FaExpandArrowsAlt/> Pushes</span>
                    </ViewButton>
                    <ViewButton pushes={false} pulls={false}>
                        <span><FaCircle/> Roles</span>
                    </ViewButton>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaCamera/> Snapshot</h6>
                <ButtonGroup size="sm" className="w-100">
                    {ADJUSTABLE_INTERVAL_ROLES.map(intervalRole => (
                        <Button
                            color={intervalFilter.visibleRoles.indexOf(intervalRole) < 0 ? "secondary" : "success"}
                            key={`viz${intervalRole}`}
                            disabled={!polygons}
                            onClick={() => {
                                if (intervalFilter.visibleRoles.indexOf(intervalRole) < 0) {
                                    const visibleRoles = [...intervalFilter.visibleRoles, intervalRole]
                                    setIntervalFilter({...intervalFilter, visibleRoles})
                                } else {
                                    const visibleRoles = intervalFilter.visibleRoles.filter(role => role !== intervalRole)
                                    setIntervalFilter({...intervalFilter, visibleRoles})
                                }
                            }}
                        >
                            {intervalRoleName(intervalRole)}
                        </Button>
                    ))}
                </ButtonGroup>
                <FeaturePanel feature={floatFeatures[WorldFeature.PushRadius]}
                              disabled={!polygons}
                />
                <FeaturePanel feature={floatFeatures[WorldFeature.PullRadius]}
                              disabled={!polygons}
                />
                <FeaturePanel feature={floatFeatures[WorldFeature.JointRadiusFactor]}
                              disabled={!polygons}
                />
            </Grouping>
            {!tensegrity ? undefined : (
                <Grouping>
                    <h6 className="w-100 text-center"><FaRunning/> Take</h6>
                    <ButtonGroup vertical={false} className="w-100">
                        <Button onClick={() => saveCSVZip(tensegrity.fabricOutput)}
                                disabled={!polygons}
                        >
                            <FaDownload/> Download CSV <FaFileCsv/>
                        </Button>
                        <Button onClick={() => saveJSONZip(tensegrity.fabricOutput)}
                                disabled={!polygons}
                        >
                            <FaDownload/> Download JSON <FaFile/>
                        </Button>
                    </ButtonGroup>
                </Grouping>
            )}
            <Grouping>
                <StrainSlider domain={[0, 1000]} disabled={!polygons}
                              setRange={((bottom, top) => {

                              })}
                />
            </Grouping>
        </>
    )
}

function StrainSlider({domain, disabled, setRange}: {
    domain: number[],
    disabled: boolean,
    setRange: (bottom: number, top: number) => void,
}): JSX.Element {

    const [values, setValues] = useState([0, 1000])

    function onChange(newValues: number[]): void {
        console.log("slider", newValues)
        setRange(newValues[0] / 1000, newValues[1] / 1000)
        setValues(newValues)
    }

    return (
        <div style={{height: "2em", width: "100%"}}>
            <Slider
                disabled={disabled}
                mode={1}
                step={1}
                domain={domain}
                rootStyle={sliderStyle}
                onChange={onChange}
                values={values}
            >
                <Rail>
                    {({getRailProps}) => <div style={{
                        position: "absolute",
                        width: "100%",
                        height: 14,
                        borderRadius: 7,
                        cursor: "pointer",
                        backgroundColor: disabled ? railDisabledBackground : railBackground,
                    }} {...getRailProps()}/>}
                </Rail>
                <Handles>
                    {({handles, getHandleProps}) => (
                        <div className="slider-handles">
                            {handles.map((handle, index) => (
                                <Handle
                                    key={handle.id}
                                    handle={handle}
                                    domain={domain}
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
                                    color={trackColor(index, disabled)}
                                />
                            ))}
                        </div>
                    )}
                </Tracks>
            </Slider>
        </div>
    )
}

function Handle({domain, handle, getHandleProps, top}: {
    domain: number[],
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
                borderRadius: "50%",
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
                borderRadius: 7,
                cursor: "pointer",
                left: `${source.percent}%`,
                width: `${target.percent - source.percent}%`,
            }}
            {...getTrackProps()}
        />
    )
}

const railBackground = "#9B9B9B"
const railDisabledBackground = "#767676"

function handleColor(top: boolean): string {
    return top ? "#c61616" : "#597fe7"
}

function trackColor(index: number, disabled: boolean): string {
    return disabled ? railDisabledBackground : index === 0 ? railBackground : "white"
}

const sliderStyle: React.CSSProperties = {
    margin: "5%",
    position: "relative",
    width: "90%",
}
