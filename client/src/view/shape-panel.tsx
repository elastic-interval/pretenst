/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaCompressArrowsAlt,
    FaExpandArrowsAlt,
    FaHandPointUp,
    FaLink,
    FaMicroscope,
    FaSlidersH,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { lengthFeatureToRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { IFabricState } from "../fabric/fabric-state"
import { IFace, IFacePair } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { roleColorString } from "./materials"

export function ShapePanel({
                               fabric, features, selectedFaces, facePairs, addFacePair, tightenFacePairs,
                               clearSelectedFaces, app$,
                           }: {
    fabric: TensegrityFabric,
    features: FloatFeature[]
    selectedFaces: IFace[],
    facePairs: IFacePair[],
    addFacePair: (faceA: IFace, faceB: IFace) => void,
    tightenFacePairs: () => void,
    clearSelectedFaces: () => void,
    app$: BehaviorSubject<IFabricState>,
}): JSX.Element {

    const [faceSelection, updateFaceSelection] = useState(app$.getValue().faceSelection)
    const [ellipsoids, updateEllipsoids] = useState(app$.getValue().ellipsoids)
    useEffect(() => {
        const subscription = app$.subscribe(newState => {
            updateFaceSelection(newState.faceSelection)
            updateEllipsoids(newState.ellipsoids)
        })
        return () => subscription.unsubscribe()
    }, [])

    const adjustValue = (up: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
            return up ? factor : (1 / factor)
        }

        fabric.forEachSelected(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment())
        })
    }

    function connect(): void {
        const fromFace = selectedFaces.shift()
        if (!fromFace || selectedFaces.length < 1) {
            throw new Error("Connect what?")
        }
        selectedFaces.forEach(face => addFacePair(fromFace, face))
        clearSelectedFaces()
    }

    function needsBricks(requiredFaceCount: number): boolean {
        return !fabric.splitIntervals || selectedFaces.length < requiredFaceCount || faceSelection || ellipsoids
    }

    return (
        <div className="w-100">
            <div className="m-4">
                <div className="text-center">
                    <h2><FaHandPointUp/> Editing <FaHandPointUp/></h2>
                </div>
                <ButtonGroup className="w-100 my-2">
                    <Button disabled={needsBricks(1)} onClick={adjustValue(true)}>
                        <FaExpandArrowsAlt/><span> Grow</span>
                    </Button>
                    <Button disabled={needsBricks(1)} onClick={adjustValue(false)}>
                        <FaCompressArrowsAlt/><span> Shrink</span>
                    </Button>
                </ButtonGroup>
                <ButtonGroup className="w-100 my-2">
                    <Button disabled={needsBricks(2)} onClick={connect}>
                        <FaLink/><span> Engage</span>
                    </Button>
                    <Button disabled={facePairs.length === 0} onClick={tightenFacePairs}>
                        <FaCompressArrowsAlt/><span> Approach</span>
                    </Button>
                </ButtonGroup>
                <ButtonGroup className="w-100 my-2">
                    <Button onClick={() => fabric.builder.optimize()}>
                        <FaMicroscope/><span> Bow optimization</span>
                    </Button>
                </ButtonGroup>
            </div>
            <div className="m-4">
                <div className="text-center">
                    <h2><FaSlidersH/> Lengths <FaSlidersH/></h2>
                </div>
                <div className="my-2" style={{
                    borderStyle: "solid",
                    borderColor: faceSelection || ellipsoids ? "gray" : "white",
                    borderWidth: "0.1em",
                    borderRadius: "0.7em",
                    padding: "0.5em",
                }}>
                    {features.filter(feature => lengthFeatureToRole(feature.fabricFeature) !== undefined).map(feature => (
                        <div className="my-2 p-2" key={feature.title}>
                            <FeatureChoice feature={feature} disabled={faceSelection || ellipsoids}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function FeatureChoice({feature, disabled}: {
    feature: FloatFeature,
    disabled: boolean,
}): JSX.Element {
    const [featurePercent, setFeaturePercent] = useState(() => feature.percent)
    useEffect(() => {
        const subscription = feature.observable.subscribe(({percent}) => setFeaturePercent(percent))
        return () => subscription.unsubscribe()
    }, [])
    return (
        <div>
            <div>{feature.config.name} {feature.numeric.toFixed(6)}</div>
            <ButtonGroup className="w-100">
                {feature.percentChoices.map(percent => {
                    const roleColor = roleColorString(lengthFeatureToRole(feature.fabricFeature))
                    const backgroundColor = featurePercent === percent ? "#000000" : roleColor
                    return (
                        <Button
                            disabled={disabled}
                            size="sm"
                            style={{
                                color: "white",
                                backgroundColor,
                            }}
                            key={`${feature.config.name}:${percent}`}
                            onClick={() => feature.percent = percent}
                        >{percent}%</Button>
                    )
                })}
            </ButtonGroup>
        </div>
    )
}
