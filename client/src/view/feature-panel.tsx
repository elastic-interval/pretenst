/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button, ButtonGroup } from "reactstrap"

import { fabricFeatureIntervalRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"

import { roleColorString } from "./materials"

export function FeaturePanel({feature, disabled}: { feature: FloatFeature, disabled: boolean }): JSX.Element {
    const [featurePercent, setFeaturePercent] = useState(() => feature.percent)
    useEffect(() => {
        const subscription = feature.observable.subscribe(({percent}) => setFeaturePercent(percent))
        return () => subscription.unsubscribe()
    }, [])
    const roleColor = roleColorString(fabricFeatureIntervalRole(feature.fabricFeature))
    const color = roleColor ? roleColor : "#919191"
    return (
        <div className="my-2">
            <div className="float-right text-white">
                {feature.formatted}
            </div>
            <div>
                {feature.config.name}
            </div>
            <ButtonGroup className="w-100">
                {feature.percentChoices.map(percent => {
                    const backgroundColor = featurePercent === percent ? "#000000" : color
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

