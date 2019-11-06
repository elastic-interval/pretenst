/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { FaSortAmountUp, FaYinYang } from "react-icons/all"

import { Limit } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ATTENUATED_COLOR, COLD_COLOR, HOT_COLOR, SLACK_COLOR } from "./materials"

const STRAIN_MULTIPLY = 10000
const VISIBLE_LIMIT = 0.0002

export function StrainPanel({fabric, pushes, showPushes, showPulls}: {
    fabric: TensegrityFabric,
    pushes: boolean,
    showPushes: boolean,
    showPulls: boolean,
}): JSX.Element {

    const engine = fabric.instance.engine
    const getMinLimit = () => engine.getLimit(pushes ? Limit.MinPushStrain : Limit.MinPullStrain)
    const getMaxLimit = () => engine.getLimit(pushes ? Limit.MaxPushStrain : Limit.MaxPullStrain)

    const [minStrain, setMinStrain] = useState(getMinLimit)
    const [maxStrain, setMaxStrain] = useState(getMaxLimit)

    function refresh(): void {
        setMinStrain(getMinLimit)
        setMaxStrain(getMaxLimit)
    }

    useEffect(() => {
        const timer = setInterval(refresh, 1000)
        return () => clearTimeout(timer)
    }, [])

    const min = Math.floor(minStrain * STRAIN_MULTIPLY)
    const max = Math.floor(maxStrain * STRAIN_MULTIPLY)
    const zen = Math.abs(minStrain) < VISIBLE_LIMIT && Math.abs(maxStrain) < VISIBLE_LIMIT
    const both = showPushes && showPulls
    const nativeColor = pushes ? HOT_COLOR : COLD_COLOR
    const attenuated = pushes !== showPushes
    const maxColor = both ? nativeColor : attenuated ? ATTENUATED_COLOR : HOT_COLOR
    const minColor = both ? nativeColor : attenuated ? ATTENUATED_COLOR : COLD_COLOR
    const minString = min.toFixed()
    const maxString = max.toFixed()
    const style: CSSProperties = {
        textAlign: "center",
        width: "12em",
        backgroundColor: "#cccccc",
        borderColor: "#575757",
        borderTopRightRadius: "1em",
        borderBottomRightRadius: "1em",
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
    }
    return (
        <div style={style}>
            {zen ? (
                <div style={{
                    fontSize: "large",
                    color: SLACK_COLOR,
                    margin: 0,
                    paddingTop: "0.2em",
                    height: "100%",
                }}><FaYinYang/></div>
            ) : (
                <div style={{
                    display: "block",
                    textAlign: "center",
                    paddingTop: "0.6em",
                    marginRight: "1em",
                    marginLeft: "1em",
                }}>
                    <span style={{color: minColor}}>{minString}</span>
                    &nbsp;<FaSortAmountUp/>&nbsp;
                    <span style={{color: maxColor}}>{maxString}</span>
                </div>
            )}
        </div>
    )
}
