/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button, ButtonGroup } from "reactstrap"

import { FloatFeature } from "../fabric/float-feature"

export function FeaturePanel({feature, disabled}: {
    feature: FloatFeature,
    disabled?: boolean,
}): JSX.Element {

    const [featurePercent, setFeaturePercent] = useState(() => feature.percent)
    useEffect(() => {
        const subscription = feature.observable.subscribe(({percent}) => setFeaturePercent(percent))
        return () => subscription.unsubscribe()
    }, [])

    function percentLabel(percent: number): string {
        if (percent <= 100) {
            return `${percent}%`
        } else {
            return `${percent / 100}x`
        }
    }

    return (
        <div className="my-2">
            <div className="float-right" style={{color: disabled ? "gray" : "white"}}>
                {feature.formatted}
            </div>
            <div>
                {feature.config.name}
            </div>
            <ButtonGroup className="w-100">
                {feature.percentChoices.map(percent => {
                    const backgroundColor = featurePercent === percent ? "#000000" : "#919191"
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
                        >{percentLabel(percent)}</Button>
                    )
                })}
            </ButtonGroup>
        </div>
    )
}
