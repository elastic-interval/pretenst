/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowsAltH } from "react-icons/all"

import { Limit } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function StrainPanel({fabric, pushes}: {
    fabric: TensegrityFabric,
    pushes: boolean,
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

    return (
        <div style={{
            textAlign: "center",
            backgroundColor: "#919191",
            borderColor: "#bdbdbd",
            borderWidth: "2px",
            borderStyle: "solid",
            color: "#ffffff",
            borderRadius: "1em",
            width: "100%",
        }}>
            <div style={{
                display: "block",
                textAlign: "center",
                paddingTop: "0.3em",
                marginRight: "1em",
                marginLeft: "1em",
                height: "2em",
                width: "100%",
            }}>
                <span>{minStrain.toFixed(6)}</span>
                &nbsp;<FaArrowsAltH/>&nbsp;
                <span>{maxStrain.toFixed(6)}</span>
            </div>
        </div>
    )
}
