/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { GetHandleProps, GetTrackProps, Handles, Rail, Slider, SliderItem, Tracks } from "react-compound-slider"
import { FaDownload, FaEye, FaFile, FaFileCsv, FaRunning } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { ADJUSTABLE_INTERVAL_ROLES, floatString, intervalRoleName } from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { saveCSVZip, saveJSONZip } from "../storage/download"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { roleColorString } from "./materials"

const MAX_SLIDER = 10000

export function FrozenTab({tensegrity, worldFeatures, storedState$}: {
    tensegrity?: Tensegrity,
    worldFeatures: Record<WorldFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {
    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    const [visibleRoles, updateVisibleRoles] = useState(storedState$.getValue().visibleRoles)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
            updatePolygons(newState.polygons)
            updateVisibleRoles(newState.visibleRoles)
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <>
            {/*<Grouping>*/}
            {/*    <FeaturePanel feature={worldFeatures[WorldFeature.PushRadius]} disabled={!polygons}/>*/}
            {/*    <FeaturePanel feature={worldFeatures[WorldFeature.PullRadius]} disabled={!polygons}/>*/}
            {/*    <FeaturePanel feature={worldFeatures[WorldFeature.JointRadiusFactor]} disabled={!polygons}/>*/}
            {/*</Grouping>*/}
            {!tensegrity ? undefined : (
                <Grouping>
                    <h6 className="w-100 text-center"><FaRunning/> Take</h6>
                    <ButtonGroup vertical={false} className="w-100 my-2">
                        <Button onClick={() => saveCSVZip(tensegrity.fabricOutput)} disabled={!polygons}>
                            <FaDownload/> Download CSV <FaFileCsv/>
                        </Button>
                        <Button onClick={() => saveJSONZip(tensegrity.fabricOutput)} disabled={!polygons}>
                            <FaDownload/> Download JSON <FaFile/>
                        </Button>
                    </ButtonGroup>
                </Grouping>
            )}
            <Grouping>
                <h6 className="w-100 text-center"><FaEye/> Show/Hide</h6>
                <div>Roles</div>
                <ButtonGroup size="sm" className="w-100 my-2">
                    {ADJUSTABLE_INTERVAL_ROLES.map(intervalRole => (
                        <Button
                            key={`viz${intervalRole}`}
                            style={{backgroundColor: visibleRoles.indexOf(intervalRole) >= 0 ? roleColorString(intervalRole) : "#747474"}}
                            disabled={!polygons}
                            onClick={() => {
                                if (visibleRoles.indexOf(intervalRole) < 0) {
                                    storedState$.next(transition(storedState$.getValue(), {visibleRoles: [...visibleRoles, intervalRole]}))
                                } else {
                                    storedState$.next(transition(storedState$.getValue(), {visibleRoles: visibleRoles.filter(role => role !== intervalRole)}))
                                }
                            }}
                        >
                            {intervalRoleName(intervalRole)}
                        </Button>
                    ))}
                </ButtonGroup>
                {!tensegrity ? undefined : (
                    <>
                        <StrainSlider push={true} disabled={!polygons} storedState$={storedState$}
                                      strainLimits={tensegrity.instance.floatView.strainLimits}/>
                        <StrainSlider push={false} disabled={!polygons} storedState$={storedState$}
                                      strainLimits={tensegrity.instance.floatView.strainLimits}/>
                    </>
                )}
            </Grouping>
        </>
    )
}

function StrainSlider({push, disabled, strainLimits, storedState$}: {
    push: boolean,
    disabled: boolean,
    strainLimits: Float32Array,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {
    const domain = [0, MAX_SLIDER]
    const [values, setValues] = useState([
        MAX_SLIDER * (push ? storedState$.getValue().pushBottom : storedState$.getValue().pullBottom),
        MAX_SLIDER * (push ? storedState$.getValue().pushTop : storedState$.getValue().pullTop),
    ])
    const [bottom, setBottom] = useState(0)
    const [top, setTop] = useState(0)
    useEffect(() => {
        function nuanceToStrain(nuance: number): number {
            const min = push ? strainLimits[1] : strainLimits[2]
            const max = push ? strainLimits[0] : strainLimits[3]
            return min + nuance * (max - min)
        }

        if (push) {
            const pushBottom = values[0] / MAX_SLIDER
            setBottom(nuanceToStrain(pushBottom))
            const pushTop = values[1] / MAX_SLIDER
            setTop(nuanceToStrain(pushTop))
            storedState$.next({...storedState$.getValue(), pushBottom, pushTop})
        } else {
            const pullBottom = values[0] / MAX_SLIDER
            setBottom(nuanceToStrain(pullBottom))
            const pullTop = values[1] / MAX_SLIDER
            setTop(nuanceToStrain(pullTop))
            storedState$.next({...storedState$.getValue(), pullBottom, pullTop})
        }
    }, [values])

    return (
        <div style={{height: "4em", width: "100%"}} className="my-2">
            <div className="float-right" style={{color: disabled ? "gray" : "white"}}>
                {`${floatString(bottom)} ${floatString(top)}`}
            </div>
            <div>
                {push ? "Push" : "Pull"} Strain
            </div>
            <Slider
                disabled={disabled}
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
const railDisabledBackground = "#767676"

function handleColor(top: boolean): string {
    return top ? "#c6161690" : "#597fe790"
}

function trackColor(index: number, disabled: boolean): string {
    return disabled ? railDisabledBackground : index === 0 ? railBackground : "white"
}

const sliderStyle: React.CSSProperties = {
    margin: "4%",
    position: "relative",
    width: "92%",
}
