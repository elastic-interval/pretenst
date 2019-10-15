/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaYinYang } from "react-icons/all"

import { Limit } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ATTENUATED_COLOR, COLD_COLOR, HOT_COLOR, SLACK_COLOR } from "./materials"

const DIGITS_VISIBLE = 3
const VISIBLE_LIMIT = 0.001

export function StrainPanel({fabric, bars, colorBars, colorCables}: {
    fabric: TensegrityFabric,
    bars: boolean,
    colorBars: boolean,
    colorCables: boolean,
}): JSX.Element {

    const engine = fabric.instance.engine
    const getMinLimit = () => engine.getLimit(bars ? Limit.MinBarStrain : Limit.MinCableStrain)
    const getMaxLimit = () => engine.getLimit(bars ? Limit.MaxBarStrain : Limit.MaxCableStrain)

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

    const zen = Math.abs(minStrain) < VISIBLE_LIMIT && Math.abs(maxStrain) < VISIBLE_LIMIT
    const both = colorBars && colorCables
    const nativeColor = bars ? HOT_COLOR : COLD_COLOR
    const attenuated = bars !== colorBars
    const topColor = both ? nativeColor : attenuated ? ATTENUATED_COLOR : HOT_COLOR
    const bottomColor = both ? nativeColor : attenuated ? ATTENUATED_COLOR : COLD_COLOR
    return (
        <div style={{
            textAlign: "center",
            width: "5em",
            backgroundColor: "#cccccc",
            marginTop: "1px",
            marginBottom: "1px",
            borderRadius: "0.2em",
            borderColor: "#575757",
        }}>
            {zen ? (
                <div style={{
                    fontSize: "x-large",
                    color: SLACK_COLOR,
                    margin: 0,
                    height: "100%",
                }}><FaYinYang/></div>
            ) : (
                <div style={{
                    display: "block",
                    textAlign: "right",
                    fontWeight: "bold",
                    marginRight: "1em",
                }}>
                    <div style={{color: topColor}}>{maxStrain.toFixed(DIGITS_VISIBLE)}</div>
                    <div style={{color: bottomColor}}>{minStrain.toFixed(DIGITS_VISIBLE)}</div>
                </div>
            )}
        </div>
    )
}
