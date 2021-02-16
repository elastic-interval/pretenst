/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { floatString } from "../fabric/eig-util"
import { IWorldFeatureValue, worldFeaturesAtom } from "../storage/recoil"

export function FeaturePanel({feature, disabled}: {
    feature: WorldFeature,
    disabled?: boolean,
}): JSX.Element {
    const [worldFeatures, setWorldFeatures] = useRecoilState(worldFeaturesAtom)

    function getFeature(): IWorldFeatureValue {
        return worldFeatures[feature]
    }

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
                {floatString(getFeature().numeric)}
            </div>
            <div>
                {getFeature().config.name}
            </div>
            <ButtonGroup className="w-100">
                {getFeature().config.percents.map(percent => {
                    const backgroundColor = getFeature().percent === percent ? "#000000" : "#919191"
                    return (
                        <Button
                            disabled={disabled}
                            size="sm"
                            style={{
                                color: "white",
                                backgroundColor,
                            }}
                            key={`${getFeature().config.name}:${percent}`}
                            onClick={() => {
                                const f = {...worldFeatures}
                                f[feature].percent = percent
                                // todo: also adjust the value
                                setWorldFeatures(f)
                                getFeature().percent = percent
                            }}
                        >{percentLabel(percent)}</Button>
                    )
                })}
            </ButtonGroup>
        </div>
    )
}
