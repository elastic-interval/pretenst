/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaHammer, FaHandPointUp, FaRunning } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { lengthFeatureToRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { IFabricState, transition } from "../fabric/fabric-state"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { roleColorString } from "./materials"

export function ShapePanel({fabric, features, selectedBrick, fabricState$}: {
    fabric: TensegrityFabric,
    features: FloatFeature[]
    selectedBrick?: IBrick,
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {

    const [faceSelection, updateFaceSelection] = useState(fabricState$.getValue().faceSelection)
    const [ellipsoids, updateEllipsoids] = useState(fabricState$.getValue().ellipsoids)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
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

    function EditModeButton({mode}: { mode: boolean }): JSX.Element {
        const onClick = () => fabricState$.next(transition(fabricState$.getValue(), {faceSelection: mode}))
        return (
            <Button
                color={faceSelection === mode ? "success" : "secondary"}
                disabled={faceSelection === mode}
                onClick={onClick}
            >
                {mode ? (
                    <span><FaHandPointUp/> Selecting</span>
                ) : (
                    <span><FaRunning/> Running</span>
                )}
            </Button>
        )
    }

    return (
        <div className="w-100">
            <div className="m-4">
                <div className="text-center">
                    <h2>Editing <FaHammer/></h2>
                </div>
                <ButtonGroup className="w-100 my-2">
                    <EditModeButton mode={true}/>
                    <EditModeButton mode={false}/>
                </ButtonGroup>
                <ButtonGroup className="w-100 my-2">
                    <Button
                        disabled={!fabric.splitIntervals || !selectedBrick}
                        onClick={adjustValue(true)}
                    >
                        <FaArrowUp/><span> Bigger</span>
                    </Button>
                    <Button
                        disabled={!fabric.splitIntervals || !selectedBrick}
                        onClick={adjustValue(false)}
                    >
                        <FaArrowDown/><span> Smaller</span>
                    </Button>
                </ButtonGroup>
            </div>
            <div className="m-4">
                <div className="text-center">
                    <h2><FaHammer/> Lengths</h2>
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
            <div className="text-center">
                {feature.config.name}
            </div>
            <ButtonGroup className="w-100">
                {feature.percentChoices.map(percent => {
                    const roleColor = roleColorString(lengthFeatureToRole(feature.fabricFeature))
                    const backgroundColor = featurePercent === percent ? "#cccccc" : roleColor
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
