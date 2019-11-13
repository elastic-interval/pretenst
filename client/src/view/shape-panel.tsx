/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaHammer, FaTimesCircle } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { lengthFeatureToRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { roleColorString } from "./materials"

export function ShapePanel({fabric, features, selectedBrick, setSelectedBrick}: {
    fabric: TensegrityFabric,
    features: FloatFeature[]
    selectedBrick?: IBrick,
    setSelectedBrick: (brick?: IBrick) => void,
}): JSX.Element {

    const adjustValue = (up: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
            return up ? factor : (1 / factor)
        }

        fabric.forEachSelected(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment())
        })
    }

    return (
        <div className="w-100">
            <div className="m-4">
                <div className="text-center">
                    <h2>Editing <FaHammer/></h2>
                </div>
                <ButtonGroup className="w-100">
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
                    <Button
                        disabled={!selectedBrick}
                        onClick={() => {
                            setSelectedBrick()
                            fabric.clearSelection()
                        }}
                    >
                        <FaTimesCircle/>
                    </Button>
                </ButtonGroup>
            </div>
            <div className="m-4">
                <div className="text-center">
                    <h2><FaHammer/> Lengths</h2>
                </div>
                <div className="my-2" style={{
                    borderStyle: "solid",
                    borderColor: "white",
                    borderWidth: "0.1em",
                    borderRadius: "0.7em",
                    padding: "0.5em",
                }}>
                    {features.filter(feature => lengthFeatureToRole(feature.fabricFeature) !== undefined).map(feature => (
                        <div className="my-2 p-2" key={feature.title}>
                            <FeatureChoice feature={feature}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function FeatureChoice({feature}: {
    feature: FloatFeature,
}): JSX.Element {
    const [featurePercent, setFeaturePercent] = useState(feature.percent)
    useEffect(() => {
        const subscription = feature.onChange(() => {
            const percent = feature.percent
            if (percent !== featurePercent) {
                setFeaturePercent(feature.percent)
            }
        })
        return () => subscription.unsubscribe()
    })
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
